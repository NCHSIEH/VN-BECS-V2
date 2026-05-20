import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST() {
  try {
    await db.resetDb();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
