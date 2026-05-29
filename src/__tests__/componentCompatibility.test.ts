import { describe, it, expect } from 'vitest';
import {
  classifyComponent,
  evaluateComponentCompatibility,
  isRhdNegative,
} from '../lib/bloodSafety';

const ev = (componentClass: string, dA: string, dR: string, pA: string, pR: string) =>
  evaluateComponentCompatibility({ componentClass, donorAbo: dA, donorRhd: dR, patientAbo: pA, patientRhd: pR });

describe('classifyComponent', () => {
  it('maps common product strings to categories', () => {
    expect(classifyComponent('RBC')).toBe('RBC');
    expect(classifyComponent('Packed Red Cells')).toBe('RBC');
    expect(classifyComponent('FFP')).toBe('PLASMA');
    expect(classifyComponent('Cryoprecipitate')).toBe('PLASMA');
    expect(classifyComponent('PLT')).toBe('PLATELET');
    expect(classifyComponent('Apheresis Platelets')).toBe('PLATELET');
    expect(classifyComponent('Whole Blood')).toBe('WHOLE_BLOOD');
    expect(classifyComponent('mystery')).toBe('UNKNOWN');
  });
});

describe('isRhdNegative tolerates multiple notations', () => {
  it('accepts Negative / Neg / -', () => {
    expect(isRhdNegative('Negative')).toBe(true);
    expect(isRhdNegative('-')).toBe(true);
    expect(isRhdNegative('NEG')).toBe(true);
    expect(isRhdNegative('Positive')).toBe(false);
    expect(isRhdNegative('+')).toBe(false);
  });
});

describe('RBC compatibility (cell rule)', () => {
  it('O- is universal red cell donor', () => {
    for (const pa of ['O', 'A', 'B', 'AB']) {
      expect(ev('RBC', 'O', 'Negative', pa, 'Negative').compatible).toBe(true);
    }
  });
  it('A red cells cannot go to O', () => {
    expect(ev('RBC', 'A', 'Negative', 'O', 'Negative').compatible).toBe(false);
  });
  it('Rh+ red cells cannot go to Rh- patient', () => {
    expect(ev('RBC', 'O', 'Positive', 'O', 'Negative').compatible).toBe(false);
  });
});

describe('PLASMA compatibility (reverse rule) — the bug that is now fixed', () => {
  it('AB plasma is the universal plasma donor', () => {
    for (const pa of ['O', 'A', 'B', 'AB']) {
      expect(ev('FFP', 'AB', 'Positive', pa, 'Negative').compatible).toBe(true);
    }
  });
  it('O plasma can ONLY go to O recipients (opposite of red cells)', () => {
    expect(ev('FFP', 'O', 'Negative', 'O', 'Negative').compatible).toBe(true);
    expect(ev('FFP', 'O', 'Negative', 'A', 'Negative').compatible).toBe(false);
    expect(ev('FFP', 'O', 'Negative', 'AB', 'Negative').compatible).toBe(false);
  });
  it('A plasma to AB patient is INCOMPATIBLE (anti-B targets B antigen)', () => {
    expect(ev('FFP', 'A', 'Negative', 'AB', 'Negative').compatible).toBe(false);
  });
  it('Rh is not a barrier for plasma', () => {
    expect(ev('FFP', 'AB', 'Positive', 'O', 'Negative').compatible).toBe(true);
  });
});

describe('PLATELET compatibility (allowed-with-caution)', () => {
  it('ABO-identical, Rh-safe is clean', () => {
    const r = ev('PLT', 'A', 'Negative', 'A', 'Negative');
    expect(r.compatible).toBe(true);
    expect(r.severity).toBe('OK');
  });
  it('ABO-non-identical platelets allowed but flagged for review', () => {
    const r = ev('PLT', 'O', 'Negative', 'A', 'Negative');
    expect(r.compatible).toBe(true);
    expect(r.severity).toBe('Warning');
    expect(r.requiresReview).toBe(true);
  });
  it('RhD+ platelets to RhD- patient warns (anti-D prophylaxis)', () => {
    const r = ev('PLT', 'A', 'Positive', 'A', 'Negative');
    expect(r.severity).toBe('Warning');
    expect(r.reason).toMatch(/anti-D/i);
  });
});

describe('WHOLE_BLOOD requires ABO-identical', () => {
  it('O whole blood to A patient is blocked', () => {
    expect(ev('Whole Blood', 'O', 'Negative', 'A', 'Negative').compatible).toBe(false);
  });
});

describe('fail-closed behaviour', () => {
  it('unknown component class falls back to strictest rule + review', () => {
    const ok = ev('mystery', 'A', 'Negative', 'A', 'Negative');
    expect(ok.compatible).toBe(true);
    expect(ok.requiresReview).toBe(true);
    const blocked = ev('mystery', 'O', 'Negative', 'A', 'Negative');
    expect(blocked.compatible).toBe(false);
  });
  it('invalid ABO is hard-blocked', () => {
    expect(ev('RBC', 'Z', 'Negative', 'A', 'Negative').compatible).toBe(false);
  });
});
