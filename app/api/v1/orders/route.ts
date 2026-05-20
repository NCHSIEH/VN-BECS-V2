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
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    await db.orders.create(order);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
