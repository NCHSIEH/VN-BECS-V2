import { NextResponse } from 'next/server';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

const ALL_CLINICAL_ROLES = ['Admin', 'Manager', 'NationalCommander', 'Auditor', 'QA_Officer', 'Dispatcher', 'WarehouseIssuer', 'Nurse', 'HospitalOperator', 'LIMS_Simulator', 'DonorScreener', 'Courier', 'MedicalReviewer'] as const;

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: [...ALL_CLINICAL_ROLES], action: 'ALERT_COUNT_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  const counts = {
    Critical: 1,
    High: 1,
    Medium: 1,
    Low: 0
  };
  return NextResponse.json(counts);
}
