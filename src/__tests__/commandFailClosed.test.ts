import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  inventory: { getAll: vi.fn(), create: vi.fn(), updateStatusWithLock: vi.fn() },
  components: { getAll: vi.fn(), updateStatus: vi.fn(), getById: vi.fn() },
  auditEvents: { create: vi.fn() },
}));
vi.mock('@/src/server/db', () => mockDb);
vi.mock('../server/db', () => mockDb);

import { executeBloodUnitTransition } from '../server/services/bloodUnitCommands';

const cmd = {
  unitId: 'U1',
  currentStatus: 'QUARANTINE',
  targetStatus: 'AVAILABLE',
  role: 'Admin' as const,
  context: { idmStatus: 'CLEARED' as const },
};

describe('executeBloodUnitTransition fail-closed in production (RTM-STATE-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.inventory.getAll.mockResolvedValue([{ unitId: 'U1', version: 1, status: 'QUARANTINE' }]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('returns failure when audit write fails in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockDb.auditEvents.create.mockRejectedValueOnce(new Error('db down'));
    const result = await executeBloodUnitTransition(cmd);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('AUDIT_WRITE_FAILED');
  });

  it('returns failure when inventory sync fails in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockDb.inventory.getAll.mockRejectedValueOnce(new Error('db down'));
    const result = await executeBloodUnitTransition(cmd);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVENTORY_SYNC_FAILED');
  });

  it('stays lenient (success) on audit failure outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mockDb.auditEvents.create.mockRejectedValueOnce(new Error('db down'));
    const result = await executeBloodUnitTransition(cmd);
    expect(result.success).toBe(true);
  });
});
