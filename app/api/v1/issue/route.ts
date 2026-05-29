import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  bloodUnitCommandErrorBody,
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, authorizeFacilityScope, facilityIdOf, facilityScopeErrorBody, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  try {
    const data = await db.issueRecords.getAll();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/v1/issue Error:', error);
    return internalErrorResponse(request, error, 'ISSUE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { componentId, patientId, issuedTo, issuedBy } = body;
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['HospitalOperator', 'Nurse'],
      action: 'BLOOD_UNIT_ISSUE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const role = (body.actorRole || body.role || 'Nurse') as Role;
    const isBreakGlass = body.isBreakGlass === true;

    if (!componentId || !patientId || !issuedTo || !issuedBy) {
      return apiErrorResponse({
        request,
        code: 'ISSUE_INVALID_PAYLOAD',
        message: 'Missing required issue parameters',
        status: 400,
      });
    }

    const [allComponents, allInventory] = await Promise.all([
      db.components.getAll(),
      db.inventory.getAll(),
    ]);

    const component = allComponents.find((c: any) => c.id === componentId);
    if (!component) {
      return apiErrorResponse({
        request,
        code: 'COMPONENT_NOT_FOUND',
        message: `Component ${componentId} not found`,
        status: 404,
      });
    }

    const inventoryItem = allInventory.find((i: any) => i.unitId === componentId);

    // ABAC: confine the action to the actor's own facility (defence-in-depth
    // layer; DB RLS is the second layer once facility_id is populated).
    const scope = authorizeFacilityScope({
      decision: authz,
      resourceOrgId: facilityIdOf(inventoryItem) ?? facilityIdOf(component),
    });
    if (!scope.allowed) {
      return NextResponse.json(
        facilityScopeErrorBody(authz, facilityIdOf(inventoryItem) ?? facilityIdOf(component)),
        { status: 403 },
      );
    }

    // Concurrency locking check
    const clientVersion = body.baseVersion ?? body.version;
    if (clientVersion !== undefined && inventoryItem && inventoryItem.version !== undefined && Number(clientVersion) !== Number(inventoryItem.version)) {
      return apiErrorResponse({
        request,
        code: 'VERSION_CONFLICT',
        message: `Concurrency Conflict: Blood unit inventory has been modified by another process (client version: ${clientVersion}, server version: ${inventoryItem.version}).`,
        status: 409,
      });
    }

    const currentStatus = inventoryItem ? inventoryItem.status : component.status;

    const result = await executeBloodUnitTransition(
      {
        unitId: componentId,
        currentStatus,
        targetStatus: 'ISSUED',
        role,
        context: {
          isBreakGlass,
          isExpired: isBloodUnitExpired(inventoryItem?.expiryDate || component.expiryDate),
          medicalOrderConfirmed: body.medicalOrderConfirmed ?? currentStatus === 'CROSSMATCHED',
          baseVersion: inventoryItem?.version,
        },
      },
      authz.actorRole || 'SYSTEM',
      'SERVER',
      'BLOOD_UNIT_ISSUE',
      getRequestId(request)
    );

    if (!result.success) {
      return apiErrorResponse({
        request,
        code: result.error?.code || 'ISSUE_FAILED',
        message: result.error?.message || 'Failed to issue blood unit',
        status: result.httpStatus || 400,
        details: result.error ? bloodUnitCommandErrorBody(result.error) : undefined,
      });
    }

    const newRecord = {
      id: `ISS-${Math.floor(Math.random() * 800000) + 100000}`,
      componentId,
      patientId,
      issuedTo,
      issuedBy,
      issuedAt: new Date().toISOString()
    };

    await db.issueRecords.create(newRecord);

    return NextResponse.json(newRecord);
  } catch (error: any) {
    console.error('POST /api/v1/issue Error:', error);
    return internalErrorResponse(request, error, 'ISSUE_CREATE_FAILED');
  }
}
