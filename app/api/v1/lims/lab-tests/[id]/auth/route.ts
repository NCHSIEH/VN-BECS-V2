import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const donationId = (await params).id;
    const { action } = await request.json(); // action should be 'clear' or 'quarantine'

    const status = action === 'clear' ? 'CLEARED' : 'QUARANTINED';
    
    await db.lab_tests.updateByDonationId(donationId, {
      idmStatus: status,
      testedAt: new Date().toISOString()
    });

    // Also update donation status if needed
    // If quarantined, the component should probably not be processed.

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
