import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const cases = await db.mtpCases.getAll();
    return NextResponse.json(cases);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // SOP 10 (MTP) & SOP 7 CDSS validation for non-breakglass activations
    if (!body.isBreakGlass && body.patientIdentifier) {
      const allPatients = await db.patients.getAll();
      const patient = allPatients.find((p: any) => p.id === body.patientIdentifier || p.mrn === body.patientIdentifier);
      
      if (patient) {
         if (patient.specimenExpired || (patient.specimenHours && patient.specimenHours > 72)) {
            return NextResponse.json({ error: '🚨 CDSS BLOCK: Patient specimen has expired (>72 hours). A new sample MUST be drawn before standard MTP activation. Use Break-Glass if clinically critical.' }, { status: 400 });
         }
         
         const hasAntibodies = patient.hasAntibody || (patient.antibodyHistory && patient.antibodyHistory.length > 0);
         if (hasAntibodies) {
            return NextResponse.json({ error: '🚨 CDSS BLOCK: Patient has a history of clinically significant antibodies. Standard MTP uncrossmatched release is blocked due to high risk of hemolytic reaction. Consult Medical Director or use Break-Glass.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
