import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const donationId = (await params).id;
    // Simulate test result
    const status = Math.random() > 0.9 ? 'REACTIVE' : 'CLEARED';
    
    await db.lab_tests.updateByDonationId(donationId, {
      idmStatus: status,
      testedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
