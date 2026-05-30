import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener', 'NationalCommander'], action: 'RARE_DONOR_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const donors = await db.rareDonors.getAll();
    return NextResponse.json(donors);
  } catch (error) {
    return internalErrorResponse(request, error, 'RARE_DONOR_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'], action: 'RARE_DONOR_CREATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const body = await request.json();
    const donor = await db.rareDonors.create(body);
    return NextResponse.json(donor);
  } catch (error) {
    return internalErrorResponse(request, error, 'RARE_DONOR_CREATE_FAILED');
  }
}
