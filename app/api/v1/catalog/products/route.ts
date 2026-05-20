import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const data = await db.product_catalog.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
