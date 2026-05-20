import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 1. Record the transfusion
    await db.transfusions.create(data);
    
    // 2. Create an audit event for traceability
    await db.audit_events.create({
      eventType: 'BedsideVerify',
      actorRole: data.verifier1 || 'ClinicalNode',
      objectId: data.unitBarcodeRaw || data.unitId,
      timestamp: new Date().toISOString(),
      details: `Bedside verification successful for Patient ${data.patientId}. Verified by ${data.verifier2Pin}.`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bedside verify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
