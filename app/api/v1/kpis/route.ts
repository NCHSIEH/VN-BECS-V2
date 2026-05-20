import { NextResponse } from 'next/server';

export async function GET() {
  // Mock KPI data based on existing logic
  const kpis = {
    statResponseTime: '2.8m',
    wastageRate: '1.2%',
    dualReviewCompletionRate: '99.5%',
    ordersPending: 5,
    transfusionsToday: 42
  };
  return NextResponse.json(kpis);
}
