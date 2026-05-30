import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { VietnamIdValidator, validateDonorAge, validateDonorName } from '@/src/lib/validators';
import { DONOR_DEFERRAL_POLICY } from '@/src/lib/clinicalPolicy';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONOR_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const donors = await db.donors.getAll();
    return NextResponse.json(donors);
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_DONOR_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONOR_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    
    // Server-Side Hard Gating Validation
    if (!data.name || !data.nationalId || !data.dob) {
      return apiErrorResponse({
        request,
        code: 'DONOR_REQUIRED_FIELDS_MISSING',
        message: 'Missing required fields (name, nationalId, dob)',
        status: 400,
      });
    }

    const nameVal = validateDonorName(data.name);
    if (!nameVal.valid) {
      return apiErrorResponse({
        request,
        code: 'DONOR_NAME_INVALID',
        message: nameVal.errors.join(", "),
        status: 400,
      });
    }

    const cccdVal = VietnamIdValidator.validate(data.nationalId);
    if (!cccdVal.valid) {
      return apiErrorResponse({
        request,
        code: 'DONOR_CCCD_INVALID',
        message: `Vietnam CCCD Invalid: ${cccdVal.errors.join(", ")}`,
        status: 400,
      });
    }

    const ageVal = validateDonorAge(data.dob);
    if (!ageVal.valid) {
      return apiErrorResponse({
        request,
        code: 'DONOR_AGE_RESTRICTED',
        message: `Age Restriction: ${ageVal.errors.join(", ")}`,
        status: 400,
      });
    }

    const id = `D-${Math.floor(Math.random() * 90000) + 10000}`;
    const donorData = {
      ...data,
      id,
      registeredAt: new Date().toISOString()
    };

    // Save pre-donation health questionnaire answers to questionnaires table
    const questionnaireId = `QST-${Math.floor(Math.random() * 9000) + 1000}`;
    const answersJson = JSON.stringify({
      hadTattooRecently: !!data.hadTattooRecently,
      traveledToMalariaZone: !!data.traveledToMalariaZone,
      feelingUnwell: !!data.feelingUnwell,
      hasHighRiskCondition: !!data.hasHighRiskCondition,
      recentVaccine: !!data.recentVaccine,
      recentDentalSurgery: !!data.recentDentalSurgery,
      pregnancyOrLactation: !!data.pregnancyOrLactation
    });
    const isPassed = (data.deferralStatus === 'Active') ? 0 : 1;

    // Questionnaire is a mandatory safety record — failure is fatal.
    // Do NOT .catch() here; let errors propagate to the outer try/catch → 500.
    await db.questionnaires.create({
      id: questionnaireId,
      donorId: id,
      answersJson,
      isPassed,
      createdAt: new Date().toISOString(),
      deferralReason: data.deferralReason || '',
      deferralUntil: data.deferralUntil || '',
      // RTM-DON-03: stamp the deferral policy version used at decision time.
      policyVersion: data.policyVersion || DONOR_DEFERRAL_POLICY.version,
    });

    // Remove transient questionnaire fields from donor record if needed, though they might just be ignored by db layer if not in schema.
    delete donorData.hadTattooRecently;
    delete donorData.traveledToMalariaZone;
    delete donorData.feelingUnwell;
    delete donorData.hasHighRiskCondition;
    delete donorData.recentVaccine;
    delete donorData.recentDentalSurgery;
    delete donorData.pregnancyOrLactation;

    await db.donors.create(donorData);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'LIMS_DONOR_CREATE_FAILED');
  }
}
