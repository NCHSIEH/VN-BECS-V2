export function validateISBT128(barcode: string): { valid: boolean; error?: string } {
  if (!barcode) return { valid: false, error: 'Empty barcode' };
  if (!barcode.startsWith('=')) {
    return { valid: false, error: 'ISBT 128 條碼格式必須以 "=" 開頭' };
  }
  const cleaned = barcode.replace(/\s/g, '');
  if (cleaned.length < 13) {
    return { valid: false, error: 'ISBT 128 條碼長度不足' };
  }
  return { valid: true };
}

/**
 * Red-cell (RBC) ABO/Rh compatibility.
 *
 * NOTE: This is the donor-RED-CELL rule (donor antigens must be tolerated by
 * the recipient's plasma antibodies). It is correct for RBC / packed cells only.
 * For plasma and platelets the ABO direction differs — use
 * {@link evaluateComponentCompatibility} which is component-class aware (RTM-XM-01).
 * Retained as-is for backward compatibility.
 */
export function isAboRhdCompatible(donorAbo: string, donorRhd: string, patientAbo: string, patientRhd: string): boolean {
  // O型可以給 O, A, B, AB
  // A型可以給 A, AB
  // B型可以給 B, AB
  // AB型只能給 AB
  const aboCompatible = (donorAbo === 'O') ||
                        (donorAbo === patientAbo) ||
                        (patientAbo === 'AB');

  // RhD 陰性可以給 陰性、陽性
  // RhD 陽性只能給 陽性
  const rhdCompatible = (donorRhd === 'Negative') || (patientRhd === 'Positive');

  return aboCompatible && rhdCompatible;
}

// ---------------------------------------------------------------------------
// Component-class-aware compatibility engine (RTM-XM-01)
// ---------------------------------------------------------------------------

export type ComponentCategory = 'RBC' | 'PLASMA' | 'PLATELET' | 'WHOLE_BLOOD' | 'UNKNOWN';

export interface ComponentCompatibilityResult {
  compatible: boolean;
  category: ComponentCategory;
  severity: 'OK' | 'Warning' | 'Incompatible';
  /** Whether a clinically-allowed-but-non-ideal match needs documented review. */
  requiresReview: boolean;
  reason: string;
}

const ABO_SET = new Set(['A', 'B', 'O', 'AB']);

function normalizeAbo(abo: string): string {
  return (abo || '').trim().toUpperCase();
}

/** Accepts 'Positive'/'Negative'/'+'/'-'/'Pos'/'Neg' and returns true if RhD negative. */
export function isRhdNegative(rhd: string): boolean {
  const s = (rhd || '').trim().toUpperCase();
  return s === 'NEGATIVE' || s === 'NEG' || s === '-' || s === 'RH-' || s === 'RHD-';
}

/** Best-effort classification from a component type, productCode, or class string. */
export function classifyComponent(input?: string): ComponentCategory {
  const s = (input || '').toUpperCase();
  if (/WHOLE[\s_-]?BLOOD|\bWB\b/.test(s)) return 'WHOLE_BLOOD';
  if (/RBC|RED[\s_-]?CELL|PRBC|PACKED/.test(s)) return 'RBC';
  if (/FFP|PLASMA|CRYO|\bFP\b/.test(s)) return 'PLASMA';
  if (/PLT|PLATELET|APHERESIS/.test(s)) return 'PLATELET';
  return 'UNKNOWN';
}

/** Donor red-cell antigens tolerated by recipient (cell rule). */
function aboCellsCompatible(donorAbo: string, patientAbo: string): boolean {
  return donorAbo === 'O' || donorAbo === patientAbo || patientAbo === 'AB';
}

/** Donor plasma antibodies tolerated by recipient (reverse/plasma rule). */
function aboPlasmaCompatible(donorAbo: string, patientAbo: string): boolean {
  return donorAbo === 'AB' || donorAbo === patientAbo || patientAbo === 'O';
}

/** Donor red-cell RhD tolerated by recipient: Rh- universal, Rh+ only to Rh+. */
function rhdCellsCompatible(donorRhd: string, patientRhd: string): boolean {
  return isRhdNegative(donorRhd) || !isRhdNegative(patientRhd);
}

/**
 * Evaluate ABO/Rh compatibility with awareness of the blood component class.
 *
 * - RBC / Whole blood: donor cell antigens must be tolerated by recipient.
 *   Whole blood additionally requires ABO-identical (carries both cells + plasma).
 * - Plasma (FFP/Cryo): reversed ABO — donor plasma antibodies must not target
 *   recipient antigens. RhD is not a barrier for plasma.
 * - Platelets: ABO non-identical and RhD+ → RhD- are clinically allowed but
 *   flagged for review (Warning), not hard-blocked.
 * - Unknown class: fail-closed to the strictest rule (ABO-identical + cell Rh).
 */
export function evaluateComponentCompatibility(args: {
  componentClass?: string;
  donorAbo: string;
  donorRhd: string;
  patientAbo: string;
  patientRhd: string;
}): ComponentCompatibilityResult {
  const category = classifyComponent(args.componentClass);
  const donorAbo = normalizeAbo(args.donorAbo);
  const patientAbo = normalizeAbo(args.patientAbo);

  if (!ABO_SET.has(donorAbo) || !ABO_SET.has(patientAbo)) {
    return {
      compatible: false,
      category,
      severity: 'Incompatible',
      requiresReview: false,
      reason: `Invalid ABO group (donor='${args.donorAbo}', patient='${args.patientAbo}').`,
    };
  }

  switch (category) {
    case 'RBC': {
      const abo = aboCellsCompatible(donorAbo, patientAbo);
      const rh = rhdCellsCompatible(args.donorRhd, args.patientRhd);
      return abo && rh
        ? { compatible: true, category, severity: 'OK', requiresReview: false, reason: 'RBC ABO/Rh compatible.' }
        : { compatible: false, category, severity: 'Incompatible', requiresReview: false, reason: `RBC incompatible (ABO ${abo ? 'ok' : 'fail'}, Rh ${rh ? 'ok' : 'fail'}).` };
    }

    case 'WHOLE_BLOOD': {
      const aboIdentical = donorAbo === patientAbo;
      const rh = rhdCellsCompatible(args.donorRhd, args.patientRhd);
      return aboIdentical && rh
        ? { compatible: true, category, severity: 'OK', requiresReview: false, reason: 'Whole blood ABO-identical and Rh compatible.' }
        : { compatible: false, category, severity: 'Incompatible', requiresReview: false, reason: 'Whole blood requires ABO-identical and compatible Rh.' };
    }

    case 'PLASMA': {
      const abo = aboPlasmaCompatible(donorAbo, patientAbo);
      // RhD is not a barrier for plasma/cryo.
      return abo
        ? { compatible: true, category, severity: 'OK', requiresReview: false, reason: 'Plasma ABO (reverse rule) compatible; Rh not applicable.' }
        : { compatible: false, category, severity: 'Incompatible', requiresReview: false, reason: `Plasma ABO incompatible: donor ${donorAbo} plasma antibodies target recipient ${patientAbo}.` };
    }

    case 'PLATELET': {
      const aboIdentical = donorAbo === patientAbo;
      const rhRisk = !isRhdNegative(args.donorRhd) && isRhdNegative(args.patientRhd);
      if (aboIdentical && !rhRisk) {
        return { compatible: true, category, severity: 'OK', requiresReview: false, reason: 'Platelet ABO-identical and Rh compatible.' };
      }
      const notes: string[] = [];
      if (!aboIdentical) notes.push('ABO non-identical platelets (clinically allowed with caution)');
      if (rhRisk) notes.push('RhD+ platelets to RhD- recipient — consider anti-D prophylaxis');
      return { compatible: true, category, severity: 'Warning', requiresReview: true, reason: notes.join('; ') + '.' };
    }

    default: {
      // Unknown component class → fail-closed to strictest interpretation.
      const aboIdentical = donorAbo === patientAbo;
      const rh = rhdCellsCompatible(args.donorRhd, args.patientRhd);
      return aboIdentical && rh
        ? { compatible: true, category: 'UNKNOWN', severity: 'Warning', requiresReview: true, reason: 'Component class unknown — applied strictest ABO-identical + Rh rule. Confirm product type.' }
        : { compatible: false, category: 'UNKNOWN', severity: 'Incompatible', requiresReview: false, reason: 'Component class unknown and not ABO-identical/Rh-compatible — blocked (fail-closed).' };
    }
  }
}
