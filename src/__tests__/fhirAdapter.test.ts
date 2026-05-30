import { describe, it, expect } from 'vitest';
import { FhirAdapter } from '../lib/FhirAdapter';

describe('FhirAdapter expanded resources (RTM-FHIR-01)', () => {
  it('maps an Order to a ServiceRequest', () => {
    const r = FhirAdapter.toFhirServiceRequest({
      id: 'O1', status: 'PENDING', priority: 'STAT', patientId: 'P1', hospital: 'HCM #1', clinicalIndication: 'Trauma', submittedAt: '2026-05-29T00:00:00Z',
    }) as Record<string, any>;
    expect(r.resourceType).toBe('ServiceRequest');
    expect(r.priority).toBe('stat');
    expect(r.subject.reference).toBe('Patient/P1');
    expect(r.reasonCode[0].text).toBe('Trauma');
  });

  it('maps a LabTest to a DiagnosticReport with IDM conclusion', () => {
    const r = FhirAdapter.toFhirDiagnosticReport({ id: 'L1', abo: 'O', rhd: 'Positive', idmStatus: 'CLEARED', testedAt: '2026-05-29T01:00:00Z' });
    expect(r.resourceType).toBe('DiagnosticReport');
    expect(r.status).toBe('final');
    expect(r.conclusion).toMatch(/ABO O Rh Positive/);
  });

  it('keeps a pending lab test as registered', () => {
    const r = FhirAdapter.toFhirDiagnosticReport({ id: 'L2', idmStatus: 'PENDING' });
    expect(r.status).toBe('registered');
  });

  it('maps a crossmatch specimen to a Specimen', () => {
    const r = FhirAdapter.toFhirSpecimen({ id: 'XM1', patientId: 'P1', specimenDate: '2026-05-27' }) as Record<string, any>;
    expect(r.resourceType).toBe('Specimen');
    expect(r.collection.collectedDateTime).toBe('2026-05-27');
  });

  it('maps an issue record to a SupplyDelivery', () => {
    const r = FhirAdapter.toFhirSupplyDelivery({ id: 'ISS1', componentId: '=W1234 24 000001', patientId: 'P1', issuedTo: 'Ward 5', issuedAt: '2026-05-29T02:00:00Z' }) as Record<string, any>;
    expect(r.resourceType).toBe('SupplyDelivery');
    expect(r.status).toBe('completed');
    expect(r.suppliedItem.itemReference.reference).toMatch(/^BiologicallyDerivedProduct\//);
  });

  it('marks a returned issue as abandoned', () => {
    const r = FhirAdapter.toFhirSupplyDelivery({ id: 'ISS2', componentId: 'C2', returnedAt: '2026-05-29T03:00:00Z' });
    expect(r.status).toBe('abandoned');
  });

  it('maps a transfusion to a Procedure', () => {
    const r = FhirAdapter.toFhirProcedure({ id: 'T1', patientId: 'P1', componentId: 'C1', startedAt: '2026-05-29T04:00:00Z', completedAt: '2026-05-29T04:30:00Z' }) as Record<string, any>;
    expect(r.resourceType).toBe('Procedure');
    expect(r.status).toBe('completed');
    expect(r.performedPeriod.end).toBe('2026-05-29T04:30:00Z');
  });

  it('maps a severe adverse reaction to a serious AdverseEvent', () => {
    const r = FhirAdapter.toFhirAdverseEvent({ id: 'AR1', patientId: 'P1', transfusionId: 'T1', reactionType: 'Acute Hemolytic', severity: 'Critical', reportedAt: '2026-05-29T05:00:00Z' }) as Record<string, any>;
    expect(r.resourceType).toBe('AdverseEvent');
    expect(r.seriousness.text).toBe('serious');
    expect(r.suspectEntity[0].instance.reference).toBe('Procedure/T1');
  });

  it('maps a mild reaction to non-serious', () => {
    const r = FhirAdapter.toFhirAdverseEvent({ id: 'AR2', severity: 'Low', reactionType: 'Urticaria' }) as Record<string, any>;
    expect(r.seriousness.text).toBe('non-serious');
  });
});
