import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    if (orgId) {
      const queues = await db.limsQueues.getByOrg(orgId);
      return NextResponse.json(queues);
    }
    
    const queues = await db.limsQueues.getAll();
    return NextResponse.json(queues);
  } catch (error) {
    console.error("GET LIMS Queues error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const id = `Q-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const entry = {
      id,
      donorId: data.donorId,
      donorName: data.donorName,
      orgId: data.orgId,
      status: data.status || 'WAITING',
      dispatchMode: data.dispatchMode || 'Shared',
      chairId: data.chairId || '',
      assignedAt: data.assignedAt || new Date().toISOString()
    };
    
    await db.limsQueues.create(entry);
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("POST LIMS Queues error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
