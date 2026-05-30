import { NextResponse } from 'next/server';
import { patients } from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'QA_Officer', 'Nurse', 'HospitalOperator', 'LabTech_Crossmatch', 'MedicalReviewer'], action: 'PATIENT_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const data = await patients.getAll();
    return NextResponse.json(data || []);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'PATIENT_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'HospitalOperator', 'Nurse'], action: 'PATIENT_CREATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const body = await request.json();
    await patients.create(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'PATIENT_CREATE_FAILED');
  }
}
