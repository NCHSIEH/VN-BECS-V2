import { describe, expect, it } from 'vitest';
import {
  traceDonorToRecipients,
  traceUnitToDonor,
  type TraceData,
} from '../server/services/traceability';

const data: TraceData = {
  donors: [{ id: 'D1', name: 'Tran Minh Anh', nationalId: '001095001234', bloodType: 'O', rhd: 'Negative' }],
  donations: [{ id: 'DN1', donorId: 'D1', collectedAt: '2026-05-01T08:00:00Z', volume: 350, donationType: 'WholeBlood' }],
  components: [
    { id: 'CMP1', donationId: 'DN1', productCode: 'P-RBC-01', type: 'RBC', status: 'TRANSFUSED', abo: 'O', rhd: 'Negative' },
    { id: 'CMP2', donationId: 'DN1', productCode: 'P-FFP-02', type: 'FFP', status: 'ISSUED', abo: 'O', rhd: 'Negative' },
  ],
  labTests: [{ id: 'TST1', donationId: 'DN1', idmStatus: 'CLEARED' }],
  crossmatch: [{ id: 'XM1', componentId: 'CMP1', patientId: 'P1', result: 'Compatible' }],
  issueRecords: [{ id: 'ISS1', componentId: 'CMP2', patientId: 'P2', issuedAt: '2026-05-03T10:00:00Z' }],
  transfusions: [{ id: 'TF1', componentId: 'CMP1', patientId: 'P1', status: 'COMPLETED', completedAt: '2026-05-03T11:00:00Z' }],
  adverseReactions: [{ id: 'AR1', transfusionId: 'TF1', patientId: 'P1', reactionType: 'AHTR', severity: 'Critical' }],
  patients: [
    { id: 'P1', mrn: 'P1', name: 'Alice', abo: 'O', rhd: 'Negative' },
    { id: 'P2', mrn: 'P2', name: 'Bob', abo: 'O', rhd: 'Negative' },
  ],
};

describe('traceDonorToRecipients (forward / lookback)', () => {
  it('enumerates donations, units, recipients and reactions', () => {
    const r = traceDonorToRecipients('D1', data);
    expect(r.found).toBe(true);
    expect(r.donor?.nationalId).toBe('001095001234');
    expect(r.summary).toEqual({ donationCount: 1, unitCount: 2, recipientCount: 2, reactionCount: 1 });

    const units = r.donations[0].units;
    const cmp1 = units.find(u => u.componentId === 'CMP1')!;
    expect(cmp1.idmStatus).toBe('CLEARED');
    // transfusion recipient with the reaction; crossmatch to the same patient is de-duplicated
    expect(cmp1.recipients).toHaveLength(1);
    expect(cmp1.recipients[0]).toMatchObject({ patientId: 'P1', via: 'transfusion', patientName: 'Alice' });
    expect(cmp1.recipients[0].reactions[0]).toMatchObject({ id: 'AR1', reactionType: 'AHTR', severity: 'Critical' });

    const cmp2 = units.find(u => u.componentId === 'CMP2')!;
    expect(cmp2.recipients[0]).toMatchObject({ patientId: 'P2', via: 'issue' });
  });

  it('resolves a donor by nationalId too', () => {
    expect(traceDonorToRecipients('001095001234', data).found).toBe(true);
  });

  it('returns found=false for an unknown donor', () => {
    const r = traceDonorToRecipients('NOPE', data);
    expect(r.found).toBe(false);
    expect(r.donations).toEqual([]);
  });
});

describe('traceUnitToDonor (backward / investigation)', () => {
  it('traces a component back to its donation and donor', () => {
    const r = traceUnitToDonor('CMP1', data);
    expect(r.found).toBe(true);
    expect(r.donation?.id).toBe('DN1');
    expect(r.donor?.id).toBe('D1');
    expect(r.unit?.recipients[0].patientId).toBe('P1');
  });

  it('returns found=false for an unknown unit', () => {
    expect(traceUnitToDonor('NOPE', data).found).toBe(false);
  });
});
