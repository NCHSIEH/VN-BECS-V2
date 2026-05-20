import { NextResponse } from 'next/server';

export async function GET() {
  const alerts = [
    { id: '1', title: 'Critical Temp Variance', message: 'Hub 4 Freezer reports -12°C (Threshold: -18°C)', severity: 'Critical', timestamp: new Date().toISOString() },
    { id: '2', title: 'Low Stock: O-', message: 'O-Negative inventory below 2-day safety level', severity: 'High', timestamp: new Date().toISOString() },
    { id: '3', title: 'Pending Audit', message: '12 units require second authority review', severity: 'Medium', timestamp: new Date().toISOString() }
  ];
  return NextResponse.json(alerts);
}
