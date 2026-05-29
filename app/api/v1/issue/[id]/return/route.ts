import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  bloodUnitCommandErrorBody,
  executeBloodUnitTransition,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await db.issueRecords.getById(id);

    if (!record) {
      return apiErrorResponse({
        request,
        code: 'ISSUE_RECORD_NOT_FOUND',
        message: 'Issue record not found',
        status: 404,
      });
    }

    if (record.returnedAt) {
      return apiErrorResponse({
        request,
        code: 'ISSUE_RECORD_ALREADY_RETURNED',
        message: 'Issue record has already been returned',
        status: 409,
      });
    }

    const body = await request.json();
    const { coldChainOk, visualOk } = body;
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['HospitalOperator', 'Nurse'],
      action: 'BLOOD_UNIT_RETURN',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const role = (body.actorRole || body.role || 'HospitalOperator') as Role;
    const [components, allInventory] = await Promise.all([
      db.components.getAll(),
      db.inventory.getAll(),
    ]);
    const component = components.find((c: any) => c.id === record.componentId);

    if (!component) {
      return apiErrorResponse({
        request,
        code: 'COMPONENT_NOT_FOUND',
        message: `Component ${record.componentId} not found`,
        status: 404,
      });
    }

    // SOP 8: 30-minute return rule
    // If returned > 30 minutes after issue, it MUST be wasted regardless of visual/cold chain ok.
    const issuedTime = new Date(record.issuedAt).getTime();
    const returnTime = Date.now();
    const diffMinutes = (returnTime - issuedTime) / (1000 * 60);

    let returnStatus = (coldChainOk && visualOk) ? 'ColdChainOK' : 'WASTED';
    let timeoutWasted = false;

    if (diffMinutes > 30) {
      returnStatus = 'Timeout';
      timeoutWasted = true;
    }

    const componentStatus = returnStatus === 'ColdChainOK' ? 'AVAILABLE' : 'WASTED';
    const inventoryItem = allInventory.find((item: any) => item.unitId === record.componentId);
    const currentStatus = inventoryItem ? inventoryItem.status : component.status;
    if (componentStatus === 'AVAILABLE') {
      const step1 = await executeBloodUnitTransition(
        {
          unitId: record.componentId,
          currentStatus,
          targetStatus: 'RETURNED',
          role,
          context: {
            minutesSinceIssue: diffMinutes,
            baseVersion: inventoryItem?.version,
          },
        },
        authz.actorRole || 'SYSTEM',
        'SERVER',
        'BLOOD_UNIT_RETURN_STEP1',
        getRequestId(request)
      );

      if (!step1.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(step1.error!),
            requestId: getRequestId(request),
          },
          { status: step1.httpStatus || 400 },
        );
      }

      // Step 2: RETURNED -> AVAILABLE
      const step2 = await executeBloodUnitTransition(
        {
          unitId: record.componentId,
          currentStatus: 'RETURNED',
          targetStatus: 'AVAILABLE',
          role,
          context: {
            coldChainCompliant: coldChainOk === true,
            visualInspectionPassed: visualOk === true,
          },
        },
        authz.actorRole || 'SYSTEM',
        'SERVER',
        'BLOOD_UNIT_RETURN_STEP2',
        getRequestId(request)
      );

      if (!step2.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(step2.error!),
            requestId: getRequestId(request),
          },
          { status: step2.httpStatus || 400 },
        );
      }
    } else {
      // Transition to WASTED
      const wasteResult = await executeBloodUnitTransition(
        {
          unitId: record.componentId,
          currentStatus,
          targetStatus: 'WASTED',
          role,
          context: {
            minutesSinceIssue: diffMinutes,
            baseVersion: inventoryItem?.version,
          },
        },
        authz.actorRole || 'SYSTEM',
        'SERVER',
        'BLOOD_UNIT_RETURN_WASTED',
        getRequestId(request)
      );

      if (!wasteResult.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(wasteResult.error!),
            requestId: getRequestId(request),
          },
          { status: wasteResult.httpStatus || 400 },
        );
      }
    }

    const updatedData = {
      ...record,
      returnedAt: new Date(returnTime).toISOString(),
      returnStatus
    };

    await db.issueRecords.update(id, updatedData);

    return NextResponse.json(updatedData);
  } catch (error: any) {
    console.error('POST /api/v1/issue/[id]/return Error:', error);
    return internalErrorResponse(request, error, 'ISSUE_RETURN_FAILED');
  }
}
