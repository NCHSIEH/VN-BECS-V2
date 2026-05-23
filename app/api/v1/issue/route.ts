import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const data = await db.issueRecords.getAll();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/v1/issue Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { componentId, patientId, issuedTo, issuedBy } = body;

    if (!componentId || !patientId || !issuedTo || !issuedBy) {
      return NextResponse.json({ error: 'Missing required issue parameters' }, { status: 400 });
    }

    // Check if the component actually exists and is AVAILABLE/RELEASED
    const allComponents = await db.components.getAll();
    const component = allComponents.find((c: any) => c.id === componentId);
    
    if (component && component.status !== 'RELEASED' && component.status !== 'AVAILABLE') {
      return NextResponse.json({ error: `Component is not in an issuable state (Current status: ${component.status})` }, { status: 400 });
    }

    const newRecord = {
      id: `ISS-${Math.floor(Math.random() * 800000) + 100000}`,
      componentId,
      patientId,
      issuedTo,
      issuedBy,
      issuedAt: new Date().toISOString()
    };

    await db.issueRecords.create(newRecord);

    // Update component status in database
    try {
      await db.components.updateStatus(componentId, 'ISSUED');
    } catch (e) {
      console.warn('Failed to update component status:', e);
    }

    // Create Audit Event
    await db.auditEvents.create({
      eventType: 'Blood Unit Issued',
      objectId: componentId,
      actorRole: 'Nurse',
      details: `Blood unit ${componentId} issued to ward ${issuedTo} for patient ${patientId} by ${issuedBy}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(newRecord);
  } catch (error: any) {
    console.error('POST /api/v1/issue Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
