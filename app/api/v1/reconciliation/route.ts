import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'QA_Officer'], action: 'RECONCILIATION_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const reports = await db.reconciliation_reports.getAll();
    return NextResponse.json(reports);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'RECONCILIATION_LIST_FAILED');
  }
}
