import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const orders = await db.orders.getAll();
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const id = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
    const order = {
      ...data,
      id,
      status: data.priority === 'STAT' ? 'REVIEW_PENDING' : 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    await db.orders.create(order);
    
    // Auto escalate STAT orders
    if (data.priority === 'STAT') {
       await db.auditEvents.create({
          actorRole: 'System',
          eventType: 'ORDER_STAT_ESCALATED',
          objectId: id,
          details: `STAT Order auto-escalated to Medical Reviewer immediately upon submission.`,
          timestamp: new Date().toISOString()
       });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
