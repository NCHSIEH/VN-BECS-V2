import { NextResponse } from 'next/server';

export async function GET() {
  const counts = {
    Critical: 1,
    High: 1,
    Medium: 1,
    Low: 0
  };
  return NextResponse.json(counts);
}
