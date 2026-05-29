import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Auditor'],
      action: 'AUDIT_EVENT_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const data = await db.audit_events.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'AUDIT_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['Admin', 'Auditor', 'Manager', 'QA_Officer', 'Dispatcher', 'Nurse', 'HospitalOperator', 'LIMS_Simulator', 'WarehouseIssuer'],
      action: 'AUDIT_EVENT_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    if (!body?.eventType || !body?.objectId) {
      return apiErrorResponse({
        request,
        code: 'AUDIT_EVENT_INVALID',
        message: 'eventType and objectId are required',
        status: 400,
      });
    }

    const event = await db.audit_events.create({
      ...body,
      actorRole: body.actorRole || 'SYSTEM',
      details: body.details || '',
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return internalErrorResponse(request, error, 'AUDIT_CREATE_FAILED');
  }
}
