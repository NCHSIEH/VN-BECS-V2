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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 1000);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const since = searchParams.get('since'); // ISO timestamp filter

    const all = await db.audit_events.getAll();
    const filtered = since
      ? all.filter((e: any) => e.timestamp && e.timestamp >= since)
      : all;
    const page = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      data: page,
      total: filtered.length,
      limit,
      offset,
    });
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
