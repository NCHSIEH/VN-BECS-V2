import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as processComponent } from '../../app/api/v1/lims/process-component/[id]/route';
import { POST as releaseComponent } from '../../app/api/v1/lims/components/[id]/release/route';
import { POST as reportAdverseReaction } from '../../app/api/v1/adverse-reactions/route';

const mockDb = vi.hoisted(() => ({
  adverse_reactions: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
  auditEvents: {
    create: vi.fn(),
  },
  components: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  donations: {
    getAll: vi.fn(),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
    updateStatusWithLock: vi.fn(),
  },
  lab_tests: {
    getAll: vi.fn(),
  },
  transfusions: {
    getAll: vi.fn(),
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

describe('LIMS and hemovigilance route safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.adverse_reactions.create.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.donations.getAll.mockResolvedValue([]);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.lab_tests.getAll.mockResolvedValue([]);
    mockDb.transfusions.getAll.mockResolvedValue([]);
  });

  it('blocks component processing when IDM is not cleared server-side', async () => {
    mockDb.lab_tests.getAll.mockResolvedValue([
      { donationId: 'DON-1', idmStatus: 'REACTIVE' },
    ]);

    const response = await processComponent(
      jsonRequest(),
      { params: Promise.resolve({ id: 'DON-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('IDM_NOT_CLEARED');
    expect(mockDb.components.create).not.toHaveBeenCalled();
  });

  it('blocks release of expired LIMS components to the hub', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        donationId: 'DON-1',
        productCode: 'WB',
        status: 'AVAILABLE',
        expiryDate: '2020-01-01T00:00:00Z',
      },
    ]);

    const response = await releaseComponent(
      jsonRequest(),
      { params: Promise.resolve({ id: 'CMP-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('TRANSITION_BLOCKED');
    expect(mockDb.components.updateStatus).not.toHaveBeenCalled();
    expect(mockDb.inventory.create).not.toHaveBeenCalled();
  });

  it('releases LIMS components using canonical IN_TRANSIT status', async () => {
    mockDb.components.getAll.mockResolvedValue([
      {
        id: 'CMP-1',
        donationId: 'DON-1',
        productCode: 'WB',
        status: 'AVAILABLE',
        expiryDate: '2027-01-01T00:00:00Z',
        abo: 'O',
        rhd: 'Positive',
      },
    ]);

    const response = await releaseComponent(
      jsonRequest(),
      { params: Promise.resolve({ id: 'CMP-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-1', 'IN_TRANSIT');
    // Component not in inventory → create path should be called (no existing inv item)
    expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
      unitId: 'CMP-1',
      status: 'IN_TRANSIT',
    }));
  });

  it('quarantines eligible co-components and flags terminal units for review', async () => {
    mockDb.transfusions.getAll.mockResolvedValue([
      { id: 'TF-1', componentId: 'CMP-PRIMARY' },
    ]);
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-PRIMARY', donationId: 'DON-1', status: 'TRANSFUSED' },
      { id: 'CMP-CO-1', donationId: 'DON-1', status: 'AVAILABLE' },
      { id: 'CMP-CO-2', donationId: 'DON-1', status: 'TRANSFUSED' },
    ]);

    const response = await reportAdverseReaction(jsonRequest({ transfusionId: 'TF-1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lookbackTriggered).toBe(1);
    expect(body.quarantinedComponents).toEqual(['CMP-CO-1']);
    expect(body.needsReview).toHaveLength(1);
    expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-CO-1', 'QUARANTINE');
    expect(mockDb.components.updateStatus).not.toHaveBeenCalledWith('CMP-CO-2', 'QUARANTINE');
    expect(mockDb.adverse_reactions.create).toHaveBeenCalledWith(expect.objectContaining({
      lookbackNeedsReview: 1,
    }));
  });
});
