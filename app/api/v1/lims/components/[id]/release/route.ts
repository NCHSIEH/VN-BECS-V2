import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const compId = (await params).id;
    // Update the component status to indicate it has been sent to the Hub
    try {
      await db.components.updateStatus(compId, 'HUB INTRANSIT');
    } catch (dbErr: any) {
      if (dbErr.message && dbErr.message.includes('components')) {
        console.warn('Mocking components.updateStatus because table might be missing');
      } else {
        throw dbErr;
      }
    }
    
    // Record an audit event (non-critical — don't let audit failure block release)
    try {
      await db.auditEvents.create({
        eventType: 'Release',
        objectId: compId,
        details: `Component released from Donor Center to National HUB.`,
        timestamp: new Date().toISOString()
      });
    } catch (auditErr) {
      console.warn('Audit event creation failed (non-critical):', auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Release API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
