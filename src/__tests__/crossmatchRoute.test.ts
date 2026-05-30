import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/v1/crossmatch/route';

const mockDb = vi.hoisted(() => ({
  components: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  crossmatch: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
  donations: {
    getAll: vi.fn(),
  },
  donors: {
    getAll: vi.fn(),
  },
  labTests: {
    getAll: vi.fn(),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
  },
  patients: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function crossmatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/crossmatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('crossmatch route status synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-XM-1',
        donationId: 'DON-XM-1',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.crossmatch.create.mockResolvedValue(undefined);
    mockDb.donations.getAll.mockResolvedValue([
      { id: 'DON-XM-1', donorId: 'DONOR-XM-1' },
    ]);
    mockDb.donors.getAll.mockResolvedValue([
      { id: 'DONOR-XM-1', bloodType: 'O', rhd: 'Negative' },
    ]);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-XM-1',
        status: 'RECEIVED',
        version: 6,
        expiryDate: '2027-01-01T00:00:00Z',
      },
    ]);
    mockDb.patients.getAll.mockResolvedValue([
      { id: 'MRN-XM-1', mrn: 'MRN-XM-1', abo: 'O', rhd: 'Negative', antibodyHistory: [] },
    ]);
    mockDb.labTests.getAll.mockResolvedValue([]);
  });

  it('marks compatible crossmatches in both components and inventory using inventory as authoritative state', async () => {
    const response = await POST(crossmatchRequest({
      componentId: 'CMP-XM-1',
      patientId: 'MRN-XM-1',
      method: 'AHG',
      specimenDate: new Date().toISOString(),
      testedBy: 'Tech Nguyen',
      role: 'HospitalOperator',
    }));

    expect(response.status).toBe(200);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-XM-1', 'CROSSMATCHED');
    // Inventory item exists (version 6) → updateStatusWithLock or create fallback
    const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
      (c: any) => c[0] === 'CMP-XM-1'
    );
    const calledCreate = mockDb.inventory.create.mock.calls.some(
      (c: any) => c[0]?.unitId === 'CMP-XM-1' && c[0]?.status === 'CROSSMATCHED'
    );
    expect(calledLock || calledCreate).toBe(true);
  });

  it('RTM-XM-02: uses the tested serology ABO (lab_tests) over the donor registered type', async () => {
    // Donor registered as A (e.g. stale/erroneous), but the tested serology is O.
    mockDb.donors.getAll.mockResolvedValue([{ id: 'DONOR-XM-1', bloodType: 'A', rhd: 'Positive' }]);
    mockDb.labTests.getAll.mockResolvedValue([
      { id: 'TST-XM-1', donationId: 'DON-XM-1', abo: 'O', rhd: 'Negative', idmStatus: 'CLEARED' },
    ]);

    const response = await POST(crossmatchRequest({
      componentId: 'CMP-XM-1',
      patientId: 'MRN-XM-1', // O Negative
      method: 'AHG',
      specimenDate: new Date().toISOString(),
      testedBy: 'Tech Nguyen',
      role: 'HospitalOperator',
    }));
    const body = await response.json();

    // Tested O into O patient => Compatible. Had it used the donor 'A', an
    // A-unit into an O patient would be Incompatible.
    expect(response.status).toBe(200);
    expect(body.result).toBe('Compatible');
  });
});
