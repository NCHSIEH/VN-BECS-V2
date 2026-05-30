import { describe, expect, it, vi } from 'vitest';
import { tryTransactionalTransition, type TxClient, type TxPool } from '../server/services/transactionalTransition';

/** A fake pg client that records SQL and answers SELECTs from a script. */
function makeClient(answers: { version?: number; rowCount?: number } = {}) {
  const calls: string[] = [];
  const client: TxClient & { calls: string[] } = {
    calls,
    async query(text: string) {
      calls.push(text.trim().split('\n')[0].trim());
      if (/FROM inventory WHERE "unitId"/.test(text)) {
        const rc = answers.rowCount ?? 1;
        return { rows: rc ? [{ version: answers.version ?? 1, status: 'AVAILABLE' }] : [], rowCount: rc };
      }
      if (/FROM audit_events/.test(text)) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    release: vi.fn(),
  };
  return client;
}

function poolOf(client: TxClient): TxPool {
  return { connect: async () => client };
}

const baseInput = {
  unitId: 'CMP-1',
  fromStatus: 'AVAILABLE' as const,
  targetStatus: 'RESERVED' as const,
  actorId: 'U-1',
  actorRole: 'Dispatcher',
  deviceId: 'SERVER',
  reasonCode: 'SOP_TRANSITION',
  requestId: 'REQ-1',
  multiAxis: { quality_status: 'RELEASED', inventory_status: 'ORDER_RESERVED', assignment_status: 'ORDER_ALLOCATED' },
};

describe('tryTransactionalTransition (STATE-03 atomic path)', () => {
  it('returns null when no pool is configured (caller falls back)', async () => {
    const res = await tryTransactionalTransition(baseInput, { pool: null });
    expect(res).toBeNull();
  });

  it('returns null when extra inventory fields are present', async () => {
    const res = await tryTransactionalTransition(
      { ...baseInput, hasExtraInventoryFields: true },
      { pool: poolOf(makeClient()) },
    );
    expect(res).toBeNull();
  });

  it('commits component + inventory + audit in one transaction on success', async () => {
    const client = makeClient({ version: 3 });
    const res = await tryTransactionalTransition(
      { ...baseInput, clientVersion: 3 },
      { pool: poolOf(client) },
    );
    expect(res?.success).toBe(true);
    // Ordered: BEGIN -> lock -> UPDATE components -> UPDATE inventory -> SELECT hash -> INSERT audit -> COMMIT
    expect(client.calls[0]).toBe('BEGIN');
    expect(client.calls.some(c => c.startsWith('SELECT version, status FROM inventory'))).toBe(true);
    expect(client.calls.some(c => c.startsWith('UPDATE components'))).toBe(true);
    expect(client.calls.some(c => c.startsWith('UPDATE inventory'))).toBe(true);
    expect(client.calls.some(c => c.startsWith('INSERT INTO audit_events'))).toBe(true);
    expect(client.calls[client.calls.length - 1]).toBe('COMMIT');
  });

  it('rolls back and returns a 409 on version conflict (no writes)', async () => {
    const client = makeClient({ version: 5 });
    const res = await tryTransactionalTransition(
      { ...baseInput, clientVersion: 4 },
      { pool: poolOf(client) },
    );
    expect(res?.success).toBe(false);
    expect(res?.error?.code).toBe('VERSION_CONFLICT');
    expect(res?.httpStatus).toBe(409);
    expect(client.calls).toContain('ROLLBACK');
    expect(client.calls.some(c => c.startsWith('UPDATE'))).toBe(false);
  });

  it('returns null when there is no inventory row to lock', async () => {
    const client = makeClient({ rowCount: 0 });
    const res = await tryTransactionalTransition(baseInput, { pool: poolOf(client) });
    expect(res).toBeNull();
    expect(client.calls).toContain('ROLLBACK');
  });

  it('rolls back and fails closed if a write throws', async () => {
    const client = makeClient({ version: 1 });
    const orig = client.query.bind(client);
    client.query = async (text: string, values?: unknown[]) => {
      if (text.trim().startsWith('UPDATE inventory')) throw new Error('deadlock');
      return orig(text, values);
    };
    const res = await tryTransactionalTransition({ ...baseInput, clientVersion: 1 }, { pool: poolOf(client) });
    expect(res?.success).toBe(false);
    expect(res?.error?.code).toBe('TRANSACTION_FAILED');
    expect(res?.httpStatus).toBe(500);
    expect(client.calls).toContain('ROLLBACK');
  });
});
