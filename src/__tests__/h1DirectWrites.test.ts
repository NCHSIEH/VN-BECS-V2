import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as createInventory } from '../../app/api/v1/inventory/route';
import { POST as reportAdverseReaction } from '../../app/api/v1/adverse-reactions/route';
import { POST as authLabTest } from '../../app/api/v1/lims/lab-tests/[id]/auth/route';
import { POST as runLabTest } from '../../app/api/v1/lims/lab-tests/[id]/run/route';
import { POST as issueMtp } from '../../app/api/v1/mtp-cases/[id]/issue/route';
import { POST as mobilizeRareDonor } from '../../app/api/v1/rare-donors/[id]/mobilize/route';

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
    updateStatusWithLock: vi.fn(),
  },
  lab_tests: {
    getAll: vi.fn(),
    updateByDonationId: vi.fn(),
  },
  transfusions: {
    getAll: vi.fn(),
  },
  mtpCases: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  rareDonors: {
    getById: vi.fn(),
    update: vi.fn(),
  },
  donors: {
    getAll: vi.fn(),
  },
  patients: {
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

describe('Slice H1 Safe Status Write and Safeguard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.adverse_reactions.create.mockResolvedValue(undefined);
    mockDb.auditEvents.create.mockResolvedValue(undefined);
    mockDb.components.getAll.mockResolvedValue([]);
    mockDb.components.updateStatus.mockResolvedValue(undefined);
    mockDb.donations.getAll.mockResolvedValue([]);
    mockDb.inventory.create.mockResolvedValue(undefined);
    mockDb.inventory.updateStatusWithLock.mockResolvedValue(undefined);
    mockDb.inventory.getAll.mockResolvedValue([]);
    mockDb.lab_tests.updateByDonationId.mockResolvedValue(undefined);
    mockDb.transfusions.getAll.mockResolvedValue([]);
    mockDb.mtpCases.getById.mockResolvedValue(null);
    mockDb.mtpCases.update.mockResolvedValue(undefined);
    mockDb.rareDonors.getById.mockResolvedValue(null);
    mockDb.rareDonors.update.mockResolvedValue(undefined);
    mockDb.donors.getAll.mockResolvedValue([]);
    mockDb.patients.getAll.mockResolvedValue([]);
  });

  // 1. Inventory route validation
  describe('Inventory status transition validations', () => {
    it('rejects inventory creation if unitId is missing', async () => {
      const response = await createInventory(jsonRequest({ status: 'AVAILABLE' }));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('INVENTORY_UNIT_ID_MISSING');
    });

    it('rejects status change if transition is invalid under the state machine', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-INV-1', status: 'ISSUED', expiryDate: '2027-01-01T00:00:00Z' }
      ]);

      // ISSUED to AVAILABLE is invalid
      const response = await createInventory(jsonRequest({
        unitId: 'CMP-INV-1',
        status: 'AVAILABLE',
        role: 'HospitalOperator'
      }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.code).toBe('TRANSITION_BLOCKED');
      expect(mockDb.inventory.create).not.toHaveBeenCalled();
    });

    it('allows valid status transitions and updates both inventory and component', async () => {
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-INV-2', status: 'AVAILABLE', expiryDate: '2027-01-01T00:00:00Z' }
      ]);

      // AVAILABLE to RESERVED is valid for HospitalOperator
      const response = await createInventory(jsonRequest({
        unitId: 'CMP-INV-2',
        status: 'RESERVED',
        role: 'HospitalOperator',
        orderApproved: true
      }));

      expect(response.status).toBe(200);
      // Inventory item EXISTS → should call updateStatusWithLock (or fall back to create)
      const calledCreate = mockDb.inventory.create.mock.calls.some(
        (c: any) => c[0]?.unitId === 'CMP-INV-2' && c[0]?.status === 'RESERVED'
      );
      const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
        (c: any) => c[0] === 'CMP-INV-2'
      );
      expect(calledCreate || calledLock).toBe(true);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-INV-2', 'RESERVED');
    });
  });

  // 2. Adverse Reaction looking up and quarantining in both tables
  describe('Adverse reaction lookback and quarantine cascading', () => {
    it('quarantines co-components in both components and inventory tables', async () => {
      mockDb.transfusions.getAll.mockResolvedValue([
        { id: 'TF-REACT', componentId: 'CMP-PRIMARY' }
      ]);
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-PRIMARY', donationId: 'DONATION-AB', status: 'TRANSFUSED' },
        { id: 'CMP-CO-IN-LIMS', donationId: 'DONATION-AB', status: 'AVAILABLE' },
        { id: 'CMP-CO-IN-INV', donationId: 'DONATION-AB', status: 'AVAILABLE' }
      ]);
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-CO-IN-INV', status: 'AVAILABLE' }
      ]);

      const response = await reportAdverseReaction(jsonRequest({
        transfusionId: 'TF-REACT',
        role: 'QA_Officer'
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.quarantinedComponents).toContain('CMP-CO-IN-LIMS');
      expect(body.quarantinedComponents).toContain('CMP-CO-IN-INV');
      
      // Verifies updateStatus was called for both LIMS components
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-CO-IN-LIMS', 'QUARANTINE');
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-CO-IN-INV', 'QUARANTINE');
      
      // Verifies inventory table was also updated for the one in inventory
      // (via updateStatusWithLock if available, otherwise via create fallback)
      const calledCreate = mockDb.inventory.create.mock.calls.some(
        (c: any) => c[0]?.unitId === 'CMP-CO-IN-INV' && c[0]?.status === 'QUARANTINE'
      );
      const calledLock = mockDb.inventory.updateStatusWithLock.mock.calls.some(
        (c: any) => c[0] === 'CMP-CO-IN-INV'
      );
      expect(calledCreate || calledLock).toBe(true);
    });
  });

  // 3. LIMS IDM Lab Test auth cascading
  describe('LIMS Lab Test Auth cascading', () => {
    it('retrospectively quarantines and discards components upon reactive/quarantined results', async () => {
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-LIMS-A', donationId: 'DONATION-XYZ', status: 'QUARANTINE' },
        { id: 'CMP-INV-B', donationId: 'DONATION-XYZ', status: 'AVAILABLE' }
      ]);
      mockDb.inventory.getAll.mockResolvedValue([
        { unitId: 'CMP-INV-B', status: 'AVAILABLE' }
      ]);

      const response = await authLabTest(jsonRequest({
        action: 'quarantine',
        role: 'Admin'
      }), { params: Promise.resolve({ id: 'DONATION-XYZ' }) });

      expect(response.status).toBe(200);

      // QUARANTINE -> DISCARDED because donation was reactive
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-LIMS-A', 'DISCARDED');
      
      // AVAILABLE -> QUARANTINE
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-INV-B', 'QUARANTINE');
      expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
        unitId: 'CMP-INV-B',
        status: 'QUARANTINE'
      }));
    });

    it('transitions waiting quarantined components to AVAILABLE upon lab clearance', async () => {
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-WAITING', donationId: 'DONATION-XYZ', status: 'QUARANTINE' }
      ]);

      const response = await authLabTest(jsonRequest({
        action: 'clear',
        role: 'Admin'
      }), { params: Promise.resolve({ id: 'DONATION-XYZ' }) });

      expect(response.status).toBe(200);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-WAITING', 'AVAILABLE');
    });
  });

  // 4. LIMS IDM Lab Test run cascading
  describe('LIMS Lab Test Run cascading', () => {
    it('cascades reactive results retrospectively to components and inventory', async () => {
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-RUN-1', donationId: 'DONATION-RUN', status: 'QUARANTINE' }
      ]);

      const response = await runLabTest(jsonRequest({
        status: 'REACTIVE',
        role: 'Admin'
      }), { params: Promise.resolve({ id: 'DONATION-RUN' }) });

      expect(response.status).toBe(200);
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-RUN-1', 'DISCARDED');
    });
  });

  // 5. MTP Emergency uncrossmatched issue route
  describe('MTP Emergency uncrossmatched issue validations', () => {
    it('updates MTP case and transitions supplied component to ISSUED under Break-Glass SOP 10', async () => {
      mockDb.mtpCases.getById.mockResolvedValue({
        id: 'MTP-CASE-1',
        unitsIssued: 2,
        currentRound: 1,
        unitsTarget: 18,
        authorizedClinician: 'Dr. Emergency',
        clinicalScenario: 'Massive haemorrhage - trauma',
      });
      mockDb.mtpCases.update.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
      mockDb.components.getAll.mockResolvedValue([
        { id: 'CMP-MTP-1', status: 'AVAILABLE', productCode: 'WB', expiryDate: '2027-01-01T00:00:00Z' }
      ]);

      const response = await issueMtp(jsonRequest({
        componentId: 'CMP-MTP-1',
        role: 'Nurse'
      }), { params: { id: 'MTP-CASE-1' } });

      expect(response.status).toBe(200);

      // Verify the state machine was used and component is marked ISSUED
      expect(mockDb.components.updateStatus).toHaveBeenCalledWith('CMP-MTP-1', 'ISSUED');
      
      // Verify inventory record was created as ISSUED (no existing inv item → create path)
      expect(mockDb.inventory.create).toHaveBeenCalledWith(expect.objectContaining({
        unitId: 'CMP-MTP-1',
        status: 'ISSUED'
      }));

      // Verify MTP case numbers were updated
      expect(mockDb.mtpCases.update).toHaveBeenCalledWith('MTP-CASE-1', expect.objectContaining({
        unitsIssued: 3
      }));
    });
  });

  // 6. Rare donor mobilization safeguard
  describe('Rare donor mobilization safeguards', () => {
    it('blocks mobilization if the rare donor is deferred', async () => {
      mockDb.rareDonors.getById.mockResolvedValue({
        id: 'RD-01',
        name: 'Nguyen Tieu Long',
        nationalId: '001099008877',
        status: 'Deferred'
      });

      const response = await mobilizeRareDonor(jsonRequest(), { params: { id: 'RD-01' } });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.code).toBe('RARE_DONOR_DEFERRED');
      expect(mockDb.rareDonors.update).not.toHaveBeenCalled();
    });

    it('blocks mobilization if the donor is deferred in the general donor database', async () => {
      mockDb.rareDonors.getById.mockResolvedValue({
        id: 'RD-01',
        name: 'Nguyen Tieu Long',
        nationalId: '001099008877',
        status: 'Available'
      });
      mockDb.donors.getAll.mockResolvedValue([
        { nationalId: '001099008877', deferralStatus: 'Active' }
      ]);

      const response = await mobilizeRareDonor(jsonRequest(), { params: { id: 'RD-01' } });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.code).toBe('RARE_DONOR_DEFERRED');
      expect(mockDb.rareDonors.update).not.toHaveBeenCalled();
    });

    it('allows mobilization if rare donor is not deferred', async () => {
      mockDb.rareDonors.getById.mockResolvedValue({
        id: 'RD-01',
        name: 'Nguyen Tieu Long',
        nationalId: '001099008877',
        status: 'Available'
      });
      mockDb.donors.getAll.mockResolvedValue([
        { nationalId: '001099008877', deferralStatus: 'None' }
      ]);
      mockDb.rareDonors.update.mockResolvedValue({ id: 'RD-01', status: 'MOBILIZED' });

      const response = await mobilizeRareDonor(jsonRequest(), { params: { id: 'RD-01' } });
      expect(response.status).toBe(200);
      expect(mockDb.rareDonors.update).toHaveBeenCalledWith('RD-01', { status: 'MOBILIZED' });
    });
  });
});
