import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const compId = params.id;
    await db.components.updateStatus(compId, 'SENT_TO_HUB');
    
    // Also record an audit event
    await db.audit_events.create({
      eventType: 'Release',
      objectId: compId,
      details: `Component released from Donor Center to National HUB.`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
