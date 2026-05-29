import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin'],
      action: 'MDM_ORGANIZATION_UPDATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    await db.organizations.update(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'MDM_ORGANIZATION_UPDATE_FAILED');
  }
}
