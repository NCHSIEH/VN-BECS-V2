import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';
import {
  traceDonorToRecipients,
  traceUnitToDonor,
  type TraceData,
} from '@/src/server/services/traceability';

// Lookback / recall traceability is a quality & haemovigilance function.
const TRACE_ROLES = ['QA_Officer', 'MedicalReviewer', 'Nurse_Hemovigilance', 'Auditor', 'Manager', 'NationalCommander', 'Admin'] as const;

async function loadTraceData(): Promise<TraceData> {
  const [
    donors, donations, components, labTests, crossmatch, issueRecords, transfusions, adverseReactions, patients,
  ] = await Promise.all([
    db.donors.getAll().catch(() => []),
    db.donations.getAll().catch(() => []),
    db.components.getAll().catch(() => []),
    db.labTests.getAll().catch(() => []),
    db.crossmatch.getAll().catch(() => []),
    db.issueRecords.getAll().catch(() => []),
    db.transfusions.getAll().catch(() => []),
    db.adverseReactions.getAll().catch(() => []),
    db.patients.getAll().catch(() => []),
  ]);
  return { donors, donations, components, labTests, crossmatch, issueRecords, transfusions, adverseReactions, patients };
}

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: [...TRACE_ROLES] as any,
      action: 'TRACEABILITY_LOOKBACK',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const url = new URL(request.url);
    const donorId = url.searchParams.get('donorId');
    const unitId = url.searchParams.get('unitId') || url.searchParams.get('componentId');

    if (!donorId && !unitId) {
      return apiErrorResponse({
        request,
        code: 'TRACE_MISSING_QUERY',
        message: 'Provide either donorId (forward/lookback) or unitId (backward) query parameter.',
        status: 400,
      });
    }

    const data = await loadTraceData();

    if (donorId) {
      return NextResponse.json(traceDonorToRecipients(donorId, data));
    }
    return NextResponse.json(traceUnitToDonor(unitId as string, data));
  } catch (error) {
    return internalErrorResponse(request, error, 'TRACE_FAILED');
  }
}
