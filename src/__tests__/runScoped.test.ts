import { describe, expect, it, vi } from 'vitest';
import { runScoped, type ScopedPoolLike } from '../server/rlsContext';

function makeClient() {
  const calls: Array<{ text: string; values?: any[] }> = [];
  const client = {
    calls,
    query: vi.fn(async (text: string, values?: any[]) => { calls.push({ text, values }); return { rows: [] }; }),
    release: vi.fn(),
  };
  return client;
}
const poolOf = (client: any): ScopedPoolLike => ({ connect: async () => client });

const sessionId = { role: 'HospitalOperator', orgId: 'HOSP-A', source: 'session' as const };

describe('runScoped (AUTH-03 RLS-scoped query path)', () => {
  it('returns null when no scoped pool is configured', async () => {
    const r = await runScoped(sessionId, async () => 'x', { pool: null });
    expect(r).toBeNull();
  });

  it('returns null (fail-closed) for a non-session identity', async () => {
    const client = makeClient();
    const r = await runScoped({ ...sessionId, source: 'header' }, async () => 'x', { pool: poolOf(client) });
    expect(r).toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('sets facility GUCs then runs the callback inside a committed transaction', async () => {
    const client = makeClient();
    const result = await runScoped(sessionId, async (c) => {
      await c.query('SELECT 1');
      return 42;
    }, { pool: poolOf(client) });

    expect(result).toBe(42);
    const texts = client.calls.map(c => c.text);
    expect(texts[0]).toBe('BEGIN');
    expect(texts).toContain("SELECT set_config('app.facility_id', $1, true)");
    expect(texts).toContain("SELECT set_config('app.role', $1, true)");
    expect(texts[texts.length - 1]).toBe('COMMIT');
    // facility value threaded through
    const facilityCall = client.calls.find(c => c.text.includes('app.facility_id'));
    expect(facilityCall?.values).toEqual(['HOSP-A']);
  });

  it('rolls back and rethrows if the callback throws', async () => {
    const client = makeClient();
    await expect(
      runScoped(sessionId, async () => { throw new Error('boom'); }, { pool: poolOf(client) }),
    ).rejects.toThrow('boom');
    expect(client.calls.map(c => c.text)).toContain('ROLLBACK');
  });
});
