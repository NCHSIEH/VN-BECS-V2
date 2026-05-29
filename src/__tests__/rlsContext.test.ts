import { describe, expect, it, vi } from 'vitest';
import { applyFacilityScope, buildFacilityScopeConfig } from '../server/rlsContext';

describe('buildFacilityScopeConfig', () => {
  it('builds transaction-local set_config statements for a scoped actor', () => {
    const cfg = buildFacilityScopeConfig({ role: 'HospitalOperator', orgId: 'HOSP-A', source: 'session' });
    expect(cfg.isAdmin).toBe(false);
    expect(cfg.facilityId).toBe('HOSP-A');
    expect(cfg.statements).toEqual([
      { text: "SELECT set_config('app.facility_id', $1, true)", values: ['HOSP-A'] },
      { text: "SELECT set_config('app.role', $1, true)", values: ['HospitalOperator'] },
    ]);
  });

  it('flags Admin (facility-scope bypass per migration policy)', () => {
    expect(buildFacilityScopeConfig({ role: 'Admin', orgId: 'HUB-1' }).isAdmin).toBe(true);
  });

  it('fails closed to an empty facility when none is present', () => {
    const cfg = buildFacilityScopeConfig({ role: 'Nurse', orgId: null });
    expect(cfg.facilityId).toBe('');
    expect(cfg.statements[0].values).toEqual(['']);
  });
});

describe('applyFacilityScope', () => {
  it('runs the GUC statements against a session-derived identity', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const ok = await applyFacilityScope({ query }, { role: 'Dispatcher', orgId: 'HUB-1', source: 'session' });
    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, "SELECT set_config('app.facility_id', $1, true)", ['HUB-1']);
    expect(query).toHaveBeenNthCalledWith(2, "SELECT set_config('app.role', $1, true)", ['Dispatcher']);
  });

  it('refuses to set scope for a non-session (header/none) identity — fail closed', async () => {
    const query = vi.fn();
    expect(await applyFacilityScope({ query }, { role: 'Admin', orgId: 'X', source: 'header' })).toBe(false);
    expect(await applyFacilityScope({ query }, { role: 'Admin', orgId: 'X', source: 'none' })).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
