import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    await db.limsQueues.update(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT LIMS Queue error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.limsQueues.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE LIMS Queue error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
