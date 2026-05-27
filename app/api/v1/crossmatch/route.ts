import { NextResponse } from 'next/server';
import { isAboRhdCompatible } from '@/src/lib/bloodSafety';
import * as db from '@/src/server/db';
import { validateSpecimenDate } from '@/src/lib/validators';

export async function GET() {
  try {
    const records = await db.crossmatch.getAll();
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { componentId, patientId, method, specimenDate, testedBy } = data;

    if (!componentId || !patientId || !method || !specimenDate || !testedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const specimenVal = validateSpecimenDate(specimenDate);
    if (!specimenVal.valid) {
      return NextResponse.json({ error: specimenVal.errors.join(", ") }, { status: 400 });
    }

    // Load Blood Component
    const components = await db.components.getAll();
    const component = components.find(c => c.id === componentId || c.donationId === componentId);

    if (!component) {
      return NextResponse.json({ error: 'Blood component not found in system' }, { status: 404 });
    }

    // In a real system, component ABO/Rh is either on the component or joined from donations/lab_tests
    // For this simulation, let's assume it's available or we mock it.
    // Let's retrieve the donation to get the blood type.
    const donations = await db.donations.getAll();
    const donation = donations.find(d => d.id === component.donationId);
    const donors = await db.donors.getAll();
    const donor = donors.find(d => d.id === donation?.donorId);

    if (!donor) {
      return NextResponse.json({ error: 'Source donor data not found for component' }, { status: 404 });
    }

    // Load Patient
    const patients = await db.patients.getAll();
    const patient = patients.find(p => p.id === patientId || p.mrn === patientId);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (patient.abo === 'Unknown' || patient.rhd === 'Unknown') {
      return NextResponse.json({ error: 'Patient blood type is Unknown, cannot crossmatch' }, { status: 400 });
    }

    // Perform Strict Validation
    const isCompatible = isAboRhdCompatible(donor.bloodType, donor.rhd, patient.abo, patient.rhd);
    let result = isCompatible ? 'Compatible' : 'Incompatible';

    const hasAntibodies = patient.antibodyHistory && patient.antibodyHistory.length > 0;

    // AABB SOP 7: Method validations based on antibody history
    if (method === 'EXM' && hasAntibodies) {
      return NextResponse.json({ error: '🚨 SAFETY BLOCK: EXM (Electronic Crossmatch) is NOT permitted for patients with a history of antibodies. Full AHG crossmatch is required by AABB standards.' }, { status: 400 });
    }

    if (method === 'IS' && hasAntibodies) {
      return NextResponse.json({ error: '🚨 SAFETY BLOCK: IS (Immediate Spin) is NOT sufficient for patients with known antibodies. Full AHG crossmatch is required.' }, { status: 400 });
    }

    const record = {
      id: `XM-${Math.floor(Math.random() * 900000) + 100000}`,
      componentId,
      patientId: patient.id,
      method,
      result,
      testedBy,
      specimenDate,
      createdAt: new Date().toISOString()
    };

    await db.crossmatch.create(record);

    // If compatible, we could update the component status to CROSSMATCHED or RESERVED
    if (result === 'Compatible' && component.status === 'AVAILABLE') {
       await db.components.updateStatus(component.id, 'CROSSMATCHED');
    }

    return NextResponse.json({ success: true, result, id: record.id });
  } catch (error: any) {
    console.error("Crossmatch API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
