import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const donationId = decodeURIComponent(id);
    
    // Create a component based on the donation
    const compId = `C-${donationId.split(' ').pop()}-01`;
    await db.components.create({
      id: compId,
      donationId: donationId,
      productCode: 'WB', // Default to Whole Blood
      status: 'AVAILABLE',
      processedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, compId });
  } catch (error: any) {
    console.error('Process Component Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
