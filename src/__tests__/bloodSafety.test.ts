import { describe, expect, it } from 'vitest';
import {
  validateISBT128,
  isAboRhdCompatible,
  isRhdNegative,
  classifyComponent,
  evaluateComponentCompatibility,
} from '../lib/bloodSafety';

describe('validateISBT128', () => {
  it('rejects empty, non-"=" prefixed, and too-short barcodes', () => {
    expect(validateISBT128('').valid).toBe(false);
    expect(validateISBT128('W0000 24 123456').valid).toBe(false); // missing '='
    expect(validateISBT128('=W0000').valid).toBe(false);          // < 13 chars cleaned
  });
  it('accepts a well-formed ISBT-128 DIN (>=13 chars after stripping spaces)', () => {
    expect(validateISBT128('=W0000 24 123456').valid).toBe(true);
  });
});

describe('isAboRhdCompatible (legacy RBC cell rule)', () => {
  it('O negative is the universal red-cell donor', () => {
    expect(isAboRhdCompatible('O', 'Negative', 'AB', 'Positive')).toBe(true);
    expect(isAboRhdCompatible('O', 'Negative', 'A', 'Negative')).toBe(true);
  });
  it('A cells only to A or AB recipients', () => {
    expect(isAboRhdCompatible('A', 'Positive', 'A', 'Positive')).toBe(true);
    expect(isAboRhdCompatible('A', 'Positive', 'AB', 'Positive')).toBe(true);
    expect(isAboRhdCompatible('A', 'Positive', 'O', 'Positive')).toBe(false);
  });
  it('AB cells only to AB recipients', () => {
    expect(isAboRhdCompatible('AB', 'Positive', 'AB', 'Positive')).toBe(true);
    expect(isAboRhdCompatible('AB', 'Positive', 'A', 'Positive')).toBe(false);
  });
  it('RhD+ cells must not go to an RhD- recipient', () => {
    expect(isAboRhdCompatible('O', 'Positive', 'O', 'Negative')).toBe(false);
    expect(isAboRhdCompatible('O', 'Positive', 'O', 'Positive')).toBe(true);
  });
});

describe('isRhdNegative', () => {
  it('recognises the negative spellings', () => {
    for (const v of ['Negative', 'neg', '-', 'RH-', 'rhd-']) expect(isRhdNegative(v)).toBe(true);
  });
  it('treats positive / unknown as not-negative', () => {
    for (const v of ['Positive', 'Pos', '+', '']) expect(isRhdNegative(v)).toBe(false);
  });
});

describe('classifyComponent', () => {
  it('maps type/productCode strings to a category', () => {
    expect(classifyComponent('WholeBlood')).toBe('WHOLE_BLOOD');
    expect(classifyComponent('P-RBC-01')).toBe('RBC');
    expect(classifyComponent('Packed Red Cells')).toBe('RBC');
    expect(classifyComponent('P-FFP-02')).toBe('PLASMA');
    expect(classifyComponent('Cryoprecipitate')).toBe('PLASMA');
    expect(classifyComponent('Platelets Apheresis')).toBe('PLATELET');
    expect(classifyComponent('mystery')).toBe('UNKNOWN');
    expect(classifyComponent(undefined)).toBe('UNKNOWN');
  });
});

describe('evaluateComponentCompatibility (edge cases)', () => {
  it('fails closed on an invalid ABO group', () => {
    const r = evaluateComponentCompatibility({ componentClass: 'RBC', donorAbo: 'X', donorRhd: 'Positive', patientAbo: 'O', patientRhd: 'Positive' });
    expect(r.compatible).toBe(false);
    expect(r.severity).toBe('Incompatible');
  });
  it('whole blood requires ABO-identical', () => {
    expect(evaluateComponentCompatibility({ componentClass: 'WholeBlood', donorAbo: 'O', donorRhd: 'Negative', patientAbo: 'A', patientRhd: 'Positive' }).compatible).toBe(false);
  });
  it('plasma uses the reverse ABO rule (AB plasma is universal)', () => {
    expect(evaluateComponentCompatibility({ componentClass: 'FFP', donorAbo: 'AB', donorRhd: 'Positive', patientAbo: 'O', patientRhd: 'Negative' }).compatible).toBe(true);
    expect(evaluateComponentCompatibility({ componentClass: 'FFP', donorAbo: 'O', donorRhd: 'Positive', patientAbo: 'AB', patientRhd: 'Positive' }).compatible).toBe(false);
  });
  it('RhD+ platelets to an RhD- recipient are allowed but flagged for review', () => {
    const r = evaluateComponentCompatibility({ componentClass: 'PLT', donorAbo: 'A', donorRhd: 'Positive', patientAbo: 'A', patientRhd: 'Negative' });
    expect(r.compatible).toBe(true);
    expect(r.severity).toBe('Warning');
    expect(r.requiresReview).toBe(true);
  });
  it('unknown component class fails closed unless ABO-identical + Rh-compatible', () => {
    expect(evaluateComponentCompatibility({ componentClass: 'weird', donorAbo: 'O', donorRhd: 'Positive', patientAbo: 'A', patientRhd: 'Positive' }).compatible).toBe(false);
  });
});
