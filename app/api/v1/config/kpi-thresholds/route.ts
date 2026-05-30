import { NextResponse } from 'next/server';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

const defaultThresholds = {
  wastageGreen: 2,
  wastageYellow: 5,
  complianceGreen: 98,
  complianceYellow: 95
};

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'QA_Officer'], action: 'KPI_THRESHOLD_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  return NextResponse.json(defaultThresholds);
}

export async function PUT(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager'], action: 'KPI_THRESHOLD_UPDATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const data = await request.json();
    return NextResponse.json({ success: true, thresholds: data });
  } catch (error) {
    return internalErrorResponse(request, error, 'KPI_THRESHOLD_UPDATE_FAILED');
  }
}
