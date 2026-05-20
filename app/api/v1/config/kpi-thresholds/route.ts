import { NextResponse } from 'next/server';

const defaultThresholds = {
  wastageGreen: 2,
  wastageYellow: 5,
  complianceGreen: 98,
  complianceYellow: 95
};

export async function GET() {
  return NextResponse.json(defaultThresholds);
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    // In a real app, save to DB. For now, just return success.
    return NextResponse.json({ success: true, thresholds: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
