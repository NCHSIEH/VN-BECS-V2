import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'Dispatcher', 'WarehouseIssuer', 'Resource'],
      action: 'RESOURCE_READ',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    const data = await db.resources.getAll();
    const item = data.find((r: any) => r.id === params.id);
    if (!item) {
      return apiErrorResponse({
        request,
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
        status: 404,
      });
    }
    return NextResponse.json(item);
  } catch (error) {
    return internalErrorResponse(request, error, 'RESOURCE_READ_FAILED');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'Manager', 'Dispatcher', 'Resource'],
      action: 'RESOURCE_UPDATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    if (data.status) {
      await db.resources.updateStatus(params.id, data.status);
    }
    if (data.stockLevel !== undefined) {
      await db.resources.updateStock(params.id, data.stockLevel);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'RESOURCE_UPDATE_FAILED');
  }
}
