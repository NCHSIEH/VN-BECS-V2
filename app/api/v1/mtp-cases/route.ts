import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Nurse', 'HospitalOperator', 'MedicalReviewer', 'Dispatcher', 'Auditor'], action: 'MTP_CASE_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const cases = await db.mtpCases.getAll();
    return NextResponse.json(cases);
  } catch (error) {
    return internalErrorResponse(request, error, 'MTP_CASE_LIST_FAILED');
  }
}

export async function POST(req: Request) {
  const authz = authorizeApiRole({ request: req, allowedRoles: ['Admin', 'Nurse', 'HospitalOperator'], action: 'MTP_CASE_CREATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const body = await req.json();

    // SOP 10 (MTP) & SOP 7 CDSS validation for non-breakglass activations
    if (!body.isBreakGlass && body.patientIdentifier) {
      const allPatients = await db.patients.getAll();
      const patient = allPatients.find((p: any) => p.id === body.patientIdentifier || p.mrn === body.patientIdentifier);
      
      if (patient) {
         if (patient.specimenExpired || (patient.specimenHours && patient.specimenHours > 72)) {
            return apiErrorResponse({
              request: req,
              code: 'MTP_SPECIMEN_EXPIRED',
              message: 'CDSS BLOCK: Patient specimen has expired (>72 hours). A new sample MUST be drawn before standard MTP activation. Use Break-Glass if clinically critical.',
              status: 400,
            });
         }
         
         const hasAntibodies = patient.hasAntibody || (patient.antibodyHistory && patient.antibodyHistory.length > 0);
         if (hasAntibodies) {
            return apiErrorResponse({
              request: req,
              code: 'MTP_ANTIBODY_HISTORY_BLOCK',
              message: 'CDSS BLOCK: Patient has a history of clinically significant antibodies. Standard MTP uncrossmatched release is blocked due to high risk of hemolytic reaction. Consult Medical Director or use Break-Glass.',
              status: 400,
            });
         }
      }
    }

    const mtp = await db.mtpCases.create({
       ...body,
       currentRound: 1,
       unitsIssued: 0,
       unitsTarget: 18,
       activatedAt: new Date().toISOString()
    });
    
    // Log activation
    await db.auditEvents.create({
       actorRole: 'Clinician',
       eventType: 'MTP_ACTIVATION',
       objectId: mtp.id,
       details: `MTP Protocol Activated for ${body.patientIdentifier} at ${body.clinicalScenario}`,
       timestamp: new Date().toISOString()
    });

    return NextResponse.json(mtp);
  } catch (error) {
    return internalErrorResponse(req, error, 'MTP_CASE_CREATE_FAILED');
  }
}
