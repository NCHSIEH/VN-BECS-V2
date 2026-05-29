import { Patient, BloodComponent, InventoryUnit } from '../types';

/**
 * FhirAdapter Utility
 * Converts VN-BBMS internal models to HL7 FHIR (R4/R5) compliant JSON resources.
 * This ensures the system can integrate with international HIS/LIS providers.
 */
export const FhirAdapter = {
  /**
   * Convert Patient to FHIR Patient resource
   */
  toFhirPatient(patient: Patient): any {
    return {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          use: 'official',
          type: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
          },
          system: 'http://hospital.vn/mrn',
          value: patient.mrn
        }
      ],
      name: [
        {
          text: patient.name
        }
      ],
      extension: [
        {
          url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-type',
          valueCodeableConcept: {
            text: `${patient.abo} ${patient.rhd}`
          }
        },
        {
          url: 'http://hospital.vn/fhir/StructureDefinition/antibody-history',
          valueString: (patient.antibodyHistory || []).join(', ')
        }
      ]
    };
  },

  /**
   * Convert InventoryUnit to FHIR BiologicallyDerivedProduct
   */
  toFhirProduct(unit: InventoryUnit): any {
    return {
      resourceType: 'BiologicallyDerivedProduct',
      id: unit.unitId.replace(/[^a-zA-Z0-9]/g, '-'),
      identifier: [
        {
          system: 'https://www.isbt128.org',
          value: unit.unitId
        }
      ],
      productCategory: 'biological',
      productCode: {
        coding: [
          {
            system: 'https://www.isbt128.org/product-codes',
            code: unit.productCode
          }
        ]
      },
      status: unit.status === 'AVAILABLE' ? 'available' : 'unavailable',
      expirationDate: unit.expiryDate,
      extension: [
        {
          url: 'http://hospital.vn/fhir/StructureDefinition/blood-group',
          valueCodeableConcept: {
            text: `${unit.abo} ${unit.rhd}`
          }
        }
      ]
    };
  },

  /**
   * Convert a blood Order to a FHIR ServiceRequest (RTM-FHIR-01).
   */
  toFhirServiceRequest(order: any): any {
    return {
      resourceType: 'ServiceRequest',
      id: order.id,
      status: order.status === 'COMPLETED' ? 'completed' : 'active',
      intent: 'order',
      priority: ({ Routine: 'routine', ASAP: 'asap', STAT: 'stat', MTP: 'stat' } as any)[order.priority] || 'routine',
      code: { text: 'Blood component request' },
      subject: order.patientId ? { reference: `Patient/${order.patientId}` } : undefined,
      requester: order.hospital ? { display: order.hospital } : undefined,
      reasonCode: order.clinicalIndication ? [{ text: order.clinicalIndication }] : undefined,
      authoredOn: order.submittedAt || undefined,
    };
  },

  /**
   * Convert a crossmatch/donation specimen reference to a FHIR Specimen.
   */
  toFhirSpecimen(record: any): any {
    return {
      resourceType: 'Specimen',
      id: record.id,
      type: { text: record.specimenType || 'Blood specimen' },
      subject: record.patientId ? { reference: `Patient/${record.patientId}` } : undefined,
      collection: record.specimenDate ? { collectedDateTime: record.specimenDate } : undefined,
    };
  },

  /**
   * Convert a LabTest (IDM / ABO-Rh) to a FHIR DiagnosticReport.
   */
  toFhirDiagnosticReport(labTest: any): any {
    const idmCode = labTest.idmStatus === 'CLEARED' ? 'negative' : labTest.idmStatus === 'REACTIVE' ? 'positive' : 'pending';
    return {
      resourceType: 'DiagnosticReport',
      id: labTest.id,
      status: labTest.idmStatus === 'PENDING' ? 'registered' : 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'IMM' }] }],
      code: { text: 'Infectious disease marker & ABO/Rh typing' },
      effectiveDateTime: labTest.testedAt || undefined,
      conclusion: `ABO ${labTest.abo ?? '?'} Rh ${labTest.rhd ?? '?'}; IDM ${idmCode}`,
      result: [
        { display: `IDM: ${labTest.idmStatus ?? 'UNKNOWN'}` },
        labTest.natResult ? { display: `NAT: ${labTest.natResult}` } : undefined,
        labTest.serologyResult ? { display: `Serology: ${labTest.serologyResult}` } : undefined,
      ].filter(Boolean),
    };
  },

  /**
   * Convert an issue record (unit dispatched/issued) to a FHIR SupplyDelivery.
   */
  toFhirSupplyDelivery(issue: any): any {
    return {
      resourceType: 'SupplyDelivery',
      id: issue.id,
      status: issue.returnedAt ? 'abandoned' : 'completed',
      patient: issue.patientId ? { reference: `Patient/${issue.patientId}` } : undefined,
      suppliedItem: {
        itemReference: { reference: `BiologicallyDerivedProduct/${String(issue.componentId).replace(/[^a-zA-Z0-9]/g, '-')}` },
      },
      occurrenceDateTime: issue.issuedAt || undefined,
      destination: issue.issuedTo ? { display: issue.issuedTo } : undefined,
    };
  },

  /**
   * Convert a transfusion record to a FHIR Procedure.
   */
  toFhirProcedure(transfusion: any): any {
    return {
      resourceType: 'Procedure',
      id: transfusion.id,
      status: transfusion.completedAt ? 'completed' : 'in-progress',
      code: { coding: [{ system: 'http://snomed.info/sct', code: '116859006', display: 'Transfusion of blood product' }] },
      subject: transfusion.patientId ? { reference: `Patient/${transfusion.patientId}` } : undefined,
      performedPeriod: { start: transfusion.startedAt, end: transfusion.completedAt },
      usedReference: transfusion.componentId
        ? [{ reference: `BiologicallyDerivedProduct/${String(transfusion.componentId).replace(/[^a-zA-Z0-9]/g, '-')}` }]
        : undefined,
    };
  },

  /**
   * Convert an adverse reaction to a FHIR AdverseEvent.
   */
  toFhirAdverseEvent(reaction: any): any {
    const sev = String(reaction.severity || '').toLowerCase();
    return {
      resourceType: 'AdverseEvent',
      id: reaction.id,
      actuality: 'actual',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/adverse-event-category', code: 'product-use-error' }] }],
      event: { text: reaction.reactionType || 'Transfusion reaction' },
      subject: reaction.patientId ? { reference: `Patient/${reaction.patientId}` } : undefined,
      date: reaction.reportedAt || undefined,
      seriousness: {
        text: sev.includes('critical') || sev.includes('severe') || sev.includes('high') ? 'serious' : 'non-serious',
      },
      suspectEntity: reaction.transfusionId
        ? [{ instance: { reference: `Procedure/${reaction.transfusionId}` } }]
        : undefined,
      description: reaction.description || undefined,
    };
  },

  /**
   * Mock HIS Sync: Convert FHIR Patient back to internal model
   */
  fromFhirPatient(fhirPatient: any): Partial<Patient> {
    const mrn = fhirPatient.identifier?.find((i: any) => i.system === 'http://hospital.vn/mrn')?.value;
    return {
      id: fhirPatient.id,
      mrn: mrn || fhirPatient.id,
      name: fhirPatient.name?.[0]?.text || 'Unknown Patient',
      // Complex mapping for extensions would go here
    };
  }
};
