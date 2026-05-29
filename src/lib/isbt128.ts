/**
 * @fileoverview ISBT 128 parsing & validation (RTM-LBL-01).
 *
 * Replaces the previous "starts with = and length >= 13" stub with:
 *  - structural parsing of the Donation Identification Number (DIN),
 *  - Facility Identification Number (FIN), donation year and serial,
 *  - ISO/IEC 7064 MOD 37,2 check-character compute/validate (manual-entry
 *    check character used by ICCBBA),
 *  - product-code (Data Identifier "=<" ... ) basic parsing.
 *
 * Note: structural rules and the MOD 37,2 algorithm are implemented and
 * round-trip tested. Before clinical go-live, validate against ICCBBA's
 * published conformance test vectors and licensed facility identifiers.
 */

// ISO 7064 MOD 37,2 character set. Index = value (0..35); '*' (36) is the
// supplementary value used only as a possible check character.
const ISO7064_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ*';
const MOD = 37;

function charValue(ch: string): number {
  return ISO7064_CHARS.indexOf(ch.toUpperCase());
}

/**
 * Compute the ISO/IEC 7064 MOD 37,2 check character for a data string.
 * Data characters must be 0-9 or A-Z.
 */
export function computeMod37_2CheckChar(data: string): string | null {
  let p = MOD;
  for (const ch of data) {
    const v = charValue(ch);
    if (v < 0 || v > 35) return null; // invalid data character
    let s = (p + v) % MOD;
    if (s === 0) s = MOD;
    p = (s * 2) % MOD;
  }
  const checkValue = (MOD + 1 - p) % MOD;
  return ISO7064_CHARS[checkValue];
}

/**
 * Validate that `checkChar` is the correct MOD 37,2 check character for `data`.
 */
export function validateMod37_2(data: string, checkChar: string): boolean {
  const expected = computeMod37_2CheckChar(data);
  return expected !== null && expected === checkChar.toUpperCase();
}

export interface ParsedDin {
  valid: boolean;
  errors: string[];
  dataIdentifier?: string;
  din?: string; // 13-char DIN without the leading '='
  facilityId?: string; // 5-char FIN
  year?: string; // 2-char donation year
  serial?: string; // 6-char serial
  checkChar?: string; // present if supplied in the barcode
  checkCharValid?: boolean; // present only when a check char was supplied
}

/**
 * Parse and validate an ISBT 128 Donation Identification Number barcode.
 *
 * Expected layout:  "=" + FIN(5) + YY(2) + SERIAL(6) [ + flags/check(kk) ]
 * The 13-character DIN = FIN + YY + SERIAL. An optional trailing check
 * character (manual-entry "k") is validated with ISO 7064 MOD 37,2.
 */
export function parseDin(barcode: string): ParsedDin {
  const errors: string[] = [];
  if (!barcode) {
    return { valid: false, errors: ['Empty barcode'] };
  }

  const raw = barcode.replace(/\s+/g, '');
  if (!raw.startsWith('=')) {
    errors.push('ISBT 128 DIN must start with the "=" data identifier');
  }

  const body = raw.startsWith('=') ? raw.slice(1) : raw;
  if (body.length < 13) {
    errors.push('ISBT 128 DIN must contain at least 13 characters after "="');
    return { valid: false, errors };
  }

  const din = body.slice(0, 13);
  const facilityId = din.slice(0, 5);
  const year = din.slice(5, 7);
  const serial = din.slice(7, 13);

  if (!/^[A-Z][0-9A-Z]{4}$/.test(facilityId)) {
    errors.push(`Invalid Facility Identification Number (FIN): ${facilityId}`);
  }
  if (!/^[0-9]{2}$/.test(year)) {
    errors.push(`Invalid donation year segment: ${year}`);
  }
  if (!/^[0-9]{6}$/.test(serial)) {
    errors.push(`Invalid serial segment: ${serial}`);
  }

  // Optional supplied check character (first char after the 13-char DIN that
  // is part of the kk flag group). ICCBBA places the manual check char here.
  let checkChar: string | undefined;
  let checkCharValid: boolean | undefined;
  if (body.length >= 14) {
    checkChar = body.charAt(13);
    checkCharValid = validateMod37_2(din, checkChar);
    if (!checkCharValid) {
      errors.push('ISBT 128 DIN check character (ISO 7064 MOD 37,2) is invalid');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    dataIdentifier: '=',
    din,
    facilityId,
    year,
    serial,
    checkChar,
    checkCharValid,
  };
}

export interface ParsedProductCode {
  valid: boolean;
  errors: string[];
  productCode?: string; // 5-char product code (e.g., E0382)
  donationType?: string;
}

/**
 * Parse an ISBT 128 product description barcode (Data Identifier "=<").
 * Layout: "=<" + product code(5) + ... (donation type / division).
 */
export function parseProductCode(barcode: string): ParsedProductCode {
  const errors: string[] = [];
  if (!barcode) return { valid: false, errors: ['Empty product barcode'] };

  const raw = barcode.replace(/\s+/g, '');
  if (!raw.startsWith('=<')) {
    errors.push('ISBT 128 product barcode must start with "=<"');
    return { valid: false, errors };
  }
  const body = raw.slice(2);
  if (body.length < 5) {
    errors.push('Product code segment too short (need 5 characters)');
    return { valid: false, errors };
  }
  const productCode = body.slice(0, 5);
  if (!/^[A-Z][0-9]{4}$/.test(productCode)) {
    errors.push(`Invalid ISBT 128 product code: ${productCode}`);
  }
  return {
    valid: errors.length === 0,
    errors,
    productCode,
    donationType: body.charAt(5) || undefined,
  };
}

/**
 * Build a complete, check-character-bearing DIN barcode from a 13-char DIN.
 * Useful for label generation and for tests.
 */
export function buildDinBarcode(din: string): string | null {
  if (!/^[A-Z][0-9A-Z]{4}[0-9]{2}[0-9]{6}$/.test(din)) return null;
  const check = computeMod37_2CheckChar(din);
  if (!check) return null;
  return `=${din}${check}`;
}
