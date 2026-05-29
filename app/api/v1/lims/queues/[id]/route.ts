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
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_QUEUE_UPDATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    await db.limsQueues.update(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_QUEUE_UPDATE_FAILED');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_QUEUE_DELETE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    await db.limsQueues.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_QUEUE_DELETE_FAILED');
  }
}
