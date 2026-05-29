import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_QUEUE_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (orgId) {
      const queues = await db.limsQueues.getByOrg(orgId);
      return NextResponse.json(queues);
    }
    
    const queues = await db.limsQueues.getAll();
    return NextResponse.json(queues);
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_QUEUE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_QUEUE_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    const id = `Q-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const entry = {
      id,
      donorId: data.donorId,
      donorName: data.donorName,
      orgId: data.orgId,
      status: data.status || 'WAITING',
      dispatchMode: data.dispatchMode || 'Shared',
      chairId: data.chairId || '',
      assignedAt: data.assignedAt || new Date().toISOString()
    };
    
    await db.limsQueues.create(entry);
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_QUEUE_CREATE_FAILED');
  }
}
