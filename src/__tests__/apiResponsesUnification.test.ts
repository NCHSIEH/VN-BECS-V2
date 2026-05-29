import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST as processComponentPost } from '../../app/api/v1/lims/process-component/[id]/route';
import { POST as componentReleasePost } from '../../app/api/v1/lims/components/[id]/release/route';

const mockDb = vi.hoisted(() => ({
  components: {
    getAll: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
  donations: {
    getAll: vi.fn(),
  },
  lab_tests: {
    getAll: vi.fn(),
  },
  inventory: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  adverse_reactions: {
    getAll: vi.fn(),
  },
  auditEvents: {
    create: vi.fn(),
  },
}));

vi.mock('@/src/server/db', () => mockDb);

function testRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'REQ-UNIFY-TEST-1',
    },
    body: JSON.stringify(body),
  });
}

describe('API Error Responses Unification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.donations.getAll.mockResolvedValue([]);
    mockDb.lab_tests.getAll.mockResolvedValue([]);
    mockDb.adverse_reactions.getAll.mockResolvedValue([]);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
  });

  it('unifies transition blocked error response in process-component route', async () => {
    // Donation exists but IDM status is CLEARED (so it goes to lookback check / evaluate transition)
    mockDb.donations.getAll.mockResolvedValue([
      { id: 'DON-TEST-1', idmStatus: 'CLEARED' }
    ]);
    mockDb.lab_tests.getAll.mockResolvedValue([
      { donationId: 'DON-TEST-1', idmStatus: 'CLEARED' }
    ]);

    // Setup an adverse reaction that triggers a lookback quarantine hold
    mockDb.adverse_reactions.getAll.mockResolvedValue([
      { id: 'AR-1', donationId: 'DON-TEST-1', lookbackTriggered: 1 }
    ]);

    const params = Promise.resolve({ id: 'DON-TEST-1' });
    const response = await processComponentPost(testRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: 'TRANSITION_BLOCKED',
      code: 'TRANSITION_BLOCKED',
      requestId: 'REQ-UNIFY-TEST-1',
    });
    expect(body.message).toContain('investigation');
  });

  it('unifies transition blocked error response in component release route', async () => {
    mockDb.components.getAll.mockResolvedValue([
      { id: 'CMP-TEST-1', status: 'TRANSFUSED', expiryDate: '2027-01-01T00:00:00Z' }
    ]);

    const params = Promise.resolve({ id: 'CMP-TEST-1' });
    const response = await componentReleasePost(testRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: 'TRANSITION_BLOCKED',
      code: 'TRANSITION_BLOCKED',
      requestId: 'REQ-UNIFY-TEST-1',
    });
    expect(body.message).toContain('Cannot transition from terminal state');
  });
});
