import { describe, it, expect } from 'vitest';
import { validateCollectionVolume } from '../lib/validators';

describe('validateCollectionVolume (VN26 weight-linked) — RTM-DON-02', () => {
  it('accepts a normal whole-blood donation under 500ml', () => {
    expect(validateCollectionVolume(450, 'WholeBlood').valid).toBe(true);
  });

  it('rejects whole-blood donations of 500ml or more', () => {
    const r = validateCollectionVolume(500, 'WholeBlood');
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/less than 500ml/);
  });

  it('rejects donors under 42kg', () => {
    const r = validateCollectionVolume(250, 'WholeBlood', 40);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/42kg minimum/);
  });

  it('limits 42–45kg donors to under 250ml', () => {
    expect(validateCollectionVolume(200, 'WholeBlood', 43).valid).toBe(true);
    const r = validateCollectionVolume(350, 'WholeBlood', 43);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/less than 250ml/);
  });

  it('allows >=45kg donors up to (but under) 500ml', () => {
    expect(validateCollectionVolume(450, 'WholeBlood', 60).valid).toBe(true);
    expect(validateCollectionVolume(499, 'WholeBlood', 60).valid).toBe(true);
    expect(validateCollectionVolume(500, 'WholeBlood', 60).valid).toBe(false);
  });

  it('keeps the apheresis 300ml cap', () => {
    expect(validateCollectionVolume(300, 'Apheresis').valid).toBe(true);
    expect(validateCollectionVolume(301, 'Apheresis').valid).toBe(false);
  });

  it('still enforces the 200ml minimum', () => {
    expect(validateCollectionVolume(150, 'WholeBlood').valid).toBe(false);
  });

  it('is backward compatible when weight is omitted', () => {
    expect(validateCollectionVolume(450, 'WholeBlood').valid).toBe(true);
  });
});
