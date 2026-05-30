import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { VietnamIdValidator, validateDonorAge, validateDonorName } from '@/src/lib/validators';
import { DONOR_DEFERRAL_POLICY } from '@/src/lib/clinicalPolicy';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONOR_READ',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const donor = await db.donors.getById(params.id);
    if (!donor) {
      return apiErrorResponse({ request, code: 'DONOR_NOT_FOUND', message: `Donor ${params.id} not found`, status: 404 });
    }
    return NextResponse.json(donor);
  } catch (error) {
    return internalErrorResponse(request, error, 'LIMS_DONOR_GET_FAILED');
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const authz = authorizeApiRole({
      request,
      body: data,
      allowedRoles: ['Admin', 'LIMS_Simulator', 'DonorScreener'],
      action: 'LIMS_DONOR_UPDATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

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
      return apiErrorResponse({ request, code: 'DONOR_NAME_INVALID', message: nameVal.errors.join(', '), status: 400 });
    }

    const cccdVal = VietnamIdValidator.validate(data.nationalId);
    if (!cccdVal.valid) {
      return apiErrorResponse({
        request,
        code: 'DONOR_CCCD_INVALID',
        message: `Vietnam CCCD Invalid: ${cccdVal.errors.join(', ')}`,
        status: 400,
      });
    }

    const ageVal = validateDonorAge(data.dob);
    if (!ageVal.valid) {
      return apiErrorResponse({
        request,
        code: 'DONOR_AGE_RESTRICTED',
        message: `Age Restriction: ${ageVal.errors.join(', ')}`,
        status: 400,
      });
    }

    const existing = await db.donors.getById(params.id);
    if (!existing) {
      return apiErrorResponse({ request, code: 'DONOR_NOT_FOUND', message: `Donor ${params.id} not found`, status: 404 });
    }

    // Strip transient questionnaire fields before updating the donor record
    const {
      hadTattooRecently, traveledToMalariaZone, feelingUnwell,
      hasHighRiskCondition, recentVaccine, recentDentalSurgery, pregnancyOrLactation,
      ...donorUpdates
    } = data;

    await db.donors.update(params.id, { ...donorUpdates, id: params.id });

    // Record updated questionnaire entry (appends history; prior entry is preserved)
    const questionnaireId = `QST-${Math.floor(Math.random() * 9000) + 1000}`;
    const answersJson = JSON.stringify({
      hadTattooRecently: !!hadTattooRecently,
      traveledToMalariaZone: !!traveledToMalariaZone,
      feelingUnwell: !!feelingUnwell,
      hasHighRiskCondition: !!hasHighRiskCondition,
      recentVaccine: !!recentVaccine,
      recentDentalSurgery: !!recentDentalSurgery,
      pregnancyOrLactation: !!pregnancyOrLactation,
    });
    const isPassed = data.deferralStatus === 'Active' ? 0 : 1;

    let questionnaireWarning: string | undefined;
    try {
      await db.questionnaires.create({
        id: questionnaireId,
        donorId: params.id,
        answersJson,
        isPassed,
        createdAt: new Date().toISOString(),
        deferralReason: data.deferralReason || '',
        deferralUntil: data.deferralUntil || '',
        policyVersion: data.policyVersion || DONOR_DEFERRAL_POLICY.version,
      });
    } catch (e) {
      console.error('Error saving updated questionnaire on donor edit:', e);
      // Donor record is already updated — return 200 with a warning so the caller
      // knows the questionnaire append failed and can surface it to clinical staff.
      questionnaireWarning = 'questionnaire_save_failed';
    }

    return NextResponse.json({
      success: true,
      id: params.id,
      ...(questionnaireWarning ? { warning: questionnaireWarning } : {}),
    });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'LIMS_DONOR_UPDATE_FAILED');
  }
}
