import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin'],
      action: 'MDM_USER_UPDATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const id = params.id;
    
    // In a real app, we would update the user in the database
    // For now, we'll assume db.users.update exists or we'll add it
    const result = await (db.users as any).update(id, data);
    
    if (result?.error) throw result.error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'MDM_USER_UPDATE_FAILED');
  }
}
