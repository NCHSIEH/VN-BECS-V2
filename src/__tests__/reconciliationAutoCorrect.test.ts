import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as autoCorrectReport } from '../../app/api/v1/reconciliation/[id]/autocorrect/route';

const mockDb = vi.hoisted(() => ({
  auditEvents: {
    create: vi.fn(),
  },
  inventory: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  components: {
    getAll: vi.fn(),
    update: vi.fn(),
  },
  reconciliation_reports: {
    getAll: vi.fn(),
    clearConflicts: vi.fn(),
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

describe('Reconciliation Auto-Correction API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.update.mockResolvedValue(undefined);
    mockDb.reconciliation_reports.getAll.mockResolvedValue([]);
    mockDb.reconciliation_reports.clearConflicts.mockResolvedValue(undefined);
  });

  it('corrects diverse conflicts and resolves the report', async () => {
    // 1. Setup mock data
    const mockReport = {
      id: 'REC-1',
      hospitalId: 'HOSP-HCM-02',
      conflicts: JSON.stringify([
        'CMP-EXPIRED: expired while AVAILABLE',
        'CMP-UNKNOWN: unknown status INVALID_STATUS',
        'CMP-NOVERSION: missing optimistic-lock version',
        'CMP-NOLOC: missing facility/location'
      ])
    };

    const mockInventory = [
      { unitId: 'CMP-EXPIRED', status: 'AVAILABLE', expiryDate: '2020-01-01T00:00:00.000Z', version: 1 },
      { unitId: 'CMP-UNKNOWN', status: 'INVALID_STATUS', expiryDate: '2030-01-01T00:00:00.000Z', version: 2 },
      { unitId: 'CMP-NOVERSION', status: 'AVAILABLE', expiryDate: '2030-01-01T00:00:00.000Z' }, // no version
      { unitId: 'CMP-NOLOC', status: 'AVAILABLE', expiryDate: '2030-01-01T00:00:00.000Z', version: 4 } // no location
    ];

    const mockComponents = [
      { id: 'CMP-EXPIRED', componentId: 'CMP-EXPIRED', status: 'AVAILABLE' },
      { id: 'CMP-UNKNOWN', componentId: 'CMP-UNKNOWN', status: 'INVALID_STATUS' }
    ];

    mockDb.reconciliation_reports.getAll.mockResolvedValue([mockReport]);
    mockDb.inventory.getAll.mockResolvedValue(mockInventory);
    mockDb.components.getAll.mockResolvedValue(mockComponents);

    // 2. Call endpoint
    const response = await autoCorrectReport(
      jsonRequest({ resolvedBy: 'System Auto-Correction', actorRole: 'Manager' }),
      { params: Promise.resolve({ id: 'REC-1' }) }
    );
    const body = await response.json();

    // 3. Assertions
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.correctedCount).toBe(4);

    // Verify inventory corrections
    // CMP-EXPIRED -> DISCARDED
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-EXPIRED',
      status: 'DISCARDED'
    }));
    // CMP-UNKNOWN -> AVAILABLE (not expired)
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-UNKNOWN',
      status: 'AVAILABLE'
    }));
    // CMP-NOVERSION -> version initialized to 1
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-NOVERSION',
      version: 1
    }));
    // CMP-NOLOC -> location and hospitalId filled
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-NOLOC',
      location: 'TEMP-FRIDGE-01',
      hospitalId: 'HOSP-HCM-02'
    }));

    // Verify component corrections sync
    expect(mockDb.components.update).toHaveBeenCalledWith('CMP-EXPIRED', { status: 'DISCARDED' });
    expect(mockDb.components.update).toHaveBeenCalledWith('CMP-UNKNOWN', { status: 'AVAILABLE' });

    // Verify report got conflicts cleared and resolved
    expect(mockDb.reconciliation_reports.clearConflicts).toHaveBeenCalledWith('REC-1', 'System Auto-Correction');
    expect(mockDb.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'DAILY_RECONCILIATION_RESOLVED',
      objectId: 'REC-1'
    }));
  });

  it('returns 404 when report not found', async () => {
    const response = await autoCorrectReport(
      jsonRequest({}),
      { params: Promise.resolve({ id: 'REC-MISSING' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('RECONCILIATION_NOT_FOUND');
  });
});
