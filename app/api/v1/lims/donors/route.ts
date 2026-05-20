import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { LocalCCCDValidator, validateDonorAge, validateDonorName } from '@/src/lib/validators';

export async function GET() {
  try {
    const donors = await db.donors.getAll();
    return NextResponse.json(donors);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Server-Side Hard Gating Validation
    if (!data.name || !data.nationalId || !data.dob) {
      return NextResponse.json({ error: 'Missing required fields (name, nationalId, dob)' }, { status: 400 });
    }

    const nameVal = validateDonorName(data.name);
    if (!nameVal.valid) {
      return NextResponse.json({ error: nameVal.errors.join(", ") }, { status: 400 });
    }

    const cccdVal = LocalCCCDValidator.validate(data.nationalId);
    if (!cccdVal.valid) {
      return NextResponse.json({ error: `Vietnam CCCD Invalid: ${cccdVal.errors.join(", ")}` }, { status: 400 });
    }

    const ageVal = validateDonorAge(data.dob);
    if (!ageVal.valid) {
      return NextResponse.json({ error: `Age Restriction: ${ageVal.errors.join(", ")}` }, { status: 400 });
    }

    const id = `D-${Math.floor(Math.random() * 90000) + 10000}`;
    const donorData = {
      ...data,
      id,
      registeredAt: new Date().toISOString()
    };

    // Remove transient questionnaire fields from donor record if needed, though they might just be ignored by db layer if not in schema.
    delete donorData.hadTattooRecently;
    delete donorData.traveledToMalariaZone;
    delete donorData.feelingUnwell;
    delete donorData.hasHighRiskCondition;

    await db.donors.create(donorData);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Donors API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
