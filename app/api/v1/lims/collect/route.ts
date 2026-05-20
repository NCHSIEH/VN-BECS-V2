import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const donationId = data.customDonationId || `=W0000 24 ${Math.floor(Math.random() * 900000 + 100000)}`;
    
    // Verify Donor Exists and is not deferred
    const donors = await db.donors.getAll();
    const donor = donors.find(d => d.id === data.donorId);
    if (!donor) {
      return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
    }

    if (donor.deferralStatus === 'Active') {
      return NextResponse.json({ error: 'Systemic Guardrail: Donor is currently deferred. Phlebotomy cannot proceed.' }, { status: 403 });
    }

    // 1. Create Donation Record
    await db.donations.create({
      id: donationId,
      donorId: data.donorId,
      volume: data.volume,
      donationType: data.type,
      collectedAt: new Date().toISOString()
    });

    // 2. Initialize Lab Tests (IDM Pending)
    await db.lab_tests.create({
      id: `LAB-${donationId.replace(/\s+/g, '')}`,
      donationId: donationId,
      idmStatus: 'PENDING',
      testedAt: null
    });

    return NextResponse.json({ success: true, donationId });
  } catch (error: any) {
    console.error('Collect Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
