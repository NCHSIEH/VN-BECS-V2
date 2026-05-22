import { NextResponse } from 'next/server';
import { translations } from '@/src/server/db';

export async function GET() {
  try {
    const data = await translations.getAll();
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
