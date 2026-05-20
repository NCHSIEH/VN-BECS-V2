/**
 * @fileoverview Input Validation Module (Implementation Plan §8)
 *
 * Provides dual-layer validation: frontend uses for instant UX feedback,
 * backend uses as the authoritative security guard.
 *
 * All validators return { valid, errors } — errors array is empty if valid.
 */

import type {
  AboType, RhdType, DonationType, OrderPriority,
  CrossmatchMethod, CrossmatchResult, AdverseReactionType,
  IdmStatus,
} from '../types';

/** Validation result for any field or entity. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Vietnam CCCD Validation (T-008, T-009) ──────────────────────────────────

/**
 * Vietnam CCCD (Citizen Identity Card) adapter interface.
 * Initial implementation: local checksum validation.
 * Future: can be swapped to call Vietnam National API.
 *
 * @see Implementation Plan §4 SOP1: ICitizenVerificationAdapter
 */
export interface ICitizenVerificationAdapter {
  validate(cccd: string): ValidationResult;
}

/**
 * Local CCCD validator using format + checksum verification.
 *
 * Vietnam CCCD format:
 * - Exactly 12 digits
 * - First 3 digits: province code (001-096)
 * - Digit 4: gender + century (0/1=male 1900s/2000s, 2/3=female 1900s/2000s, etc.)
 * - Digits 5-6: birth year (last 2 digits)
 * - Digits 7-12: random sequence
 */
export const LocalCCCDValidator: ICitizenVerificationAdapter = {
  validate(cccd: string): ValidationResult {
    const errors: string[] = [];

    if (!cccd) {
      errors.push('CCCD is required');
      return { valid: false, errors };
    }

    // Must be exactly 12 digits
    if (!/^\d{12}$/.test(cccd)) {
      errors.push('CCCD must be exactly 12 digits');
      return { valid: false, errors };
    }

    // Province code check (001-096)
    const provinceCode = parseInt(cccd.substring(0, 3), 10);
    if (provinceCode < 1 || provinceCode > 96) {
      errors.push(`Invalid province code: ${cccd.substring(0, 3)} (must be 001-096)`);
    }

    // Gender/century digit (0-9 valid)
    const genderDigit = parseInt(cccd[3], 10);
    if (genderDigit < 0 || genderDigit > 9) {
      errors.push('Invalid gender/century digit');
    }

    return { valid: errors.length === 0, errors };
  },
};

/**
 * Generate a valid random Vietnam CCCD for testing/seeding.
 * Replaces the legacy `generateValidTaiwanId()` function.
 */
export function generateValidCCCD(): string {
  // Random province code 001-096
  const province = String(Math.floor(Math.random() * 96) + 1).padStart(3, '0');
  // Gender/century digit (0-5 covers male/female for 1900s/2000s)
  const genderCentury = Math.floor(Math.random() * 6);
  // Birth year last 2 digits
  const birthYear = String(Math.floor(Math.random() * 60) + 40).padStart(2, '0'); // 40-99 → 1940-1999
  // Random 6-digit sequence
  const seq = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `${province}${genderCentury}${birthYear}${seq}`;
}

// ─── ISBT-128 Donation ID Validation ─────────────────────────────────────────

/**
 * Validates ISBT-128 Donation Identification Number (DIN) format.
 * Expected format: =W0000 YY NNNNNN (with or without spaces).
 */
export function validateISBT128DIN(din: string): ValidationResult {
  const errors: string[] = [];

  if (!din) {
    errors.push('Donation ID is required');
    return { valid: false, errors };
  }

  if (!din.startsWith('=')) {
    errors.push('ISBT-128 DIN must start with "="');
  }

  // Remove spaces for length check
  const cleaned = din.replace(/\s/g, '');
  if (cleaned.length < 13) {
    errors.push('ISBT-128 DIN is too short (min 13 characters)');
  }

  // Pattern check: =WNNNN YY NNNNNN
  const pattern = /^=W\d{4}\s?\d{2}\s?\d{6}$/;
  if (!pattern.test(din)) {
    errors.push('ISBT-128 DIN format invalid (expected: =W0000 YY NNNNNN)');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Donor Registration Validation (SOP 1) ───────────────────────────────────

/** Validates donor name field. */
export function validateDonorName(name: string): ValidationResult {
  const errors: string[] = [];
  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters');
  if (/^\d+$/.test(name.trim())) errors.push('Name cannot be purely numeric');
  return { valid: errors.length === 0, errors };
}

/**
 * Validates donor age for blood donation eligibility.
 * Vietnam blood donation age: 18-60 (may vary, using 16-65 as configured).
 */
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

/** Validates donor weight. */
export function validateDonorWeight(weight: number, gender: 'Male' | 'Female'): ValidationResult {
  const errors: string[] = [];
  if (gender === 'Male' && weight < 45) {
    errors.push(`Male donor must weigh at least 45kg (current: ${weight}kg)`);
  } else if (gender === 'Female' && weight < 42) {
    errors.push(`Female donor must weigh at least 42kg (current: ${weight}kg)`);
  }
  return { valid: errors.length === 0, errors };
}

/** Validates Vietnamese health deferral rules based on questionnaire answers. */
export function validateVietnamDeferralRules(answers: Record<string, boolean | string>): { deferred: boolean; reason?: string; until?: string } {
  const now = new Date();

  if (answers.hadTattooRecently) {
    const deferralDate = new Date(now);
    deferralDate.setMonth(deferralDate.getMonth() + 6);
    return { deferred: true, reason: 'Recent tattoo (within 6 months)', until: deferralDate.toISOString() };
  }

  if (answers.traveledToMalariaZone) {
    const deferralDate = new Date(now);
    deferralDate.setMonth(deferralDate.getMonth() + 12);
    return { deferred: true, reason: 'Traveled to malaria endemic zone (within 12 months)', until: deferralDate.toISOString() };
  }

  if (answers.feelingUnwell) {
    const deferralDate = new Date(now);
    deferralDate.setDate(deferralDate.getDate() + 7);
    return { deferred: true, reason: 'Currently feeling unwell', until: deferralDate.toISOString() };
  }

  if (answers.hasHighRiskCondition) {
    // Permanent deferral
    return { deferred: true, reason: 'Permanent deferral due to high-risk condition (e.g. HIV, Hepatitis)' };
  }

  return { deferred: false };
}

/** Validates blood collection volume. */
export function validateCollectionVolume(volume: number, donationType: DonationType): ValidationResult {
  const errors: string[] = [];
  if (volume < 200 || volume > 600) {
    errors.push('Volume must be between 200ml and 600ml');
  }
  if (donationType === 'Apheresis' && volume > 300) {
    errors.push('Apheresis volume must not exceed 300ml');
  }
  return { valid: errors.length === 0, errors };
}

// ─── Enum Validators ─────────────────────────────────────────────────────────

const VALID_ABO: ReadonlySet<string> = new Set(['A', 'B', 'O', 'AB']);
const VALID_RHD: ReadonlySet<string> = new Set(['Positive', 'Negative']);
const VALID_PRIORITIES: ReadonlySet<string> = new Set(['Routine', 'ASAP', 'STAT', 'MTP']);
const VALID_IDM: ReadonlySet<string> = new Set(['PENDING', 'CLEARED', 'REACTIVE']);
const VALID_CROSSMATCH_METHODS: ReadonlySet<string> = new Set(['IS', 'AHG', 'EXM']);
const VALID_REACTION_TYPES: ReadonlySet<string> = new Set([
  'FNHTR', 'ALLERGIC', 'ANAPHYLACTIC', 'AHTR', 'DHTR', 'TACO', 'TRALI', 'BACTERIAL',
]);

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

// ─── Order Validation (SOP 10) ───────────────────────────────────────────────

/** Validates order quantity against per-priority limits. */
export function validateOrderQuantity(qty: number, priority: OrderPriority): ValidationResult {
  const errors: string[] = [];
  const limits: Record<OrderPriority, number> = { Routine: 10, ASAP: 20, STAT: 50, MTP: 100 };
  if (qty < 1) errors.push('Quantity must be at least 1');
  if (qty > limits[priority]) errors.push(`Quantity exceeds limit for ${priority} (max: ${limits[priority]})`);
  return { valid: errors.length === 0, errors };
}

/** Validates priority vs. clinical indication cross-check. */
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

// ─── Crossmatch Validation (SOP 7) ──────────────────────────────────────────

/** Validates specimen date is within 3 days. */
export function validateSpecimenDate(specimenDate: string, maxDays = 3): ValidationResult {
  const errors: string[] = [];
  const specimen = new Date(specimenDate);
  const now = new Date();
  const diffDays = (now.getTime() - specimen.getTime()) / (24 * 60 * 60 * 1000);
  if (diffDays > maxDays) {
    errors.push(`Specimen is ${Math.floor(diffDays)} days old (max ${maxDays} days)`);
  }
  return { valid: errors.length === 0, errors };
}

// ─── Bedside Verification (SOP 6) ───────────────────────────────────────────

/** Validates that verifier1 and verifier2 are different people. */
export function validateDualVerifiers(verifier1: string, verifier2: string): ValidationResult {
  const errors: string[] = [];
  if (!verifier1) errors.push('Primary verifier is required');
  if (!verifier2) errors.push('Second verifier PIN is required');
  if (verifier1 && verifier2 && verifier1 === verifier2) {
    errors.push('Second verifier must be a different person from primary verifier');
  }
  return { valid: errors.length === 0, errors };
}

// ─── Expiry Check (Global) ──────────────────────────────────────────────────

/** Checks if a blood unit has expired. */
export function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

/**
 * Returns days until expiry (negative if already expired).
 * Used for FEFO sorting and expiry alerts (§10.2).
 */
export function daysUntilExpiry(expiryDate: string): number {
  const diff = new Date(expiryDate).getTime() - new Date().getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}
