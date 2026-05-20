import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await db.resources.getAll();
    const item = data.find((r: any) => r.id === params.id);
    if (!item) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    if (data.status) {
      await db.resources.updateStatus(params.id, data.status);
    }
    if (data.stockLevel !== undefined) {
      await db.resources.updateStock(params.id, data.stockLevel);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
