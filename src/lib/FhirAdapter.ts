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
