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
  transfusions: {
    create: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function syncRequest(events: Record<string, unknown>[]) {
  return new Request('http://localhost/api/v1/sync/push-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'REQ-SYNC-SCENARIOS-1',
    },
    body: JSON.stringify({ events }),
  });
}

describe('Offline Sync Robustness & Consistency Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue({
      unitId: 'CMP-TEST-1',
      status: 'TRANSFUSED',
      version: 4,
    });
    mockDb.offlineEvents.create.mockResolvedValue(undefined);
    mockDb.offlineEvents.getAll.mockResolvedValue([]);
    mockDb.transfusions.create.mockResolvedValue(undefined);
  });

  // ==========================================
  // 1. REPLAY & IDEMPOTENCY
  // ==========================================
  describe('Replay & Idempotency', () => {
    it('returns the exact stored receipt and mark duplicate: true for retried events', async () => {
      mockDb.offlineEvents.getAll.mockResolvedValue([
        {
          localEventId: 'LOCAL-XM-1',
          idempotencyKey: 'IDEM-XM-1',
          syncStatus: 'Accepted',
          serverVersion: 6,
          currentStatus: 'TRANSFUSED',
        },
      ]);

      const event = {
        localEventId: 'LOCAL-XM-1',
        idempotencyKey: 'IDEM-XM-1',
        operationType: 'TransfuseBag',
        bagUid: 'CMP-TEST-1',
        patientRef: 'MRN-PATIENT-1',
        payload: {
          consentVerified: true,
          preVitalsChecked: true,
          verifier1: 'Nurse A',
          verifier2Pin: '1234',
        },
      };

      const response = await POST(syncRequest([event]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'Accepted',
        duplicate: true,
        serverVersion: 6,
        currentStatus: 'TRANSFUSED',
      });
      expect(mockDb.inventory.getAll).not.toHaveBeenCalled();
      expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. CONCURRENCY MERGE CONFLICTS
  // ==========================================
  describe('Merge Conflicts & Optimistic Locking', () => {
    it('returns NeedsReview with VERSION_CONFLICT when client baseVersion does not match server version', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 5, // Server is at version 5
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const event = {
        localEventId: 'LOCAL-XM-2',
        idempotencyKey: 'IDEM-XM-2',
        operationType: 'TransfuseBag',
        bagUid: 'CMP-TEST-1',
        baseVersion: 4, // Client thinks it is at version 4 (Stale!)
        patientRef: 'MRN-PATIENT-1',
        payload: {
          consentVerified: true,
          preVitalsChecked: true,
          verifier1: 'Nurse A',
          verifier2Pin: '1234',
        },
      };

      const response = await POST(syncRequest([event]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'NeedsReview',
        errorCode: 'VERSION_CONFLICT',
        currentStatus: 'ISSUED',
        serverVersion: 5,
      });
      expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
      expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 3. TRANSFUSE BAG OPERATION & GUARDS
  // ==========================================
  describe('TransfuseBag Operation', () => {
    const validTransfuseEvent = {
      localEventId: 'LOCAL-TX-1',
      idempotencyKey: 'IDEM-TX-1',
      operationType: 'TransfuseBag',
      bagUid: 'CMP-TEST-1',
      baseVersion: 3,
      patientRef: 'MRN-PATIENT-1',
      payload: {
        consentVerified: true,
        preVitalsChecked: true,
        verifier1: 'Nurse A',
        verifier2Pin: '1234',
      },
    };

    it('successfully processes transfusions when all guards pass', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 3,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([validTransfuseEvent]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'Accepted',
        currentStatus: 'TRANSFUSED',
        serverVersion: 4,
      });
      // Inventory item exists (version 3 = baseVersion) → updateStatusWithLock or create fallback
      const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
        (c: any) => c[0] === 'CMP-TEST-1'
      );
      const calledCreate = mockDb.inventory.create.mock.calls.some(
        (c: any) => c[0]?.unitId === 'CMP-TEST-1' && c[0]?.status === 'TRANSFUSED'
      );
      expect(calledLock || calledCreate).toBe(true);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-TEST-1', 'TRANSFUSED');
      expect(mockDb.transfusions.create).toHaveBeenCalled();
      expect(mockDb.auditEvents.create).toHaveBeenCalled();
    });

    it('rejects transfusion when patient reference is missing', async () => {
      const invalidEvent = {
        ...validTransfuseEvent,
        patientRef: undefined,
      };

      const response = await POST(syncRequest([invalidEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'PATIENT_REF_REQUIRED',
      });
    });

    it('rejects transfusion when clinical prerequisites are not verified', async () => {
      const invalidEvent = {
        ...validTransfuseEvent,
        payload: {
          ...validTransfuseEvent.payload,
          consentVerified: false,
        },
      };

      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 3,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([invalidEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'BEDSIDE_CLINICAL_PREREQUISITES_MISSING',
      });
    });

    it('rejects transfusion when dual verifier info is missing', async () => {
      const invalidEvent = {
        ...validTransfuseEvent,
        payload: {
          ...validTransfuseEvent.payload,
          verifier2Pin: undefined,
        },
      };

      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 3,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([invalidEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'DUAL_VERIFICATION_REQUIRED',
      });
    });

    it('rejects transfusion if the bag is expired on the server', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 3,
          expiryDate: new Date(Date.now() - 100000).toISOString(), // Expired!
        },
      ]);

      const response = await POST(syncRequest([validTransfuseEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'TRANSITION_BLOCKED', // Expiry block
      });
    });

    it('rejects transfusion if the bag is under a lookback hold (QUARANTINED) on the server', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'QUARANTINE', // Quarantine lookback hold!
          version: 3,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([validTransfuseEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'TRANSITION_BLOCKED', // No transition path from QUARANTINE to TRANSFUSED
      });
    });
  });

  // ==========================================
  // 4. WASTE BAG OPERATION & GUARDS
  // ==========================================
  describe('WasteBag Operation', () => {
    const validWasteEvent = {
      localEventId: 'LOCAL-WS-1',
      idempotencyKey: 'IDEM-WS-1',
      operationType: 'WasteBag',
      bagUid: 'CMP-TEST-1',
      baseVersion: 2,
      payload: {
        reasonCode: 'W-TEMP-EXCURSION',
      },
    };

    it('successfully syncs wasting of a bag', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'ISSUED',
          version: 2,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([validWasteEvent]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'Accepted',
        currentStatus: 'WASTED',
        serverVersion: 3,
      });
      // Inventory item exists (version 2 = baseVersion) → updateStatusWithLock or create fallback
      const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
        (c: any) => c[0] === 'CMP-TEST-1'
      );
      const calledCreate = mockDb.inventory.create.mock.calls.some(
        (c: any) => c[0]?.unitId === 'CMP-TEST-1' && c[0]?.status === 'WASTED'
      );
      expect(calledLock || calledCreate).toBe(true);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-TEST-1', 'WASTED');
    });

    it('rejects wasting when reasonCode is missing', async () => {
      const invalidEvent = {
        ...validWasteEvent,
        payload: {},
      };

      const response = await POST(syncRequest([invalidEvent]));
      const body = await response.json();

      expect(body.results[0]).toMatchObject({
        syncState: 'Rejected',
        errorCode: 'MISSING_REASON_CODE',
      });
    });
  });

  // ==========================================
  // 5. RECEIVE BAG OPERATION
  // ==========================================
  describe('ReceiveBag Operation', () => {
    const validReceiveEvent = {
      localEventId: 'LOCAL-RC-1',
      idempotencyKey: 'IDEM-RC-1',
      operationType: 'ReceiveBag',
      bagUid: 'CMP-TEST-1',
      baseVersion: 2,
    };

    it('successfully syncs receipt of an in-transit bag', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'IN_TRANSIT',
          version: 2,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const response = await POST(syncRequest([validReceiveEvent]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'Accepted',
        currentStatus: 'RECEIVED',
        serverVersion: 3,
      });
      // Inventory item exists (version 2 = baseVersion) → updateStatusWithLock or create fallback
      const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
        (c: any) => c[0] === 'CMP-TEST-1'
      );
      const calledCreate = mockDb.inventory.create.mock.calls.some(
        (c: any) => c[0]?.unitId === 'CMP-TEST-1' && c[0]?.status === 'RECEIVED'
      );
      expect(calledLock || calledCreate).toBe(true);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-TEST-1', 'RECEIVED');
    });
  });

  // ==========================================
  // 6. SERVER AUTHORITATIVE STATE BLOCKS (TERMINAL OVERWRITES)
  // ==========================================
  describe('Server Authoritative Terminal Blocks', () => {
    it('blocks attempting to sync a transaction on a unit already marked TRANSFUSED on the server', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        {
          unitId: 'CMP-TEST-1',
          status: 'TRANSFUSED', // Terminal state on server!
          version: 5,
          expiryDate: '2027-01-01T00:00:00Z',
        },
      ]);

      const event = {
        localEventId: 'LOCAL-TX-99',
        idempotencyKey: 'IDEM-TX-99',
        operationType: 'WasteBag',
        bagUid: 'CMP-TEST-1',
        baseVersion: 5,
        payload: {
          reasonCode: 'W-EXPIRY',
        },
      };

      const response = await POST(syncRequest([event]));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results[0]).toMatchObject({
        syncState: 'NeedsReview',
        errorCode: 'TERMINAL_STATE_CONFLICT',
        currentStatus: 'TRANSFUSED',
        serverVersion: 5,
      });
      expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
    });
  });
});
