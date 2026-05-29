import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'Dispatcher', 'WarehouseIssuer', 'Resource'],
      action: 'RESOURCE_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let data;
    if (type) {
      data = await db.resources.getByType(type);
    } else {
      data = await db.resources.getAll();
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'RESOURCE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'Manager', 'Dispatcher', 'Resource'],
      action: 'RESOURCE_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    await db.resources.create(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'RESOURCE_CREATE_FAILED');
  }
}
