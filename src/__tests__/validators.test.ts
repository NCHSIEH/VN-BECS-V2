import { describe, it, expect, vi } from 'vitest';
import {
  LocalCCCDValidator,
  validateDonorAge,
  validateDonorWeight,
  validateVietnamDeferralRules
} from '../lib/validators';

describe('Vietnam Validation Standards', () => {
  describe('CCCD Validation', () => {
    it('should pass for a valid 12-digit CCCD with correct province code', () => {
      // 001 is a valid province code, followed by 9 random digits making 12 total
      const result = LocalCCCDValidator.validate('001199123456');
      expect(result.valid).toBe(true);
    });

    it('should fail if CCCD is not 12 digits', () => {
      const result = LocalCCCDValidator.validate('00119912345');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CCCD must be exactly 12 digits');
    });

    it('should fail if CCCD has invalid province code', () => {
      const result = LocalCCCDValidator.validate('999199123456');
      // Province code > 96
      expect(result.errors.some(e => e.includes('Invalid province code'))).toBe(true);
    });
  });

  describe('Donor Age Validation', () => {
    beforeEach(() => {
      // Mock current date to be 2024-01-01 for stable tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should pass for age between 18 and 60', () => {
      // 30 years old
      const result = validateDonorAge('1994-01-01');
      expect(result.valid).toBe(true);
    });

    it('should fail for age under 18', () => {
      // 17 years old
      const result = validateDonorAge('2007-01-01');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 18 years old'))).toBe(true);
    });

    it('should fail for age over 60', () => {
      // 61 years old
      const result = validateDonorAge('1962-01-01');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at most 60 years old'))).toBe(true);
    });
  });

  describe('Donor Weight Validation', () => {
    it('should pass for male >= 45kg', () => {
      expect(validateDonorWeight(45, 'Male').valid).toBe(true);
      expect(validateDonorWeight(60, 'Male').valid).toBe(true);
    });

    it('should fail for male < 45kg', () => {
      const result = validateDonorWeight(44, 'Male');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Male donor must weigh at least 45kg (current: 44kg)');
    });

    it('should pass for female >= 42kg', () => {
      expect(validateDonorWeight(42, 'Female').valid).toBe(true);
      expect(validateDonorWeight(50, 'Female').valid).toBe(true);
    });

    it('should fail for female < 42kg', () => {
      const result = validateDonorWeight(41, 'Female');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Female donor must weigh at least 42kg (current: 41kg)');
    });
  });

  describe('Vietnam Deferral Rules Validation', () => {
    it('should not defer a completely healthy donor', () => {
      const result = validateVietnamDeferralRules({
        hadTattooRecently: false,
        traveledToMalariaZone: false,
        feelingUnwell: false,
        hasHighRiskCondition: false
      });
      expect(result.deferred).toBe(false);
    });

    it('should defer for recent tattoo', () => {
      const result = validateVietnamDeferralRules({
        hadTattooRecently: true,
        traveledToMalariaZone: false,
        feelingUnwell: false,
        hasHighRiskCondition: false
      });
      expect(result.deferred).toBe(true);
      expect(result.reason).toContain('tattoo');
    });

    it('should defer permanently for high risk condition', () => {
      const result = validateVietnamDeferralRules({
        hadTattooRecently: false,
        traveledToMalariaZone: false,
        feelingUnwell: false,
        hasHighRiskCondition: true
      });
      expect(result.deferred).toBe(true);
      expect(result.reason).toContain('Permanent deferral');
      expect(result.until).toBeUndefined(); // Permanent
    });
  });
});
