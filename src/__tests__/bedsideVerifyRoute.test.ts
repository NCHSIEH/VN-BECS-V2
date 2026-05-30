import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/v1/bedside-verify/route';

const mockCrypto = vi.hoisted(() => ({
  verifyPassword: vi.fn().mockReturnValue(true),
}));

vi.mock('@/src/server/crypto', () => mockCrypto);

const mockDb = vi.hoisted(() => ({
  audit_events: {
    create: vi.fn(),
  },
  auditEvents: {
    create: vi.fn(),
  },
  components: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  labTests: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
  },
  crossmatch: {
    getAll: vi.fn(),
  },
  issueRecords: {
    getAll: vi.fn(),
  },
  transfusions: {
    create: vi.fn(),
  },
  users: {
    getByUsername: vi.fn(),
    getAll: vi.fn(),
  },
  patients: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function bedsideRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/v1/bedside-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const NURSE_1 = {
  id: 'user-nurse-1',
  username: 'Nurse A',
  role: 'Nurse',
  orgId: 'HOSP-1',
  password: 'hashed-pw-1',
};

const NURSE_2 = {
  id: 'user-nurse-2',
  username: 'Nurse B',
  role: 'Nurse',
  orgId: 'HOSP-1',
  password: 'hashed-pw-2',
};

// validPayload uses verifier2 (username) so the route looks up by username — no PIN verification needed
const validPayload = {
  patientId: 'MRN-1',
  unitBarcodeRaw: 'CMP-1',
  verifier1: 'Nurse A',
  verifier1Pin: '1234',
  verifier2: 'Nurse B',
  verifier2Pin: '9988',
  consentVerified: true,
  preVitalsChecked: true,
};

describe('bedside verification route safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCrypto.verifyPassword.mockReturnValue(true);
    mockDb.audit_events.create.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.crossmatch.getAll.mockResolvedValue([
      {
        id: 'XM-1',
        componentId: 'CMP-1',
        patientId: 'MRN-1',
        result: 'Compatible',
      },
    ]);
    mockDb.issueRecords.getAll.mockResolvedValue([
      {
        id: 'ISS-1',
        componentId: 'CMP-1',
        patientId: 'MRN-1',
      },
    ]);
    mockDb.transfusions.create.mockResolvedValue(undefined);
    // Two distinct users: Nurse A (primary) and Nurse B (secondary)
    mockDb.users.getByUsername.mockImplementation((username: string) => {
      if (username === 'Nurse A') return Promise.resolve(NURSE_1);
      if (username === 'Nurse B') return Promise.resolve(NURSE_2);
      return Promise.resolve(null);
    });
    mockDb.users.getAll.mockResolvedValue([NURSE_1, NURSE_2]);
    mockDb.patients.getAll.mockResolvedValue([{
      id: 'MRN-1',
      mrn: 'MRN-1',
      name: 'Test Patient',
      hospitalId: 'HOSP-1',
    }]);
  });

  it('blocks transfusion when clinical prerequisites are missing', async () => {
    const response = await POST(bedsideRequest({
      ...validPayload,
      consentVerified: false,
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('BEDSIDE_CLINICAL_PREREQUISITES_MISSING');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
  });

  it('blocks when primary verifier not found', async () => {
    mockDb.users.getByUsername.mockImplementation((username: string) => {
      if (username === 'Nurse B') return Promise.resolve(NURSE_2);
      return Promise.resolve(null); // Nurse A not found
    });

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('PRIMARY_VERIFIER_NOT_FOUND');
  });

  it('blocks transfusion when both verifiers are the same user', async () => {
    // Both verifier1 and verifier2 resolve to the same user id
    mockDb.users.getByUsername.mockResolvedValue(NURSE_1); // always Nurse 1

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('SAME_USER_VERIFICATION_BLOCKED');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
  });

  it('blocks bedside transfusion when the component has not been issued', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('TRANSITION_BLOCKED');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
  });

  it('blocks transfusion when there is no active issue record for the patient', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        status: 'ISSUED',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.issueRecords.getAll.mockResolvedValue([]);

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('BEDSIDE_ISSUE_RECORD_NOT_FOUND');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
  });

  it('blocks transfusion when the matching crossmatch is not compatible', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        status: 'ISSUED',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.crossmatch.getAll.mockResolvedValue([
      {
        id: 'XM-1',
        componentId: 'CMP-1',
        patientId: 'MRN-1',
        result: 'Incompatible',
      },
    ]);

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('BEDSIDE_CROSSMATCH_NOT_COMPATIBLE');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
  });

  it('blocks when the primary verifier PIN is missing (BED-01)', async () => {
    const { verifier1Pin, ...noPin } = validPayload;
    const response = await POST(bedsideRequest(noPin));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('PRIMARY_VERIFIER_PIN_REQUIRED');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
  });

  it('blocks when the primary verifier PIN is invalid (BED-01)', async () => {
    // First call (primary) fails, others succeed — simulate wrong primary PIN.
    mockCrypto.verifyPassword.mockReturnValueOnce(false);
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-1', status: 'ISSUED', expiryDate: '2027-01-01T00:00:00Z' },
    ]);
    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.code).toBe('PRIMARY_VERIFIER_AUTH_FAILED');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
  });

  it('blocks transfusion on bedside ABO/Rh mismatch even with a compatible crossmatch record (BED-02)', async () => {
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-1', status: 'ISSUED', expiryDate: '2027-01-01T00:00:00Z', type: 'RBC', abo: 'A', rhd: 'Positive' },
    ]);
    mockDb.patients.getAll.mockResolvedValue([
      { id: 'MRN-1', mrn: 'MRN-1', name: 'Test Patient', hospitalId: 'HOSP-1', abo: 'O', rhd: 'Positive' },
    ]);
    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe('BEDSIDE_ABO_RH_MISMATCH');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
  });

  it('BED-02: uses tested serology ABO (lab_tests) over the component record for the bedside re-check', async () => {
    // Component record says O (would pass for an O patient), but the tested
    // serology is A — the bedside re-check must use the tested A and block.
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-1', donationId: 'DON-1', status: 'ISSUED', expiryDate: '2027-01-01T00:00:00Z', type: 'RBC', abo: 'O', rhd: 'Positive' },
    ]);
    mockDb.labTests.getAll.mockResolvedValue([
      { donationId: 'DON-1', abo: 'A', rhd: 'Positive', idmStatus: 'CLEARED' },
    ]);
    mockDb.patients.getAll.mockResolvedValue([
      { id: 'MRN-1', mrn: 'MRN-1', name: 'Test Patient', hospitalId: 'HOSP-1', abo: 'O', rhd: 'Positive' },
    ]);

    const response = await POST(bedsideRequest(validPayload));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe('BEDSIDE_ABO_RH_MISMATCH');
    expect(mockDb.transfusions.create).not.toHaveBeenCalled();
  });

  it('records transfusion and marks an issued component as transfused', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        status: 'ISSUED',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(bedsideRequest(validPayload));

    expect(response.status).toBe(200);
    expect(mockDb.transfusions.create).toHaveBeenCalledWith(expect.objectContaining({
      componentId: 'CMP-1',
      patientId: 'MRN-1',
    }));
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'TRANSFUSED');
    // No existing inventory item → create path
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-1',
      status: 'TRANSFUSED',
    }));
    expect(mockDb.audit_events.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'BedsideVerify',
      objectId: 'CMP-1',
    }));
  });

  it('uses inventory status as the authoritative state when transfusing', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'ISSUED',
        version: 7,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);

    const response = await POST(bedsideRequest(validPayload));

    expect(response.status).toBe(200);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'TRANSFUSED');
    // Inventory item exists (version 7, ISSUED) → updateStatusWithLock or create fallback
    const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-1'
    );
    const calledCreate = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-1' && c[0]?.status === 'TRANSFUSED'
    );
    expect(calledLock || calledCreate).toBe(true);
  });
});
