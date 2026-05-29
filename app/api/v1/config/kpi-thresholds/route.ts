import { NextResponse } from 'next/server';
import { internalErrorResponse } from '@/src/server/apiResponses';

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
    return internalErrorResponse(request, error, 'KPI_THRESHOLD_UPDATE_FAILED');
  }
}
