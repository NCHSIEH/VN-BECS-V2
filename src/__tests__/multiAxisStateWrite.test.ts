import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the data layer before importing the command service.
const mockDb = vi.hoisted(() => ({
  components: { updateStatus: vi.fn(), update: vi.fn(), getById: vi.fn() },
  inventory: { getByUnitId: vi.fn(), updateStatusWithLock: vi.fn(), getAll: vi.fn(), create: vi.fn() },
  auditEvents: { create: vi.fn() },
}));
vi.mock('@/src/server/db', () => mockDb);

import { executeBloodUnitTransition } from '../server/services/bloodUnitCommands';

describe('RTM-STATE-04: multi-axis status columns are written by the command service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.components.update.mockResolvedValue(undefined);
    mockDb.inventory.getByUnitId.mockResolvedValue({ unitId: 'CMP-1', status: 'AVAILABLE', version: 1 });
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
  });

  it('writes the derived multi-axis snapshot to both inventory and components on AVAILABLE -> RESERVED', async () => {
    const result = await executeBloodUnitTransition({
      unitId: 'CMP-1',
      currentStatus: 'AVAILABLE',
      targetStatus: 'RESERVED',
      role: 'Dispatcher',
      context: { orderApproved: true, baseVersion: 1 },
    });

    expect(result.success).toBe(true);

    // Inventory write carries the multi-axis columns alongside the legacy status.
    expect(mockDb.inventory.updateStatusWithLock).toHaveBeenCalledWith(
      'CMP-1',
      1,
      expect.objectContaining({
        status: 'RESERVED',
        quality_status: 'RELEASED',
        inventory_status: 'ORDER_RESERVED',
        assignment_status: 'ORDER_ALLOCATED',
      }),
    );

    // Components row also receives the multi-axis snapshot (best-effort).
    expect(mockDb.components.update).toHaveBeenCalledWith(
      'CMP-1',
      expect.objectContaining({
        quality_status: 'RELEASED',
        inventory_status: 'ORDER_RESERVED',
        assignment_status: 'ORDER_ALLOCATED',
      }),
    );
  });

  it('does not fail the transition if the best-effort component multi-axis write throws', async () => {
    mockDb.components.update.mockRejectedValueOnce(new Error('column missing'));
    const result = await executeBloodUnitTransition({
      unitId: 'CMP-1',
      currentStatus: 'AVAILABLE',
      targetStatus: 'RESERVED',
      role: 'Dispatcher',
      context: { orderApproved: true, baseVersion: 1 },
    });
    expect(result.success).toBe(true);
  });
});
