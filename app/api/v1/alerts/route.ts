import { NextResponse } from 'next/server';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

const ALL_CLINICAL_ROLES = ['Admin', 'Manager', 'NationalCommander', 'Auditor', 'QA_Officer', 'Dispatcher', 'WarehouseIssuer', 'Nurse', 'HospitalOperator', 'LIMS_Simulator', 'DonorScreener', 'Courier', 'MedicalReviewer'] as const;

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: [...ALL_CLINICAL_ROLES], action: 'ALERT_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  const alerts = [
    { id: '1', title: 'Critical Temp Variance', message: 'Hub 4 Freezer reports -12°C (Threshold: -18°C)', severity: 'Critical', timestamp: new Date().toISOString() },
    { id: '2', title: 'Low Stock: O-', message: 'O-Negative inventory below 2-day safety level', severity: 'High', timestamp: new Date().toISOString() },
    { id: '3', title: 'Pending Audit', message: '12 units require second authority review', severity: 'Medium', timestamp: new Date().toISOString() }
  ];
  return NextResponse.json(alerts);
}
