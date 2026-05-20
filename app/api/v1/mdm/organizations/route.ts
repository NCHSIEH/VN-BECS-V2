import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const orgs = await db.organizations.getAll();
    return NextResponse.json(orgs);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, type, location } = await request.json();
    const id = `ORG-${type.toUpperCase().substring(0,3)}-${Math.floor(Math.random() * 9000) + 1000}`;
    await db.organizations.create({ id, name, type, location, createdAt: new Date().toISOString() });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
