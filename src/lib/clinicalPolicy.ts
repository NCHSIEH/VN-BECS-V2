/**
 * @fileoverview Versioned clinical policy registry (RTM-DON-03, RTM-EMG-01).
 *
 * Clinical rules that may change over time and that must be auditable at the
 * decision point are versioned here with effective dates. Decisions should
 * stamp the policy version they used so historical records remain interpretable
 * even after the policy changes.
 */

export interface PolicyVersion {
  id: string;
  version: string;
  effectiveFrom: string; // ISO date
  description: string;
}

export const DONOR_DEFERRAL_POLICY: PolicyVersion = {
  id: 'DONOR_DEFERRAL',
  version: 'VN26-2013-r1',
  effectiveFrom: '2013-09-15',
  description: 'Vietnam Circular 26/2013/TT-BYT donor deferral rules.',
};

export const EMERGENCY_RELEASE_POLICY: PolicyVersion = {
  id: 'EMERGENCY_RELEASE',
  version: 'EMG-r1',
  effectiveFrom: '2026-01-01',
  description: 'Emergency / MTP uncrossmatched release governance.',
};

/** Hours within which an emergency release must be clinically reviewed. */
export const EMERGENCY_REVIEW_SLA_HOURS = 24;

export type PatientCategory =
  | 'Adult'
  | 'Pediatric'
  | 'FemaleChildbearingPotential'
  | 'Unknown';

export interface EmergencyReleaseRequest {
  approverId?: string | null; // authorizing clinician
  indication?: string | null; // clinical indication / scenario
  patientCategory?: PatientCategory;
  rhdChoice?: 'RhD-Negative' | 'RhD-Positive';
}

export interface EmergencyReleaseDecision {
  valid: boolean;
  errors: string[];
  reviewDueAt?: string;
  policyVersion: string;
}

/**
 * Validate the governance of an emergency / MTP uncrossmatched release.
 *
 * Hard requirements:
 *  - an authorizing clinician (approver),
 *  - a documented clinical indication,
 *  - for patients of unknown identity or female of childbearing potential, the
 *    RhD choice (when specified) must be RhD-Negative.
 *
 * Returns a review-due timestamp so the post-event review SLA can be tracked.
 */
export function validateEmergencyRelease(
  req: EmergencyReleaseRequest,
  now: Date = new Date(),
): EmergencyReleaseDecision {
  const errors: string[] = [];

  if (!req.approverId || String(req.approverId).trim() === '') {
    errors.push('Emergency release requires an authorizing clinician (approver).');
  }
  if (!req.indication || String(req.indication).trim() === '') {
    errors.push('Emergency release requires a documented clinical indication.');
  }

  const needsRhDNeg =
    req.patientCategory === 'FemaleChildbearingPotential' || req.patientCategory === 'Unknown';
  if (needsRhDNeg && req.rhdChoice && req.rhdChoice !== 'RhD-Negative') {
    errors.push(
      '[Policy] Patients of unknown identity or female of childbearing potential must receive RhD-Negative units in emergency release.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    reviewDueAt: new Date(now.getTime() + EMERGENCY_REVIEW_SLA_HOURS * 60 * 60 * 1000).toISOString(),
    policyVersion: EMERGENCY_RELEASE_POLICY.version,
  };
}
