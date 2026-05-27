import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await db.issueRecords.getById(id);

    if (!record) {
      return NextResponse.json({ error: 'Issue record not found' }, { status: 404 });
    }

    const body = await request.json();
    const { coldChainOk, visualOk } = body;

    // SOP 8: 30-minute return rule
    // If returned > 30 minutes after issue, it MUST be wasted regardless of visual/cold chain ok.
    const issuedTime = new Date(record.issuedAt).getTime();
    const returnTime = Date.now();
    const diffMinutes = (returnTime - issuedTime) / (1000 * 60);

    let returnStatus = (coldChainOk && visualOk) ? 'ColdChainOK' : 'WASTED';
    let timeoutWasted = false;

    if (diffMinutes > 30) {
      returnStatus = 'Timeout';
      timeoutWasted = true;
    }

    const updatedData = {
      ...record,
      returnedAt: new Date(returnTime).toISOString(),
      returnStatus
    };

    await db.issueRecords.update(id, updatedData);

    // Update component status in database
    const componentStatus = returnStatus === 'ColdChainOK' ? 'AVAILABLE' : 'WASTED';
    try {
      await db.components.updateStatus(record.componentId, componentStatus);
    } catch (e) {
      console.warn('Failed to update component status:', e);
    }

    // Create Audit Event
    await db.auditEvents.create({
      eventType: 'Blood Unit Returned',
      objectId: record.componentId,
      actorRole: 'Nurse',
      details: `Blood unit ${record.componentId} returned with status: ${returnStatus} (Cold-chain: ${coldChainOk ? 'OK' : 'FAIL'}, Visual: ${visualOk ? 'OK' : 'FAIL'}, Timeout: ${timeoutWasted ? 'YES' : 'NO'})`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(updatedData);
  } catch (error: any) {
    console.error('POST /api/v1/issue/[id]/return Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
