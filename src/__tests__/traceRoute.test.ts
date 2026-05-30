import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/api/v1/trace/route';

const mockDb = vi.hoisted(() => ({
  donors: { getAll: vi.fn() },
  donations: { getAll: vi.fn() },
  components: { getAll: vi.fn() },
  labTests: { getAll: vi.fn() },
  crossmatch: { getAll: vi.fn() },
  issueRecords: { getAll: vi.fn() },
  transfusions: { getAll: vi.fn() },
  adverseReactions: { getAll: vi.fn() },
  patients: { getAll: vi.fn() },
}));
vi.mock('@/src/server/db', () => mockDb);

function traceRequest(qs: string) {
  return new Request(`http://localhost/api/v1/trace${qs}`, { method: 'GET' });
}

describe('GET /api/v1/trace route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.donors.getAll.mockResolvedValue([{ id: 'D1', name: 'Anh', nationalId: '001', bloodType: 'O', rhd: 'Negative' }]);
    mockDb.donations.getAll.mockResolvedValue([{ id: 'DN1', donorId: 'D1', collectedAt: '2026-05-01T00:00:00Z' }]);
    mockDb.components.getAll.mockResolvedValue([{ id: 'CMP1', donationId: 'DN1', type: 'RBC', status: 'TRANSFUSED', abo: 'O', rhd: 'Negative' }]);
    mockDb.labTests.getAll.mockResolvedValue([{ donationId: 'DN1', idmStatus: 'CLEARED' }]);
    mockDb.crossmatch.getAll.mockResolvedValue([]);
    mockDb.issueRecords.getAll.mockResolvedValue([]);
    mockDb.transfusions.getAll.mockResolvedValue([{ id: 'TF1', componentId: 'CMP1', patientId: 'P1', completedAt: '2026-05-03T00:00:00Z' }]);
    mockDb.adverseReactions.getAll.mockResolvedValue([{ id: 'AR1', transfusionId: 'TF1', reactionType: 'AHTR', severity: 'Critical' }]);
    mockDb.patients.getAll.mockResolvedValue([{ id: 'P1', mrn: 'P1', name: 'Alice' }]);
  });

  it('returns a 400 when neither donorId nor unitId is provided', async () => {
    const res = await GET(traceRequest(''));
    expect(res.status).toBe(400);
  });

  it('forward: donorId resolves donations -> units -> recipients with reactions', async () => {
    const res = await GET(traceRequest('?donorId=D1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.direction).toBe('forward');
    expect(body.found).toBe(true);
    expect(body.summary).toMatchObject({ donationCount: 1, unitCount: 1, recipientCount: 1, reactionCount: 1 });
    expect(body.donations[0].units[0].recipients[0]).toMatchObject({ patientId: 'P1', via: 'transfusion' });
  });

  it('backward: unitId resolves to donation and donor', async () => {
    const res = await GET(traceRequest('?unitId=CMP1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.direction).toBe('backward');
    expect(body.donor?.id).toBe('D1');
    expect(body.donation?.id).toBe('DN1');
  });

  it('returns found=false for an unknown donor', async () => {
    const res = await GET(traceRequest('?donorId=NOPE'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.found).toBe(false);
  });
});
