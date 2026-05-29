import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const donor = await db.rareDonors.getById(id);
    if (!donor) {
      return apiErrorResponse({
        request,
        code: 'RARE_DONOR_NOT_FOUND',
        message: 'Rare donor not found',
        status: 404,
      });
    }

    // Safeguard: Check if donor has an active deferral in either rare Donors or general Donors db
    const allDonors = await db.donors.getAll();
    const generalDonor = allDonors.find(
      (d: any) => d.nationalId === donor.nationalId || d.id === donor.id || d.name === donor.name
    );

    if (
      donor.deferralStatus === 'Active' || 
      donor.status === 'Deferred' || 
      donor.status?.toUpperCase() === 'DEFERRED' ||
      (generalDonor && generalDonor.deferralStatus === 'Active')
    ) {
      return apiErrorResponse({
        request,
        code: 'RARE_DONOR_DEFERRED',
        message: 'SAFETY BLOCK: Rare donor is currently deferred. Mobilization cannot proceed.',
        status: 403,
        details: {
          severity: 'HardStop',
          actionRequired: 'Do not mobilize this donor until the active deferral is reviewed and resolved.',
        },
      });
    }

    // Update status to MOBILIZED
    const updated = await db.rareDonors.update(id, { status: 'MOBILIZED' });

    // Log mobilization event
    await db.auditEvents.create({
       actorRole: 'Specialist',
       eventType: 'RARE_MOBILIZATION',
       objectId: id,
       details: `Emergency mobilization triggered for ${donor.phenotype} donor ${donor.name}`,
       timestamp: new Date().toISOString()
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalErrorResponse(request, error, 'RARE_DONOR_MOBILIZE_FAILED');
  }
}

