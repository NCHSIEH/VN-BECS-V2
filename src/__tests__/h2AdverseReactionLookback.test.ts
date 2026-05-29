import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as reportAdverseReaction } from '../../app/api/v1/adverse-reactions/route';
import { POST as createInventory } from '../../app/api/v1/inventory/route';
import { POST as authLabTest } from '../../app/api/v1/lims/lab-tests/[id]/auth/route';

const mockDb = vi.hoisted(() => ({
  adverse_reactions: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
  auditEvents: {
    create: vi.fn(),
  },
  components: {
    getAll: vi.fn(),
    updateStatus: vi.fn(),
  },
  donations: {
    getAll: vi.fn(),
  },
  inventory: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
  lab_tests: {
    getAll: vi.fn(),
    updateByDonationId: vi.fn(),
  },
  transfusions: {
    getAll: vi.fn(),
  },
  donors: {
    getAll: vi.fn(),
    update: vi.fn(),
  },
  patients: {
    getAll: vi.fn(),
  },
  issueRecords: {
    getAll: vi.fn(),
  },
  orders: {
    getAll: vi.fn(),
  },
  crossmatch: {
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

describe('Slice H2: Hemovigilance & Adverse Reaction Lookback Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.adverse_reactions.create.mockResolvedValue(undefined);
    mockDb.adverse_reactions.getAll.mockResolvedValue([]);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.donations.getAll.mockResolvedValue([]);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.lab_tests.updateByDonationId.mockResolvedValue(undefined);
    mockDb.transfusions.getAll.mockResolvedValue([]);
    mockDb.donors.getAll.mockResolvedValue([]);
    mockDb.donors.update.mockResolvedValue(undefined);
    mockDb.patients.getAll.mockResolvedValue([]);
    mockDb.issueRecords.getAll.mockResolvedValue([]);
    mockDb.orders.getAll.mockResolvedValue([]);
    mockDb.crossmatch.getAll.mockResolvedValue([]);
  });

  // 1. Full clinical entity linkage
  describe('Clinical Entity Linkage', () => {
    it('automatically resolves and links Patient, Component, Order, Issue, and Crossmatch from transfusionId', async () => {
      mockDb.transfusions.getAll.mockResolvedValue([
        { id: 'TF-LINK-01', patientId: 'PAT-123', componentId: 'CMP-LINK-01' }
      ]);
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-LINK-01', donationId: 'DON-LINK-01', patientId: 'PAT-123', status: 'TRANSFUSED' }
      ]);
      mockDb.issueRecords.getAll.mockResolvedValue([
        { id: 'ISSUE-LINK-01', componentId: 'CMP-LINK-01', patientId: 'PAT-123' }
      ]);
      mockDb.orders.getAll.mockResolvedValue([
        { id: 'ORDER-LINK-01', patientId: 'PAT-123', allocatedUnits: '["CMP-LINK-01"]' }
      ]);
      mockDb.crossmatch.getAll.mockResolvedValue([
        { id: 'XM-LINK-01', componentId: 'CMP-LINK-01', patientId: 'PAT-123' }
      ]);

      const response = await reportAdverseReaction(jsonRequest({
        transfusionId: 'TF-LINK-01',
        severity: 'Severe',
        reactionType: 'TRALI',
        actorRole: 'QA_Officer'
      }));

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.patientId).toBe('PAT-123');
      expect(body.componentId).toBe('CMP-LINK-01');
      expect(body.orderId).toBe('ORDER-LINK-01');
      expect(body.issueRecordId).toBe('ISSUE-LINK-01');
      expect(body.crossmatchId).toBe('XM-LINK-01');
    });
  });

  // 2. Lookback trigger and donor deferral
  describe('Serious reactions, lookback triggers, and donor deferral', () => {
    it('triggers lookback and 6-month active deferral for serious transfusion reaction (TRALI)', async () => {
      mockDb.transfusions.getAll.mockResolvedValue([
        { id: 'TF-SERIOUS-01', componentId: 'CMP-SERIOUS-01' }
      ]);
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-SERIOUS-01', donationId: 'DON-SERIOUS-01', status: 'TRANSFUSED' },
        { id: 'CMP-SERIOUS-CO', donationId: 'DON-SERIOUS-01', status: 'AVAILABLE' }
      ]);
      mockDb.donations.getAll.mockResolvedValue([
        { id: 'DON-SERIOUS-01', donorId: 'DONOR-SERIOUS-01' }
      ]);
      mockDb.donors.getAll.mockResolvedValue([
        { id: 'DONOR-SERIOUS-01', name: 'Le Van A', deferralStatus: 'None' }
      ]);

      const response = await reportAdverseReaction(jsonRequest({
        transfusionId: 'TF-SERIOUS-01',
        severity: 'Serious',
        reactionType: 'TRALI',
        actorRole: 'QA_Officer'
      }));

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.lookbackTriggered).toBe(1);
      
      // Verify donor deferred for 6 months (approx 180 days)
      expect(mockDb.donors.update).toHaveBeenCalledWith('DONOR-SERIOUS-01', expect.objectContaining({
        deferralStatus: 'Active',
        deferralReason: expect.stringContaining('HEMOVIGILANCE LOOKBACK')
      }));

      // Verify donor update deferralUntil is set to a future date
      const callArgs = mockDb.donors.update.mock.calls[0][1];
      const deferralUntil = new Date(callArgs.deferralUntil).getTime();
      expect(deferralUntil).toBeGreaterThan(Date.now());
      
      // Verify co-component was auto-quarantined
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-SERIOUS-CO', 'QUARANTINE');
      expect(body.quarantinedComponents).toContain('CMP-SERIOUS-CO');
    });

    it('does not trigger lookback or deferral for a mild reaction', async () => {
      mockDb.transfusions.getAll.mockResolvedValue([
        { id: 'TF-MILD-01', componentId: 'CMP-MILD-01' }
      ]);
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-MILD-01', donationId: 'DON-MILD-01', status: 'TRANSFUSED' },
        { id: 'CMP-MILD-CO', donationId: 'DON-MILD-01', status: 'AVAILABLE' }
      ]);
      mockDb.donations.getAll.mockResolvedValue([
        { id: 'DON-MILD-01', donorId: 'DONOR-MILD-01' }
      ]);
      mockDb.donors.getAll.mockResolvedValue([
        { id: 'DONOR-MILD-01', name: 'Le Van B', deferralStatus: 'None' }
      ]);

      const response = await reportAdverseReaction(jsonRequest({
        transfusionId: 'TF-MILD-01',
        severity: 'Mild',
        reactionType: 'Febrile Non-Hemolytic',
        actorRole: 'QA_Officer'
      }));

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.lookbackTriggered).toBe(0);
      expect(body.quarantinedComponents).toEqual([]);
      
      // Verify donor was NOT deferred
      expect(mockDb.donors.update).not.toHaveBeenCalled();
      expect(mockDb.components.updateStatus).not.toHaveBeenCalledWith('CMP-MILD-CO', 'QUARANTINE');
    });
  });

  // 3. State Machine Guard preventing lookback release
  describe('Lookback State Machine Guards', () => {
    it('blocks manual release of quarantined units via inventory endpoint if under active lookback', async () => {
      // Mock existing inventory unit in QUARANTINE
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-LOCK-01', status: 'QUARANTINE', expiryDate: '2027-01-01T00:00:00Z' }
      ]);
      // Mock active lookback for this unit
      mockDb.adverse_reactions.getAll.mockResolvedValue([
        { id: 'AR-LOCK-01', componentId: 'CMP-LOCK-01', lookbackTriggered: 1 }
      ]);
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-LOCK-01', donationId: 'DON-LOCK-01', status: 'QUARANTINE' }
      ]);

      // Try to release CMP-LOCK-01 from QUARANTINE to AVAILABLE
      const response = await createInventory(jsonRequest({
        unitId: 'CMP-LOCK-01',
        status: 'AVAILABLE',
        role: 'Admin'
      }));

      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('TRANSITION_BLOCKED');
      expect(body.error).toContain('active Hemovigilance Lookback investigation');
      expect(mockDb.inventory.create).not.toHaveBeenCalled();
    });

    it('blocks clearing LIMS lab tests retrospectively if under active lookback', async () => {
      // Mock components for DON-LOCK-02 in QUARANTINE
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-LOCK-02', donationId: 'DON-LOCK-02', status: 'QUARANTINE' }
      ]);
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-LOCK-02', status: 'QUARANTINE' }
      ]);
      // Mock active lookback for this unit
      mockDb.adverse_reactions.getAll.mockResolvedValue([
        { id: 'AR-LOCK-02', componentId: 'CMP-LOCK-02', lookbackTriggered: 1 }
      ]);

      // Try to clear lab test for DON-LOCK-02 (would trigger QUARANTINE -> AVAILABLE)
      const response = await authLabTest(jsonRequest({
        action: 'clear',
        role: 'Admin'
      }), { params: Promise.resolve({ id: 'DON-LOCK-02' }) });

      const body = await response.json();
      expect(response.status).toBe(200); // Route returns 200 but records audit log for review and does not update status

      // Verify that components and inventory were NOT updated to AVAILABLE
      expect(mockDb.components.updateStatus).not.toHaveBeenCalledWith('CMP-LOCK-02', 'AVAILABLE');
      expect(mockDb.inventory.create).not.toHaveBeenCalled();

      // Verify that audit log was written flagging HEMOVIGILANCE_QUARANTINE_REVIEW_REQUIRED
      expect(mockDb.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'HEMOVIGILANCE_QUARANTINE_REVIEW_REQUIRED',
        objectId: 'CMP-LOCK-02',
        details: expect.stringContaining('active Hemovigilance Lookback')
      }));
    });
  });
});
