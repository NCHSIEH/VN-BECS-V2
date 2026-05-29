import { describe, it, expect } from 'vitest';
import {
  computeMod37_2CheckChar,
  validateMod37_2,
  parseDin,
  parseProductCode,
  buildDinBarcode,
} from '../lib/isbt128';

describe('ISO 7064 MOD 37,2 check character', () => {
  it('computes a single check character from the 37-char alphabet', () => {
    const c = computeMod37_2CheckChar('W123424000001');
    expect(c).not.toBeNull();
    expect(c).toMatch(/^[0-9A-Z*]$/);
  });

  it('round-trips: a computed check char validates against its data', () => {
    const data = 'W123424000001';
    const check = computeMod37_2CheckChar(data)!;
    expect(validateMod37_2(data, check)).toBe(true);
  });

  it('rejects a wrong check character', () => {
    const data = 'W123424000001';
    const check = computeMod37_2CheckChar(data)!;
    const wrong = check === '0' ? '1' : '0';
    expect(validateMod37_2(data, wrong)).toBe(false);
  });

  it('returns null for invalid data characters', () => {
    expect(computeMod37_2CheckChar('W12*4')).toBeNull();
  });
});

describe('parseDin', () => {
  it('parses a structurally valid DIN into FIN / year / serial', () => {
    const r = parseDin('=W123424000001');
    expect(r.valid).toBe(true);
    expect(r.facilityId).toBe('W1234');
    expect(r.year).toBe('24');
    expect(r.serial).toBe('000001');
  });

  it('requires the "=" data identifier', () => {
    const r = parseDin('W123424000001');
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/data identifier/i);
  });

  it('rejects a too-short DIN', () => {
    const r = parseDin('=W1234');
    expect(r.valid).toBe(false);
  });

  it('validates an appended check character and accepts a correct one', () => {
    const full = buildDinBarcode('W123424000001')!; // '=' + din + check
    const r = parseDin(full);
    expect(r.checkChar).toBeDefined();
    expect(r.checkCharValid).toBe(true);
    expect(r.valid).toBe(true);
  });

  it('flags a tampered check character', () => {
    const full = buildDinBarcode('W123424000001')!;
    const tamperedChar = full.slice(-1) === 'Z' ? 'Y' : 'Z';
    const tampered = full.slice(0, -1) + tamperedChar;
    const r = parseDin(tampered);
    expect(r.checkCharValid).toBe(false);
    expect(r.valid).toBe(false);
  });

  it('rejects an invalid FIN format', () => {
    const r = parseDin('=12345' + '24' + '000001');
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Facility/);
  });
});

describe('parseProductCode', () => {
  it('parses a valid product barcode', () => {
    const r = parseProductCode('=<E0382V00');
    expect(r.valid).toBe(true);
    expect(r.productCode).toBe('E0382');
  });

  it('requires the "=<" data identifier', () => {
    expect(parseProductCode('E0382').valid).toBe(false);
  });

  it('rejects a malformed product code', () => {
    expect(parseProductCode('=<12345').valid).toBe(false);
  });
});

describe('buildDinBarcode', () => {
  it('builds a check-character-bearing barcode that re-parses cleanly', () => {
    const full = buildDinBarcode('A999925123456')!;
    expect(full.startsWith('=')).toBe(true);
    const r = parseDin(full);
    expect(r.valid).toBe(true);
    expect(r.checkCharValid).toBe(true);
  });

  it('returns null for a malformed DIN', () => {
    expect(buildDinBarcode('bad')).toBeNull();
  });
});
