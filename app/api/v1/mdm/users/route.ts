import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer'],
      action: 'MDM_USER_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const data = await db.users.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'MDM_USER_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin'],
      action: 'MDM_USER_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    await db.users.create(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'MDM_USER_CREATE_FAILED');
  }
}
