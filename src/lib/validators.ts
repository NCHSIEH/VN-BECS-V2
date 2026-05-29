import type { ValidationResult, OrderPriority, DonationType } from '../types';
import { DONOR_DEFERRAL_POLICY } from './clinicalPolicy';

/**
 * Validates a 12-digit Vietnam Citizen Identity Card (CCCD) number.
 */
export const VietnamIdValidator = {
  validate(cccd: string): ValidationResult {
    const errors: string[] = [];

    if (!cccd) {
      errors.push('CCCD is required');
      return { valid: false, errors };
    }

    if (!/^\d{12}$/.test(cccd)) {
      errors.push('CCCD must be exactly 12 digits');
      return { valid: false, errors };
    }

    const provinceCode = parseInt(cccd.substring(0, 3), 10);
    if (provinceCode < 1 || provinceCode > 96) {
      errors.push(`Invalid province code: ${cccd.substring(0, 3)} (must be 001-096)`);
    }

    const genderDigit = parseInt(cccd[3], 10);
    if (genderDigit < 0 || genderDigit > 9) {
      errors.push('Invalid gender/century digit');
    }

    return { valid: errors.length === 0, errors };
  },
};

export function generateValidCCCD(): string {
  const province = String(Math.floor(Math.random() * 96) + 1).padStart(3, '0');
  const genderCentury = Math.floor(Math.random() * 6);
  const birthYear = String(Math.floor(Math.random() * 60) + 40).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${province}${genderCentury}${birthYear}${seq}`;
}

export function validateISBT128DIN(din: string): ValidationResult {
  const errors: string[] = [];
  if (!din) {
    errors.push('Donation ID is required');
    return { valid: false, errors };
  }
  if (!din.startsWith('=')) {
    errors.push('ISBT-128 DIN must start with "="');
  }
  const cleaned = din.replace(/\s/g, '');
  if (cleaned.length < 13) {
    errors.push('ISBT-128 DIN is too short (min 13 characters)');
  }
  const pattern = /^=W\d{4}\s?\d{2}\s?\d{6}$/;
  if (!pattern.test(din)) {
    errors.push('ISBT-128 DIN format invalid (expected: =W0000 YY NNNNNN)');
  }
  return { valid: errors.length === 0, errors };
}

export function validateDonorName(name: string): ValidationResult {
  const errors: string[] = [];
  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (/^\d+$/.test(name.trim())) errors.push('Name cannot be purely numeric');
  return { valid: errors.length === 0, errors };
}

export function validateDonorAge(dob: string, minAge = 18, maxAge = 60): ValidationResult {
  const errors: string[] = [];
  const birthDate = new Date(dob);
  const now = new Date();
  if (isNaN(birthDate.getTime())) {
    errors.push('Invalid date of birth');
    return { valid: false, errors };
  }
  if (birthDate > now) {
    errors.push('Date of birth cannot be in the future');
    return { valid: false, errors };
  }
  const age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < minAge) errors.push(`Donor must be at least ${minAge} years old (current: ${age})`);
  if (age > maxAge) errors.push(`Donor must be at most ${maxAge} years old (current: ${age})`);
  return { valid: errors.length === 0, errors };
}

export function validateDonorWeight(weight: number, gender: 'Male' | 'Female'): ValidationResult {
  const errors: string[] = [];
  if (gender === 'Male' && weight < 45) {
    errors.push(`Male donor must weigh at least 45kg (current: ${weight}kg)`);
  } else if (gender === 'Female' && weight < 42) {
    errors.push(`Female donor must weigh at least 42kg (current: ${weight}kg)`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateVietnamDeferralRules(answers: Record<string, boolean | string>): { deferred: boolean; reason?: string; until?: string; policyVersion: string } {
  const now = new Date();
  const policyVersion = DONOR_DEFERRAL_POLICY.version;
  if (answers.hadTattooRecently) {
    const deferralDate = new Date(now);
    deferralDate.setMonth(deferralDate.getMonth() + 6);
    return { deferred: true, reason: 'Recent tattoo (within 6 months)', until: deferralDate.toISOString(), policyVersion };
  }
  if (answers.traveledToMalariaZone) {
    const deferralDate = new Date(now);
    deferralDate.setMonth(deferralDate.getMonth() + 12);
    return { deferred: true, reason: 'Traveled to malaria endemic zone (within 12 months)', until: deferralDate.toISOString(), policyVersion };
  }
  if (answers.feelingUnwell) {
    const deferralDate = new Date(now);
    deferralDate.setDate(deferralDate.getDate() + 7);
    return { deferred: true, reason: 'Currently feeling unwell', until: deferralDate.toISOString(), policyVersion };
  }
  if (answers.hasHighRiskCondition) {
    return { deferred: true, reason: 'Permanent deferral due to high-risk condition (e.g. HIV, Hepatitis)', policyVersion };
  }
  if (answers.recentVaccine) {
    const deferralDate = new Date(now);
    deferralDate.setDate(deferralDate.getDate() + 28);
    return { deferred: true, reason: 'Recent live vaccine (within 4 weeks)', until: deferralDate.toISOString(), policyVersion };
  }
  if (answers.recentDentalSurgery) {
    const deferralDate = new Date(now);
    deferralDate.setDate(deferralDate.getDate() + 7);
    return { deferred: true, reason: 'Recent dental or minor surgery (within 7 days)', until: deferralDate.toISOString(), policyVersion };
  }
  if (answers.pregnancyOrLactation) {
    const deferralDate = new Date(now);
    deferralDate.setMonth(deferralDate.getMonth() + 6);
    return { deferred: true, reason: 'Recent pregnancy or current lactation (within 6 months)', until: deferralDate.toISOString(), policyVersion };
  }
  return { deferred: false, policyVersion };
}

/**
 * Minimum interval between whole-blood donations (VN26 / AABB: typically 12
 * weeks / 84 days). Returns the number of full weeks since the last donation
 * and whether the donor is eligible again.
 */
export function validateDonationInterval(
  lastDonationISO: string | null | undefined,
  now: Date = new Date(),
  minWeeks = 12,
): { eligible: boolean; weeksSinceLast: number | null; weeksRequired: number } {
  if (!lastDonationISO) {
    return { eligible: true, weeksSinceLast: null, weeksRequired: minWeeks };
  }
  const last = new Date(lastDonationISO);
  if (Number.isNaN(last.getTime())) {
    return { eligible: true, weeksSinceLast: null, weeksRequired: minWeeks };
  }
  const weeks = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 7);
  return {
    eligible: weeks >= minWeeks,
    weeksSinceLast: Math.floor(weeks),
    weeksRequired: minWeeks,
  };
}

export function validateCollectionVolume(
  volume: number,
  donationType: DonationType,
  weightKg?: number,
): ValidationResult {
  const errors: string[] = [];
  if (volume < 200) {
    errors.push('Volume must be at least 200ml');
  }
  if (donationType === 'Apheresis' && volume > 300) {
    errors.push('Apheresis volume must not exceed 300ml');
  }

  // Vietnam Circular 26/2013/TT-BYT whole-blood limits (donor weight linked).
  if (donationType !== 'Apheresis') {
    // Hard cap: < 500ml per whole-blood donation.
    if (volume >= 500) {
      errors.push('[VN26] Whole blood donation must be less than 500ml');
    }
    if (weightKg !== undefined) {
      if (weightKg < 42) {
        errors.push(`[VN26] Donor weight ${weightKg}kg is below the 42kg minimum for whole blood`);
      } else if (weightKg < 45) {
        // 42kg to <45kg: may donate < 250ml only.
        if (volume >= 250) {
          errors.push(`[VN26] Donors 42–45kg may donate less than 250ml (requested ${volume}ml)`);
        }
      }
      // >= 45kg: bounded by the < 500ml hard cap above. The per-kg ceiling
      // (e.g. ~10.5 ml/kg) is a local clinical policy decision and should be
      // configured per facility rather than hard-coded here.
    }
  } else if (volume > 600) {
    errors.push('Volume must not exceed 600ml');
  }

  return { valid: errors.length === 0, errors };
}

const VALID_ABO: ReadonlySet<string> = new Set(['A', 'B', 'O', 'AB']);
const VALID_RHD: ReadonlySet<string> = new Set(['Positive', 'Negative']);
const VALID_PRIORITIES: ReadonlySet<string> = new Set(['Routine', 'ASAP', 'STAT', 'MTP']);

export function validateAbo(abo: string): ValidationResult {
  return VALID_ABO.has(abo)
    ? { valid: true, errors: [] }
    : { valid: false, errors: [`Invalid ABO type: ${abo}`] };
}

export function validateRhd(rhd: string): ValidationResult {
  return VALID_RHD.has(rhd)
    ? { valid: true, errors: [] }
    : { valid: false, errors: [`Invalid Rh factor: ${rhd}`] };
}

export function validatePriority(p: string): ValidationResult {
  return VALID_PRIORITIES.has(p)
    ? { valid: true, errors: [] }
    : { valid: false, errors: [`Invalid priority: ${p}`] };
}

export function validateOrderQuantity(qty: number, priority: OrderPriority): ValidationResult {
  const errors: string[] = [];
  const limits: Record<OrderPriority, number> = { Routine: 10, ASAP: 20, STAT: 50, MTP: 100 };
  if (qty < 1) errors.push('Quantity must be at least 1');
  if (qty > limits[priority]) errors.push(`Quantity exceeds limit for ${priority} (max: ${limits[priority]})`);
  return { valid: errors.length === 0, errors };
}

export function validatePriorityIndication(priority: OrderPriority, indication?: string): ValidationResult {
  const errors: string[] = [];
  if (priority === 'STAT' && indication && !['Hemorrhage', 'Trauma'].includes(indication)) {
    errors.push('STAT priority requires Hemorrhage or Trauma indication');
  }
  if (priority === 'Routine' && indication === 'Hemorrhage') {
    errors.push('Routine priority cannot be used with Hemorrhage indication');
  }
  return { valid: errors.length === 0, errors };
}

export function validateSpecimenDate(specimenDate: string, maxDays = 3): ValidationResult {
  const errors: string[] = [];
  const specimen = new Date(specimenDate);
  const now = new Date();
  const diffDays = (now.getTime() - specimen.getTime()) / (24 * 60 * 60 * 1000);
  if (diffDays > maxDays) {
    errors.push(`Specimen is ${Math.floor(diffDays)} days old (max ${maxDays} days). Mandatory re-draw required.`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateDualVerifiers(verifier1: string, verifier2: string): ValidationResult {
  const errors: string[] = [];
  if (!verifier1) errors.push('Primary verifier is required');
  if (!verifier2) errors.push('Second verifier PIN is required');
  if (verifier1 && verifier2 && verifier1 === verifier2) {
    errors.push('Second verifier must be a different person from primary verifier (SOP 6 Dual Verification).');
  }
  return { valid: errors.length === 0, errors };
}

export function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

export function daysUntilExpiry(expiryDate: string): number {
  const diff = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}
