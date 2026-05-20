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
