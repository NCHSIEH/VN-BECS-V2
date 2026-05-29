import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/v1/issue/[id]/return/route';

const mockDb = vi.hoisted(() => ({
  auditEvents: {
    create: vi.fn(),
  },
  components: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
  },
  issueRecords: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function returnRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/issue/ISS-1/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('issue return route status synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-RET-1',
        status: 'AVAILABLE',
        productCode: 'WB',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-RET-1',
        status: 'ISSUED',
        version: 9,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.issueRecords.getById.mockResolvedValue({
      id: 'ISS-1',
      componentId: 'CMP-RET-1',
      issuedAt: new Date().toISOString(),
    });
    mockDb.issueRecords.update.mockResolvedValue(undefined);
  });

  it('uses inventory status for return validation and writes the final state to both stores', async () => {
    const response = await POST(returnRequest({
      coldChainOk: true,
      visualOk: true,
      role: 'HospitalOperator',
    }), { params: Promise.resolve({ id: 'ISS-1' }) });

    expect(response.status).toBe(200);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-RET-1', 'AVAILABLE');
    // Inventory item EXISTS (version 9, status ISSUED) → updateStatusWithLock or create fallback
    const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-RET-1'
    );
    const calledCreate = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-RET-1' && c[0]?.status === 'AVAILABLE'
    );
    expect(calledLock || calledCreate).toBe(true);
  });
});
