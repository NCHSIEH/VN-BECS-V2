import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONATION_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const data = await db.donations.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_DONATION_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONATION_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    await db.donations.create(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_DONATION_CREATE_FAILED');
  }
}
