import { NextResponse } from 'next/server';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'NationalCommander', 'Auditor', 'QA_Officer'], action: 'KPI_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  const kpis = {
    statResponseTime: '2.8m',
    wastageRate: '1.2%',
    dualReviewCompletionRate: '99.5%',
    ordersPending: 5,
    transfusionsToday: 42
  };
  return NextResponse.json(kpis);
}
