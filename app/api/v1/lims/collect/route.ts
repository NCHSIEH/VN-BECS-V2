import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';
import { validateCollectionVolume } from '@/src/lib/validators';
import { parseDin } from '@/src/lib/isbt128';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['DonorScreener', 'LIMS_Simulator', 'Admin'],
      action: 'LIMS_COLLECTION_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    const donationId = data.customDonationId || `=W0000 24 ${Math.floor(Math.random() * 900000 + 100000)}`;
    
    // Verify Donor Exists and is not deferred
    const donors = await db.donors.getAll();
    const donor = donors.find(d => d.id === data.donorId);
    if (!donor) {
      return apiErrorResponse({
        request,
        code: 'DONOR_NOT_FOUND',
        message: 'Donor not found',
        status: 404,
      });
    }

    if (donor.deferralStatus === 'Active') {
      return apiErrorResponse({
        request,
        code: 'DONOR_DEFERRED',
        message: 'Systemic Guardrail: Donor is currently deferred. Phlebotomy cannot proceed.',
        status: 403,
        details: {
          severity: 'HardStop',
          actionRequired: 'Do not collect blood until donor deferral has been clinically reviewed and cleared.',
        },
      });
    }

    // Server-side collection volume guard (VN26 weight-linked limits) — RTM-DON-02.
    const volumeCheck = validateCollectionVolume(
      Number(data.volume),
      data.type,
      donor.weight !== undefined && donor.weight !== null ? Number(donor.weight) : undefined,
    );
    if (!volumeCheck.valid) {
      return apiErrorResponse({
        request,
        code: 'COLLECTION_VOLUME_INVALID',
        message: volumeCheck.errors.join('; '),
        status: 400,
        details: { severity: 'HardStop', actionRequired: 'Adjust collection volume to comply with donor weight limits.' },
      });
    }

    // If a DIN barcode was supplied manually, validate its ISBT 128 structure
    // (and check character when present) before persisting — RTM-LBL-01.
    if (data.customDonationId) {
      const parsed = parseDin(data.customDonationId);
      if (!parsed.valid) {
        return apiErrorResponse({
          request,
          code: 'INVALID_ISBT128_DIN',
          message: `Invalid ISBT 128 DIN: ${parsed.errors.join('; ')}`,
          status: 400,
          details: { severity: 'HardStop', actionRequired: 'Re-scan or correct the donation identification number.' },
        });
      }
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
    return internalErrorResponse(request, error, 'LIMS_COLLECTION_FAILED');
  }
}
