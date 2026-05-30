import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateDailyReconciliationReports } from '../server/services/reconciliation';
import { GET as listReports } from '../../app/api/v1/reconciliation/route';
import { POST as generateReports } from '../../app/api/v1/reconciliation/generate/route';
import { POST as resolveReport } from '../../app/api/v1/reconciliation/[id]/resolve/route';

const mockDb = vi.hoisted(() => ({
  auditEvents: {
    create: vi.fn(),
  },
  inventory: {
    getAll: vi.fn(),
  },
  reconciliation_reports: {
    create: vi.fn(),
    getAll: vi.fn(),
    resolve: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function jsonRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('reconciliation reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.reconciliation_reports.create.mockResolvedValue(undefined);
    mockDb.reconciliation_reports.getAll.mockResolvedValue([]);
    mockDb.reconciliation_reports.resolve.mockResolvedValue(undefined);
  });

  it('generates daily reports from active facility inventory and flags conflicts', () => {
    const reports = generateDailyReconciliationReports({
      date: '2026-05-27',
      now: new Date('2026-05-27T12:00:00.000Z'),
      inventory: [
        {
          unitId: 'CMP-1',
          status: 'RECEIVED',
          location: 'HOSP-HCM-02',
          expiryDate: '2026-06-01T00:00:00.000Z',
          version: 3,
        },
        {
          unitId: 'CMP-2',
          status: 'AVAILABLE',
          location: 'HOSP-HCM-02',
          expiryDate: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      id: 'REC-2026-05-27-HOSP-HCM-02',
      hospitalId: 'HOSP-HCM-02',
      borrowedUnits: ['CMP-1', 'CMP-2'],
    });
    expect(reports[0].conflicts).toEqual([
      'CMP-2: expired while AVAILABLE',
      'CMP-2: missing optimistic-lock version',
    ]);
  });

  it('lists existing reports for the reconciliation view', async () => {
    mockDb.reconciliation_reports.getAll.mockResolvedValue([{ id: 'REC-1' }]);

    const response = await listReports(new Request('http://localhost/api/v1/reconciliation'));
    const body = await response.json();

    expect(body).toEqual([{ id: 'REC-1' }]);
  });

  it('creates reports and audit events from the generate endpoint', async () => {
    mockDb.inventory.getAll.mockResolvedValue([
      {
        unitId: 'CMP-1',
        status: 'RECEIVED',
        location: 'HOSP-HCM-02',
        expiryDate: '2026-06-01T00:00:00.000Z',
        version: 3,
      },
    ]);

    const response = await generateReports(new Request('http://localhost/api/v1/reconciliation/generate', { method: 'POST' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reports).toHaveLength(1);
    expect(mockDb.reconciliation_reports.create).toHaveBeenCalledTimes(1);
    expect(mockDb.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'DAILY_RECONCILIATION_GENERATED',
    }));
  });

  it('resolves an existing report and audits the resolution', async () => {
    mockDb.reconciliation_reports.getAll.mockResolvedValue([{ id: 'REC-1' }]);

    const response = await resolveReport(
      jsonRequest({ resolvedBy: 'Manager Nguyen', actorRole: 'Manager' }),
      { params: Promise.resolve({ id: 'REC-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, id: 'REC-1', resolvedBy: 'Manager Nguyen' });
    expect(mockDb.reconciliation_reports.resolve).toHaveBeenCalledWith('REC-1', 'Manager Nguyen');
    expect(mockDb.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'DAILY_RECONCILIATION_RESOLVED',
      actorRole: 'Manager',
    }));
  });

  it('returns 404 when resolving a missing report', async () => {
    const response = await resolveReport(
      jsonRequest({ resolvedBy: 'Manager Nguyen' }),
      { params: Promise.resolve({ id: 'REC-MISSING' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('RECONCILIATION_NOT_FOUND');
  });
});
