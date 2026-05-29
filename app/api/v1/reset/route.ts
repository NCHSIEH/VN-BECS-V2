import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin'],
      action: 'SYSTEM_RESET',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    await db.resetDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'SYSTEM_RESET_FAILED');
  }
}
