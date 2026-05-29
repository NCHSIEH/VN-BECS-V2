import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_QUESTIONNAIRE_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const data = await db.questionnaires.getAll();
    return NextResponse.json(data || []);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'LIMS_QUESTIONNAIRE_LIST_FAILED');
  }
}
