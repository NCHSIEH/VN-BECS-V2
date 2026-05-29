import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import {
  bloodUnitCommandErrorBody,
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const compId = (await params).id;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['LIMS_Simulator', 'Admin'],
      action: 'LIMS_COMPONENT_RELEASE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const actorRole = (body.actorRole || body.role || 'LIMS_Simulator') as Role;
    const allComponents = await db.components.getAll();
    const comp = allComponents.find((c: any) => c.id === compId);

    if (!comp) {
      return apiErrorResponse({
        request,
        code: 'COMPONENT_NOT_FOUND',
        message: `Component ${compId} not found`,
        status: 404,
      });
    }

    const result = await executeBloodUnitTransition(
      {
        unitId: compId,
        currentStatus: comp.status,
        targetStatus: 'IN_TRANSIT',
        role: actorRole,
        context: {
          isExpired: isBloodUnitExpired(comp.expiryDate),
        },
      },
      authz.actorRole || 'SYSTEM',
      'SERVER',
      'LIMS_COMPONENT_RELEASE',
      getRequestId(request),
      {
        location: 'Central HUB',
        expiryDate: comp.expiryDate || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      }
    );

    if (!result.success) {
      return apiErrorResponse({
        request,
        code: result.error?.code || 'RELEASE_FAILED',
        message: result.error?.message || 'Failed to release component',
        status: result.httpStatus || 400,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Release API Error:', error);
    return internalErrorResponse(request, error, 'LIMS_COMPONENT_RELEASE_FAILED');
  }
}
