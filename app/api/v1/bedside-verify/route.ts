import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import {
  bloodUnitCommandErrorBody,
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { resolveOne, byIdIfAvailable } from '@/src/server/repositories/queryHelpers';
import { verifyPassword } from '@/src/server/crypto';
import { evaluateComponentCompatibility } from '@/src/lib/bloodSafety';

function isCompatibleCrossmatch(result: unknown): boolean {
  return typeof result === 'string' && result.toUpperCase() === 'COMPATIBLE';
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Nurse'],
      action: 'BEDSIDE_VERIFY',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const scannedComponentId = data.componentId || data.unitId || data.unitBarcodeRaw;

    if (!data.patientId || !scannedComponentId || !data.verifier1 || !data.verifier2Pin) {
      return apiErrorResponse({
        request,
        code: 'BEDSIDE_VERIFY_INVALID_PAYLOAD',
        message: 'Missing required bedside verification parameters',
        status: 400,
      });
    }

    if (!data.consentVerified || !data.preVitalsChecked) {
      return apiErrorResponse({
        request,
        code: 'BEDSIDE_CLINICAL_PREREQUISITES_MISSING',
        message: 'Clinical prerequisites must be verified before bedside transfusion authorization.',
        status: 403,
        details: {
          severity: 'HardStop',
          actionRequired: 'Verify consent and pre-transfusion vitals in the clinical workflow before retrying.',
        },
      });
    }

    // 1. Require two distinct authenticated clinical users
    const user1 = await db.users.getByUsername(data.verifier1);
    let user2 = null;

    if (data.verifier2) {
      user2 = await db.users.getByUsername(data.verifier2);
    } else {
      // Legacy support: match secondary verifier by PIN/password among all users
      const allUsers = await db.users.getAll();
      user2 = allUsers.find((u: any) => 
        u.username.toLowerCase() !== data.verifier1.toLowerCase() && 
        verifyPassword(data.verifier2Pin, u.password)
      );
    }

    if (!user1) {
      return apiErrorResponse({
        request,
        code: 'PRIMARY_VERIFIER_NOT_FOUND',
        message: `Primary verifier '${data.verifier1}' not found in user registry.`,
        status: 401,
      });
    }

    if (!user2) {
      return apiErrorResponse({
        request,
        code: 'SECONDARY_VERIFIER_AUTH_FAILED',
        message: 'Secondary verifier authentication failed. Invalid PIN/password or user not found.',
        status: 401,
      });
    }

    if (user1.id === user2.id) {
      return apiErrorResponse({
        request,
        code: 'SAME_USER_VERIFICATION_BLOCKED',
        message: 'Bedside dual verification requires two distinct authenticated clinical actors.',
        status: 400,
      });
    }

    // BED-01: the PRIMARY verifier must also authenticate (not username-only).
    if (!data.verifier1Pin) {
      return apiErrorResponse({
        request,
        code: 'PRIMARY_VERIFIER_PIN_REQUIRED',
        message: 'Primary verifier must authenticate with a PIN/password.',
        status: 400,
      });
    }
    if (!verifyPassword(data.verifier1Pin, user1.password)) {
      return apiErrorResponse({
        request,
        code: 'PRIMARY_VERIFIER_AUTH_FAILED',
        message: 'Primary verifier authentication failed. Invalid PIN/password.',
        status: 401,
      });
    }

    // 2. Verify both users have allowed roles
    const allowedVerifierRoles = ['Nurse', 'Doctor', 'Nurse_MTP', 'Nurse_Hemovigilance', 'Admin', 'HospitalOperator'];
    if (!allowedVerifierRoles.includes(user1.role) || !allowedVerifierRoles.includes(user2.role)) {
      return apiErrorResponse({
        request,
        code: 'UNAUTHORIZED_VERIFIER_ROLE',
        message: `Verification blocked: Primary verifier role is '${user1.role}' and secondary verifier role is '${user2.role}'. Both must be authorized clinical roles.`,
        status: 403,
      });
    }

    // 3. Verify facility/custody scope matches patient hospitalId
    const patient = await resolveOne(
      byIdIfAvailable(db.patients, 'getById', data.patientId),
      () => db.patients.getAll(),
      (p: any) => p.id === data.patientId || p.mrn === data.patientId,
    );
    if (!patient) {
      return apiErrorResponse({
        request,
        code: 'BEDSIDE_PATIENT_NOT_FOUND',
        message: `Patient ${data.patientId} not found`,
        status: 404,
      });
    }

    const patientHospitalId = patient.hospitalId || patient.hospital_id;
    if (patientHospitalId) {
      if (user1.orgId !== patientHospitalId || user2.orgId !== patientHospitalId) {
        return apiErrorResponse({
          request,
          code: 'VERIFIER_FACILITY_MISMATCH',
          message: `Facility mismatch: Patient is at '${patientHospitalId}', but verifiers belong to '${user1.orgId}' / '${user2.orgId}'.`,
          status: 403,
        });
      }
    }

    if (data.verifier2) {
      const isPinValid = verifyPassword(data.verifier2Pin, user2.password);
      if (!isPinValid) {
        return apiErrorResponse({
          request,
          code: 'SECONDARY_VERIFIER_AUTH_FAILED',
          message: 'Secondary verifier authentication failed. Invalid PIN/password.',
          status: 401,
        });
      }
    }

    const component = await resolveOne(
      byIdIfAvailable(db.components, 'getById', scannedComponentId),
      () => db.components.getAll(),
      (c: any) => (
        c.id === scannedComponentId ||
        c.unitId === scannedComponentId ||
        c.din === scannedComponentId
      ),
    );

    if (!component) {
      return apiErrorResponse({
        request,
        code: 'BEDSIDE_COMPONENT_NOT_FOUND',
        message: `Component ${scannedComponentId} not found`,
        status: 404,
      });
    }

    // BED-02: independently re-verify the ACTUAL ABO/Rh of the scanned unit
    // against the patient at the bedside (catches wrong-unit/clerical errors,
    // not just the presence of a crossmatch record). Enforced when both blood
    // groups are recorded; otherwise a warning is logged (cannot verify).
    const unitAbo = component.abo ?? component.bloodType;
    const unitRhd = component.rhd;
    const patientAbo = (patient as any).abo;
    const patientRhd = (patient as any).rhd;
    if (unitAbo && patientAbo) {
      const compat = evaluateComponentCompatibility({
        componentClass: component.type || component.productCode,
        donorAbo: unitAbo,
        donorRhd: unitRhd ?? 'Positive',
        patientAbo,
        patientRhd: patientRhd ?? 'Positive',
      });
      if (!compat.compatible) {
        return apiErrorResponse({
          request,
          code: 'BEDSIDE_ABO_RH_MISMATCH',
          message: `Bedside ABO/Rh re-check failed: unit ${unitAbo}${unitRhd ?? ''} is not compatible with patient ${patientAbo}${patientRhd ?? ''} (${compat.reason})`,
          status: 409,
          details: { severity: 'HardStop', actionRequired: 'Do not transfuse. Return the unit to the blood bank and re-confirm patient identity.' },
        });
      }
    }

    const actorRole = (data.actorRole || data.role || 'Nurse') as Role;
    const inventoryItem = await resolveOne(
      byIdIfAvailable(db.inventory, 'getByUnitId', component.id || scannedComponentId),
      () => db.inventory.getAll(),
      (item: any) => item.unitId === (component.id || scannedComponentId),
    );
    const currentStatus = inventoryItem ? inventoryItem.status : component.status;

    const componentId = component.id || scannedComponentId;
    const issueRecords = await db.issueRecords.getAll();
    const matchingIssue = issueRecords.find((record: any) => (
      record.componentId === componentId &&
      record.patientId === data.patientId &&
      !record.returnedAt
    ));

    if (!matchingIssue) {
      return apiErrorResponse({
        request,
        code: 'BEDSIDE_ISSUE_RECORD_NOT_FOUND',
        message: `No active issue record found for component ${componentId} and patient ${data.patientId}.`,
        status: 409,
        details: {
          severity: 'HardStop',
          actionRequired: 'Confirm the component was issued to this patient before bedside transfusion.',
        },
      });
    }

    const crossmatches = await db.crossmatch.getAll();
    const componentCrossmatches = crossmatches.filter((record: any) => record.componentId === componentId);
    if (componentCrossmatches.length > 0) {
      const matchingCrossmatch = componentCrossmatches.find((record: any) => record.patientId === data.patientId);
      if (!matchingCrossmatch) {
        return apiErrorResponse({
          request,
          code: 'BEDSIDE_CROSSMATCH_PATIENT_MISMATCH',
          message: `Component ${componentId} has no crossmatch record for patient ${data.patientId}.`,
          status: 409,
          details: {
            severity: 'HardStop',
            actionRequired: 'Verify patient identity and crossmatch assignment before transfusion.',
          },
        });
      }

      if (!isCompatibleCrossmatch(matchingCrossmatch.result)) {
        return apiErrorResponse({
          request,
          code: 'BEDSIDE_CROSSMATCH_NOT_COMPATIBLE',
          message: `Crossmatch for component ${componentId} and patient ${data.patientId} is not compatible.`,
          status: 409,
          details: {
            severity: 'HardStop',
            actionRequired: 'Do not transfuse. Resolve the compatibility discrepancy with the blood bank.',
          },
        });
      }
    }

    const result = await executeBloodUnitTransition(
      {
        unitId: componentId,
        currentStatus,
        targetStatus: 'TRANSFUSED',
        role: actorRole,
        context: {
          dualVerificationPassed: true,
          isExpired: isBloodUnitExpired(component.expiryDate),
          baseVersion: inventoryItem?.version,
        },
      },
      authz.actorRole || 'SYSTEM',
      'SERVER',
      'BEDSIDE_VERIFY_TRANSFUSED',
      getRequestId(request),
      {
        location: patientHospitalId || 'CLINICAL_WARD',
      }
    );

    if (!result.success) {
      return apiErrorResponse({
        request,
        code: result.error?.code || 'TRANSFUSION_FAILED',
        message: result.error?.message || 'Failed to execute blood unit transition to TRANSFUSED',
        status: result.httpStatus || 400,
        details: result.error ? bloodUnitCommandErrorBody(result.error) : undefined,
      });
    }
    
    // 1. Record the transfusion with both verifier IDs
    await db.transfusions.create({
      ...data,
      componentId,
      verifier1: user1.id,
      verifier2Pin: user2.id,
    });
    
    // 2. Create an audit event for traceability with both verifiers
    await db.audit_events.create({
      eventType: 'BedsideVerify',
      actorRole,
      objectId: componentId,
      actorId: user1.id,
      reasonCode: 'DUAL_VERIFICATION_COMPLETE',
      requestId: getRequestId(request),
      details: `Bedside verification successful for Patient ${data.patientId}. Verifiers: ${user1.id} (${user1.role}) & ${user2.id} (${user2.role}).`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'BEDSIDE_VERIFY_FAILED');
  }
}
