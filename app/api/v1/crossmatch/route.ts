import { NextResponse } from 'next/server';
import { evaluateComponentCompatibility } from '@/src/lib/bloodSafety';
import * as db from '@/src/server/db';
import { validateSpecimenDate } from '@/src/lib/validators';
import {
  bloodUnitCommandErrorBody,
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, authorizeFacilityScope, facilityIdOf, facilityScopeErrorBody, rbacErrorBody } from '@/src/server/rbacPolicy';
import { resolveOne, byIdIfAvailable } from '@/src/server/repositories/queryHelpers';

export async function GET(request: Request) {
  try {
    const records = await db.crossmatch.getAll();
    return NextResponse.json(records);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'CROSSMATCH_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { componentId, patientId, method, specimenDate, testedBy } = data;
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['HospitalOperator'],
      action: 'CROSSMATCH_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const role = (data.actorRole || data.role || 'HospitalOperator') as Role;

    if (!componentId || !patientId || !method || !specimenDate || !testedBy) {
      return apiErrorResponse({ request, code: 'CROSSMATCH_INVALID_PAYLOAD', message: 'Missing required fields', status: 400 });
    }

    const specimenVal = validateSpecimenDate(specimenDate);
    if (!specimenVal.valid) {
      return apiErrorResponse({ request, code: 'SPECIMEN_DATE_INVALID', message: specimenVal.errors.join(", "), status: 400 });
    }

    // Load Blood Component (targeted lookup; falls back to a scan for test mocks)
    const component = await resolveOne(
      byIdIfAvailable(db.components, 'getById', componentId),
      () => db.components.getAll(),
      (c: any) => c.id === componentId || c.donationId === componentId,
    );

    if (!component) {
      return apiErrorResponse({ request, code: 'COMPONENT_NOT_FOUND', message: 'Blood component not found in system', status: 404 });
    }

    // Resolve the source donation -> donor to read the unit's blood type.
    const donation = await resolveOne(
      byIdIfAvailable(db.donations, 'getById', component.donationId),
      () => db.donations.getAll(),
      (d: any) => d.id === component.donationId,
    );
    const donor = await resolveOne(
      donation ? byIdIfAvailable(db.donors, 'getById', donation.donorId) : null,
      () => db.donors.getAll(),
      (d: any) => d.id === donation?.donorId,
    );

    if (!donor) {
      return apiErrorResponse({ request, code: 'SOURCE_DONOR_NOT_FOUND', message: 'Source donor data not found for component', status: 404 });
    }

    // Load Patient (by id or MRN)
    const patient = await resolveOne(
      byIdIfAvailable(db.patients, 'getById', patientId),
      () => db.patients.getAll(),
      (p: any) => p.id === patientId || p.mrn === patientId,
    );

    if (!patient) {
      return apiErrorResponse({ request, code: 'PATIENT_NOT_FOUND', message: 'Patient not found', status: 404 });
    }

    // ABAC: a crossmatch must be performed within the patient's own facility.
    const scope = authorizeFacilityScope({ decision: authz, resourceOrgId: facilityIdOf(patient) });
    if (!scope.allowed) {
      return NextResponse.json(facilityScopeErrorBody(authz, facilityIdOf(patient)), { status: 403 });
    }

    if (patient.abo === 'Unknown' || patient.rhd === 'Unknown') {
      return apiErrorResponse({ request, code: 'PATIENT_BLOOD_TYPE_UNKNOWN', message: 'Patient blood type is Unknown, cannot crossmatch', status: 400 });
    }

    // RTM-XM-02: the authoritative unit blood type is the TESTED serology
    // (lab_tests for the donation), NOT the donor's registered type. Resolve it
    // via a DB join on donationId, then fall back to the component record, then
    // the donor registration only as a last resort.
    const labTest = await resolveOne(
      byIdIfAvailable(db.labTests, 'getByDonationId', component.donationId),
      () => db.labTests.getAll(),
      (t: any) => t.donationId === component.donationId,
    );

    // Perform Strict Validation — component-class aware (RBC vs plasma vs platelet).
    const unitAbo = labTest?.abo || component.abo || donor.bloodType;
    const unitRhd = labTest?.rhd || component.rhd || donor.rhd;
    const compatibility = evaluateComponentCompatibility({
      componentClass: component.type || component.productCode,
      donorAbo: unitAbo,
      donorRhd: unitRhd,
      patientAbo: patient.abo,
      patientRhd: patient.rhd,
    });
    const isCompatible = compatibility.compatible;
    let result = isCompatible ? 'Compatible' : 'Incompatible';

    const hasAntibodies = patient.antibodyHistory && patient.antibodyHistory.length > 0;

    // AABB SOP 7: Method validations based on antibody history
    if (method === 'EXM' && hasAntibodies) {
      return apiErrorResponse({ request, code: 'EXM_BLOCKED_BY_ANTIBODY_HISTORY', message: 'SAFETY BLOCK: EXM (Electronic Crossmatch) is NOT permitted for patients with a history of antibodies. Full AHG crossmatch is required by AABB standards.', status: 400 });
    }

    if (method === 'IS' && hasAntibodies) {
      return apiErrorResponse({ request, code: 'IMMEDIATE_SPIN_BLOCKED_BY_ANTIBODY_HISTORY', message: 'SAFETY BLOCK: IS (Immediate Spin) is NOT sufficient for patients with known antibodies. Full AHG crossmatch is required.', status: 400 });
    }

    const record = {
      id: `XM-${Math.floor(Math.random() * 900000) + 100000}`,
      componentId,
      patientId: patient.id,
      method,
      result,
      testedBy,
      specimenDate,
      createdAt: new Date().toISOString()
    };

    await db.crossmatch.create(record);

    if (result === 'Compatible') {
      const inventoryItem = await resolveOne(
        byIdIfAvailable(db.inventory, 'getByUnitId', component.id),
        () => db.inventory.getAll(),
        (item: any) => item.unitId === component.id,
      );
      const currentStatus = inventoryItem ? inventoryItem.status : component.status;

      const transitionResult = await executeBloodUnitTransition(
        {
          unitId: component.id,
          currentStatus,
          targetStatus: 'CROSSMATCHED',
          role,
          context: {
            crossmatchResult: result,
            isExpired: isBloodUnitExpired(component.expiryDate),
          },
        },
        authz.actorRole || 'SYSTEM',
        'SERVER',
        'CROSSMATCH_CREATE',
        getRequestId(request)
      );

      if (!transitionResult.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(transitionResult.error!),
            requestId: getRequestId(request),
          },
          { status: transitionResult.httpStatus || 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      result,
      id: record.id,
      category: compatibility.category,
      severity: compatibility.severity,
      requiresReview: compatibility.requiresReview,
      reason: compatibility.reason,
    });
  } catch (error: any) {
    console.error("Crossmatch API Error:", error);
    return internalErrorResponse(request, error, 'CROSSMATCH_CREATE_FAILED');
  }
}
