import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { FhirAdapter } from '@/src/lib/FhirAdapter';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('type') || 'Patient';
    const id = searchParams.get('id');

    if (resourceType === 'Patient') {
      const patients = await db.patients.getAll();
      if (id) {
        const patient = patients.find((p: any) => p.id === id || p.mrn === id);
        if (!patient) {
          return apiErrorResponse({
            request,
            code: 'FHIR_PATIENT_NOT_FOUND',
            message: 'Patient not found',
            status: 404,
          });
        }
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
        if (!unit) {
          return apiErrorResponse({
            request,
            code: 'FHIR_PRODUCT_NOT_FOUND',
            message: 'BiologicallyDerivedProduct not found',
            status: 404,
          });
        }
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

    // Additional clinical resources (RTM-FHIR-01)
    const bundle = (entries: any[]) => ({ resourceType: 'Bundle', type: 'searchset', entry: entries.map((resource) => ({ resource })) });

    if (resourceType === 'ServiceRequest') {
      const orders = await db.orders.getAll();
      const list = id ? orders.filter((o: any) => o.id === id) : orders;
      return NextResponse.json(id ? FhirAdapter.toFhirServiceRequest(list[0]) : bundle(list.map((o: any) => FhirAdapter.toFhirServiceRequest(o))));
    }

    if (resourceType === 'DiagnosticReport') {
      const labs = await db.lab_tests.getAll();
      const list = id ? labs.filter((l: any) => l.id === id || l.donationId === id) : labs;
      return NextResponse.json(id ? FhirAdapter.toFhirDiagnosticReport(list[0]) : bundle(list.map((l: any) => FhirAdapter.toFhirDiagnosticReport(l))));
    }

    if (resourceType === 'Specimen') {
      const xms = await db.crossmatch.getAll();
      const list = id ? xms.filter((x: any) => x.id === id) : xms;
      return NextResponse.json(id ? FhirAdapter.toFhirSpecimen(list[0]) : bundle(list.map((x: any) => FhirAdapter.toFhirSpecimen(x))));
    }

    if (resourceType === 'SupplyDelivery') {
      const issues = await db.issueRecords.getAll();
      const list = id ? issues.filter((i: any) => i.id === id) : issues;
      return NextResponse.json(id ? FhirAdapter.toFhirSupplyDelivery(list[0]) : bundle(list.map((i: any) => FhirAdapter.toFhirSupplyDelivery(i))));
    }

    if (resourceType === 'Procedure') {
      const transfusions = await db.transfusions.getAll();
      const list = id ? transfusions.filter((t: any) => t.id === id) : transfusions;
      return NextResponse.json(id ? FhirAdapter.toFhirProcedure(list[0]) : bundle(list.map((t: any) => FhirAdapter.toFhirProcedure(t))));
    }

    if (resourceType === 'AdverseEvent') {
      const reactions = await db.adverseReactions.getAll();
      const list = id ? reactions.filter((r: any) => r.id === id) : reactions;
      return NextResponse.json(id ? FhirAdapter.toFhirAdverseEvent(list[0]) : bundle(list.map((r: any) => FhirAdapter.toFhirAdverseEvent(r))));
    }

    return apiErrorResponse({
      request,
      code: 'FHIR_RESOURCE_TYPE_UNSUPPORTED',
      message: 'Unsupported resource type',
      status: 400,
    });
  } catch (error) {
    return internalErrorResponse(request, error, 'FHIR_READ_FAILED');
  }
}
