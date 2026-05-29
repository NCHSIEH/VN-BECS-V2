import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/v1/sync/push-events/route';

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
  offlineEvents: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function syncRequest(events: Record<string, unknown>[]) {
  return new Request('http://localhost/api/v1/sync/push-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'REQ-SYNC-1',
    },
    body: JSON.stringify({ events }),
  });
}

const baseEvent = {
  localEventId: 'LOCAL-1',
  idempotencyKey: 'IDEM-1',
  operationType: 'IssueBag',
  bagUid: 'CMP-1',
  baseVersion: 3,
  payload: {
    isBreakGlass: true,
    patientRef: 'MRN-1',
  },
};

describe('sync push events route safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue({
      unitId: 'CMP-1',
      status: 'ISSUED',
      version: 4,
    });
    mockDb.offlineEvents.create.mockResolvedValue(undefined);
    mockDb.offlineEvents.getAll.mockResolvedValue([]);
  });

  it('marks terminal blood unit overwrite attempts as needs-review conflicts', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'TRANSFUSED',
        version: 3,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(syncRequest([baseEvent]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'NeedsReview',
      errorCode: 'TERMINAL_STATE_CONFLICT',
      currentStatus: 'TRANSFUSED',
      serverVersion: 3,
    });
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
    expect(mockDb.auditEvents.create).not.toHaveBeenCalled();
  });

  it('rejects offline issue events without a patient reference', async () => {
    const response = await POST(syncRequest([{
      ...baseEvent,
      patientRef: undefined,
      payload: { isBreakGlass: true },
    }]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'Rejected',
      errorCode: 'PATIENT_REF_REQUIRED',
    });
    expect(mockDb.inventory.getAll).not.toHaveBeenCalled();
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('requires break-glass authorization for offline issue events', async () => {
    const response = await POST(syncRequest([{
      ...baseEvent,
      payload: { patientRef: 'MRN-1' },
    }]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'NeedsReview',
      errorCode: 'BREAK_GLASS_REQUIRED',
    });
    expect(mockDb.inventory.getAll).not.toHaveBeenCalled();
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('marks stale baseVersion events as needs-review conflicts', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'AVAILABLE',
        version: 4, // Server at v4, client thinks v3
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(syncRequest([baseEvent]));  // baseEvent has baseVersion: 3
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'NeedsReview',
      errorCode: 'VERSION_CONFLICT',
      currentStatus: 'AVAILABLE',
      serverVersion: 4,
    });
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('returns stored receipt result for duplicate idempotency keys', async () => {
    mockDb.offlineEvents.getAll.mockResolvedValue([
      {
        localEventId: 'LOCAL-1',
        idempotencyKey: 'IDEM-1',
        syncStatus: 'Accepted',
        serverVersion: 5,
        currentStatus: 'ISSUED',
      },
    ]);

    const response = await POST(syncRequest([baseEvent]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'Accepted',
      duplicate: true,
      serverVersion: 5,
      currentStatus: 'ISSUED',
    });
    expect(mockDb.inventory.getAll).not.toHaveBeenCalled();
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('rejects offline issue events when the component is expired on the server', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'AVAILABLE',
        version: 3,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    const response = await POST(syncRequest([baseEvent]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'Rejected',
      errorCode: 'TRANSITION_BLOCKED',
    });
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('rejects offline issue events when the component is currently quarantined on the server', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'QUARANTINE',
        version: 3,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(syncRequest([baseEvent]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      syncState: 'Rejected',
      errorCode: 'TRANSITION_BLOCKED',
    });
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
  });

  it('processes a batch of mixed events (Accepted, Duplicate, Conflict) in isolation', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'AVAILABLE',
        version: 3,
        expiryDate: '2027-01-01T00:00:00Z',
      },
      {
        unitId: 'CMP-2',
        status: 'TRANSFUSED',
        version: 3,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    mockDb.offlineEvents.getAll.mockResolvedValue([
      {
        localEventId: 'LOCAL-DUP',
        idempotencyKey: 'IDEM-DUP',
        syncStatus: 'Accepted',
        serverVersion: 5,
        currentStatus: 'ISSUED',
      },
    ]);

    const event1 = {
      ...baseEvent,
      localEventId: 'LOCAL-1',
      idempotencyKey: 'IDEM-1',
      bagUid: 'CMP-1',
      baseVersion: 3,
    };
    const event2 = {
      ...baseEvent,
      localEventId: 'LOCAL-DUP',
      idempotencyKey: 'IDEM-DUP',
      bagUid: 'CMP-1',
      baseVersion: 3,
    };
    const event3 = {
      ...baseEvent,
      localEventId: 'LOCAL-3',
      idempotencyKey: 'IDEM-3',
      bagUid: 'CMP-2',
      baseVersion: 3,
    };

    const response = await POST(syncRequest([event1, event2, event3]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(3);

    expect(body.results[0].syncState).toBe('Accepted');
    expect(body.results[0].duplicate).toBeUndefined();
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'ISSUED');

    expect(body.results[1].syncState).toBe('Accepted');
    expect(body.results[1].duplicate).toBe(true);
    expect(body.results[1].serverVersion).toBe(5);

    expect(body.results[2].syncState).toBe('NeedsReview');
    expect(body.results[2].errorCode).toBe('TERMINAL_STATE_CONFLICT');
  });
});
