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
