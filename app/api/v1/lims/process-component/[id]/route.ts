import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import {
  bloodUnitCommandErrorBody,
  evaluateBloodUnitTransition,
} from '@/src/server/services/bloodUnitCommands';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}
    
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['LIMS_Simulator', 'QA_Officer', 'Admin'],
      action: 'LIMS_COMPONENT_PROCESS',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { id } = await params;
    const donationId = decodeURIComponent(id);
    const [labTests, donations, components] = await Promise.all([
      db.lab_tests.getAll(),
      db.donations.getAll(),
      db.components.getAll(),
    ]);

    const labTest = labTests.find((test: any) => test.donationId === donationId);
    const donation = donations.find((entry: any) => entry.id === donationId);
    const idmStatus = labTest?.idmStatus ?? donation?.idmStatus ?? 'PENDING';

    if (idmStatus !== 'CLEARED') {
      return apiErrorResponse({
        request,
        code: 'IDM_NOT_CLEARED',
        message: `[SOP 2] IDM status must be CLEARED before component processing (got: ${idmStatus}).`,
        status: 403,
        details: {
          severity: 'HardStop',
          actionRequired: 'Complete and authorize IDM testing before processing this donation into components.',
        },
      });
    }

    const compId = `C-${donationId.split(' ').pop()}-01`;
    if (components.some((component: any) => component.id === compId || component.donationId === donationId)) {
      return apiErrorResponse({
        request,
        code: 'COMPONENT_ALREADY_EXISTS',
        message: `Component already exists for donation ${donationId}.`,
        status: 409,
        details: {
          severity: 'HardStop',
        },
      });
    }

    const allReactions = await db.adverse_reactions.getAll();
    const isUnderLookback = allReactions.some((r: any) => {
      return r.lookbackTriggered === 1 && (
        r.componentId === compId || 
        r.donationId === donationId || 
        (r.componentId && components.find((c: any) => c.id === r.componentId)?.donationId === donationId)
      );
    });

    const releaseDecision = evaluateBloodUnitTransition({
      unitId: compId,
      currentStatus: 'QUARANTINE',
      targetStatus: 'AVAILABLE',
      role: 'LIMS_Simulator',
      context: {
        idmStatus: 'CLEARED',
        isUnderLookback,
      },
    });

    if (releaseDecision.allowed === false) {
      return apiErrorResponse({
        request,
        code: releaseDecision.error.code,
        message: releaseDecision.error.message,
        status: releaseDecision.httpStatus,
        details: bloodUnitCommandErrorBody(releaseDecision.error),
      });
    }

    await db.components.create({
      id: compId,
      donationId: donationId,
      productCode: 'WB',
      status: 'AVAILABLE',
      processedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, compId });
  } catch (error: any) {
    console.error('Process Component Error:', error);
    return internalErrorResponse(request, error, 'LIMS_PROCESS_COMPONENT_FAILED');
  }
}
