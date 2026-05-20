import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { FhirAdapter } from '@/src/lib/FhirAdapter';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('type') || 'Patient';
    const id = searchParams.get('id');

    if (resourceType === 'Patient') {
      const patients = await db.patients.getAll();
      if (id) {
        const patient = patients.find((p: any) => p.id === id || p.mrn === id);
        if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(FhirAdapter.toFhirPatient(patient));
      }
      
      // Bundle of patients
      return NextResponse.json({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: patients.map((p: any) => ({
          resource: FhirAdapter.toFhirPatient(p)
        }))
      });
    }

    if (resourceType === 'BiologicallyDerivedProduct') {
      const inventory = await db.inventory.getAll();
      if (id) {
        const unit = inventory.find((u: any) => u.unitId === id);
        if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(FhirAdapter.toFhirProduct(unit));
      }
      
      return NextResponse.json({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: inventory.map((u: any) => ({
          resource: FhirAdapter.toFhirProduct(u)
        }))
      });
    }

    return NextResponse.json({ error: 'Unsupported resource type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
