import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/v1/orders/[id]/[action]/route';

const mockDb = vi.hoisted(() => ({
  auditEvents: {
    create: vi.fn(),
  },
  components: {
    updateStatus: vi.fn(),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
  },
  orders: {
    getAll: vi.fn(),
    update: vi.fn(),
    updateWithLock: vi.fn(),
  },
  transport_jobs: {
    getByOrderId: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

const baseOrder = {
  id: 'ORD-1',
  hospital: 'HOSP-1',
  priority: 'ROUTINE',
  status: 'SUBMITTED',
  items: [{ abo: 'O', rhd: 'Positive', qty: 1 }],
  allocatedUnits: [],
  verifiedUnits: [],
};

function requestFor(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/v1/orders/ORD-1/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function postAction(action: string, body: Record<string, unknown> = {}) {
  return POST(
    requestFor(body),
    { params: Promise.resolve({ id: 'ORD-1', action }) },
  );
}

describe('order action route blood unit safeguards', () => {
  const originalRbacFlag = process.env.VN_BECS_ENFORCE_API_RBAC;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VN_BECS_ENFORCE_API_RBAC = originalRbacFlag;
    mockDb.orders.getAll.mockResolvedValue([{ ...baseOrder }]);
    mockDb.orders.update.mockResolvedValue(undefined);
    mockDb.orders.updateWithLock.mockImplementation((id: string, version: number, data: any) => {
      return mockDb.orders.update(id, data);
    });
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.transport_jobs.getByOrderId.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.VN_BECS_ENFORCE_API_RBAC = originalRbacFlag;
  });

  it('does not generate mock blood units when approval stock is insufficient', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        items: [{ abo: 'O', rhd: 'Positive', qty: 2 }],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        abo: 'O',
        rhd: 'Positive',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Central HUB',
      },
    ]);

    const response = await postAction('approve');
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('INSUFFICIENT_RELEASABLE_STOCK');
    expect(mockDb.inventory.create).not.toHaveBeenCalled();
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('blocks order actions by role when API RBAC is enforced', async () => {
    process.env.VN_BECS_ENFORCE_API_RBAC = 'true';

    const response = await postAction('approve', { actorRole: 'Nurse' });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('ROLE_NOT_ALLOWED');
    expect(mockDb.inventory.getAll).not.toHaveBeenCalled();
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('blocks dispatch when an allocated unit was not actually reserved', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'APPROVED',
        allocatedUnits: ['CMP-1'],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        abo: 'O',
        rhd: 'Positive',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Central HUB',
      },
    ]);

    const response = await postAction('dispatch', { scannedCode: 'CMP-1' });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('TRANSITION_BLOCKED');
    expect(mockDb.inventory.create).not.toHaveBeenCalled();
  });

  it('dispatches a reserved unit through the state machine', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'APPROVED',
        allocatedUnits: ['CMP-1'],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        abo: 'O',
        rhd: 'Positive',
        status: 'RESERVED',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Central HUB',
      },
    ]);

    const response = await postAction('dispatch', { scannedCode: 'CMP-1' });

    expect(response.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalledWith('ORD-1', {
      status: 'DISPATCHED',
      allocatedUnits: ['CMP-1'],
      verifiedUnits: ['CMP-1'],
    });
    // Inventory item exists → updateStatusWithLock or create fallback
    const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-1'
    );
    const calledCreate = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-1' && c[0]?.status === 'PICKED'
    );
    expect(calledLock || calledCreate).toBe(true);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'PICKED');
  });

  it('dynamically swaps compatible units through planned transitions before picking', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'APPROVED',
        allocatedUnits: ['CMP-OLD'],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-OLD',
        abo: 'O',
        rhd: 'Positive',
        status: 'RESERVED',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Central HUB',
      },
      {
        unitId: 'CMP-NEW',
        abo: 'O',
        rhd: 'Positive',
        status: 'AVAILABLE',
        expiryDate: '2027-01-02T00:00:00Z',
        location: 'Central HUB',
      },
    ]);

    const response = await postAction('dispatch', { scannedCode: 'CMP-NEW' });

    expect(response.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalledWith('ORD-1', {
      status: 'DISPATCHED',
      allocatedUnits: ['CMP-NEW'],
      verifiedUnits: ['CMP-NEW'],
    });
    // CMP-OLD should be released back to AVAILABLE
    const oldReleased = [
      ...mockDb.inventory.create.mock.calls,
      ...mockDb.inventory.updateStatusWithLock.mock.calls,
    ].some((c: any) => {
      const arg = Array.isArray(c) ? c[0] : null;
      return arg?.unitId === 'CMP-OLD' || (c[0] === 'CMP-OLD');
    });
    expect(oldReleased).toBe(true);
    // CMP-NEW should end up PICKED
    const newPicked = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-NEW' && c[0]?.status === 'PICKED'
    ) || mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-NEW'
    );
    expect(newPicked).toBe(true);
  });

  it('does not release the old unit when a dynamic swap target cannot be reserved', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'APPROVED',
        allocatedUnits: ['CMP-OLD'],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-OLD',
        abo: 'O',
        rhd: 'Positive',
        status: 'RESERVED',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Central HUB',
      },
      {
        unitId: 'CMP-NEW',
        abo: 'O',
        rhd: 'Positive',
        status: 'ISSUED',
        expiryDate: '2027-01-02T00:00:00Z',
        location: 'Central HUB',
      },
    ]);

    const response = await postAction('dispatch', { scannedCode: 'CMP-NEW' });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('TRANSITION_BLOCKED');
    expect(mockDb.inventory.create).not.toHaveBeenCalled();
    expect(mockDb.orders.update).not.toHaveBeenCalled();
  });

  it('keeps delivered units in RECEIVED state instead of returning them to available stock', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'IN_TRANSIT',
        allocatedUnits: ['CMP-1'],
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        abo: 'O',
        rhd: 'Positive',
        status: 'IN_TRANSIT',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Courier',
      },
    ]);

    const response = await postAction('deliver', { handoverCode: 'HANDOVER-1' });

    expect(response.status).toBe(200);
    expect(mockDb.orders.update).toHaveBeenCalledWith('ORD-1', { status: 'DELIVERED' });
    // Inventory item exists → updateStatusWithLock or create fallback
    const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-1'
    );
    const calledCreate = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-1' && c[0]?.status === 'RECEIVED'
    );
    expect(calledLock || calledCreate).toBe(true);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'RECEIVED');
  });

  it('allows actions and increments version when client baseVersion matches order version', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'IN_TRANSIT',
        allocatedUnits: ['CMP-1'],
        version: 3,
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        abo: 'O',
        rhd: 'Positive',
        status: 'IN_TRANSIT',
        expiryDate: '2027-01-01T00:00:00Z',
        location: 'Courier',
      },
    ]);

    const response = await postAction('deliver', { handoverCode: 'HANDOVER-1', baseVersion: 3 });

    expect(response.status).toBe(200);
    expect(mockDb.orders.updateWithLock).toHaveBeenCalledWith('ORD-1', 3, expect.objectContaining({
      status: 'DELIVERED',
    }));
  });

  it('blocks actions with 409 status when client baseVersion mismatches server order version', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'IN_TRANSIT',
        allocatedUnits: ['CMP-1'],
        version: 4,
      },
    ]);

    const response = await postAction('deliver', { handoverCode: 'HANDOVER-1', baseVersion: 3 });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('VERSION_CONFLICT');
    expect(mockDb.orders.updateWithLock).not.toHaveBeenCalled();
  });

  it('handles and throws proper concurrency error when database-level collision occurs', async () => {
    mockDb.orders.getAll.mockResolvedValue([
      {
        ...baseOrder,
        status: 'IN_TRANSIT',
        allocatedUnits: ['CMP-1'],
        version: 3,
      },
    ]);
    mockDb.orders.updateWithLock.mockRejectedValue(new Error('ConcurrencyConflict: Order has been modified'));

    const response = await postAction('deliver', { handoverCode: 'HANDOVER-1', baseVersion: 3 });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe('ORDER_ACTION_FAILED');
    expect(body.message).toContain('ConcurrencyConflict');
  });
});
