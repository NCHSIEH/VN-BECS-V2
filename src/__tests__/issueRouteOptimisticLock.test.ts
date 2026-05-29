import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/v1/issue/route';

const mockDb = vi.hoisted(() => ({
  components: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  inventory: {
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
    create: vi.fn(),
  },
  issueRecords: {
    create: vi.fn(),
  },
  auditEvents: {
    create: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function issueRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'REQ-ISSUE-LOCK-1',
    },
    body: JSON.stringify(body),
  });
}

describe('Blood Unit Issue Route Optimistic Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.issueRecords.create.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue({
      unitId: 'CMP-ISS-1',
      status: 'ISSUED',
      version: 5,
    });
  });

  it('successfully issues a blood unit when version matches', async () => {
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-ISS-1', status: 'CROSSMATCHED', expiryDate: '2027-01-01T00:00:00Z' }
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      { unitId: 'CMP-ISS-1', status: 'CROSSMATCHED', version: 4, expiryDate: '2027-01-01T00:00:00Z' }
    ]);

    const requestBody = {
      componentId: 'CMP-ISS-1',
      patientId: 'MRN-PAT-1',
      issuedTo: 'Ward A',
      issuedBy: 'Nurse B',
      baseVersion: 4, // Matches server version
    };

    const response = await POST(issueRequest(requestBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBeDefined();
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-ISS-1', 'ISSUED');
    expect(mockDb.inventory.updateStatusWithLock).toHaveBeenCalledWith('CMP-ISS-1', 4, { status: 'ISSUED' });
    expect(mockDb.issueRecords.create).toHaveBeenCalled();
    expect(mockDb.auditEvents.create).toHaveBeenCalled();
  });

  it('rejects issuing a blood unit when version is stale', async () => {
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-ISS-1', status: 'CROSSMATCHED', expiryDate: '2027-01-01T00:00:00Z' }
    ]);
    mockDb.inventory.getAll.mockResolvedValue([
      { unitId: 'CMP-ISS-1', status: 'CROSSMATCHED', version: 5, expiryDate: '2027-01-01T00:00:00Z' } // Server is at version 5
    ]);

    const requestBody = {
      componentId: 'CMP-ISS-1',
      patientId: 'MRN-PAT-1',
      issuedTo: 'Ward A',
      issuedBy: 'Nurse B',
      baseVersion: 4, // Stale!
    };

    const response = await POST(issueRequest(requestBody));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      success: false,
      code: 'VERSION_CONFLICT',
    });
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
    expect(mockDb.inventory.updateStatusWithLock).not.toHaveBeenCalled();
    expect(mockDb.issueRecords.create).not.toHaveBeenCalled();
  });
});
