import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  evaluateBloodUnitTransition,
  executeBloodUnitTransition,
  bloodUnitCommandErrorBody,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import { validateEmergencyRelease } from '@/src/lib/clinicalPolicy';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const mtp = await db.mtpCases.getById(id);
    if (!mtp) {
      return apiErrorResponse({
        request: req,
        code: 'MTP_CASE_NOT_FOUND',
        message: 'MTP case not found',
        status: 404,
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty, which is fine
    }

    // EMG-01: emergency/MTP uncrossmatched release governance. Approver and
    // indication are derived from the activated MTP case (captured at
    // activation) or may be overridden in the request body.
    const emergency = validateEmergencyRelease({
      approverId: body.approverId || mtp.authorizedClinician,
      indication: body.indication || mtp.clinicalScenario,
      patientCategory: body.patientCategory,
      rhdChoice: body.rhdChoice,
    });
    if (!emergency.valid) {
      return apiErrorResponse({
        request: req,
        code: 'EMERGENCY_RELEASE_GOVERNANCE_INCOMPLETE',
        message: emergency.errors.join('; '),
        status: 403,
        details: {
          severity: 'HardStop',
          actionRequired: 'Record the authorizing clinician and clinical indication before emergency issue.',
        },
      });
    }

    const componentId = body.componentId || body.unitId;

    if (componentId) {
      const [components, allInventory] = await Promise.all([
        db.components.getAll(),
        db.inventory.getAll(),
      ]);

      const comp = components.find((c: any) => c.id === componentId);
      const invItem = allInventory.find((item: any) => item.unitId === componentId);

      if (!comp && !invItem) {
        return apiErrorResponse({
          request: req,
          code: 'COMPONENT_NOT_FOUND',
          message: `Blood unit ${componentId} not found in components or inventory`,
          status: 404,
        });
      }

      const currentStatus = invItem ? invItem.status : comp.status;
      const role = (body.actorRole || body.role || 'Nurse') as Role;

      const result = await executeBloodUnitTransition(
        {
          unitId: componentId,
          currentStatus,
          targetStatus: 'ISSUED',
          role,
          context: {
            isBreakGlass: true,
            isExpired: isBloodUnitExpired(invItem?.expiryDate || comp?.expiryDate),
            baseVersion: invItem?.version,
          },
        },
        role,
        'SERVER',
        'MTP_EMERGENCY_ISSUE',
        getRequestId(req),
        {
          location: 'ER / Operating Room',
          expiryDate: invItem?.expiryDate || comp?.expiryDate || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        }
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(result.error!),
            requestId: getRequestId(req),
          },
          { status: result.httpStatus || 400 },
        );
      }
    }

    const newUnitsIssued = (mtp.unitsIssued || 0) + 1;
    let newRound = mtp.currentRound || 1;
    let newTarget = mtp.unitsTarget || 18;

    // Transition logic: After 6 units, maybe move to round 2
    if (newUnitsIssued === 6 && newRound === 1) {
       newRound = 2;
    }

    const updated = await db.mtpCases.update(id, {
       unitsIssued: newUnitsIssued,
       currentRound: newRound,
       unitsTarget: newTarget,
       // EMG-01: track the post-event review SLA and the policy version applied.
       emergencyReviewDueAt: emergency.reviewDueAt,
       emergencyPolicyVersion: emergency.policyVersion,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalErrorResponse(req, error, 'MTP_UNIT_ISSUE_FAILED');
  }
}

