import { describe, it, expect } from 'vitest';
import { isAboRhdCompatible } from '../lib/bloodSafety';

describe('Blood Cross-matching Rules (isAboRhdCompatible)', () => {
  describe('ABO Compatibility', () => {
    it('O can give to anyone', () => {
      expect(isAboRhdCompatible('O', 'Negative', 'O', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('O', 'Negative', 'A', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('O', 'Negative', 'B', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('O', 'Negative', 'AB', 'Negative')).toBe(true);
    });

    it('A can give to A and AB', () => {
      expect(isAboRhdCompatible('A', 'Negative', 'A', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('A', 'Negative', 'AB', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('A', 'Negative', 'O', 'Negative')).toBe(false);
      expect(isAboRhdCompatible('A', 'Negative', 'B', 'Negative')).toBe(false);
    });

    it('B can give to B and AB', () => {
      expect(isAboRhdCompatible('B', 'Negative', 'B', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('B', 'Negative', 'AB', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('B', 'Negative', 'O', 'Negative')).toBe(false);
      expect(isAboRhdCompatible('B', 'Negative', 'A', 'Negative')).toBe(false);
    });

    it('AB can only give to AB', () => {
      expect(isAboRhdCompatible('AB', 'Negative', 'AB', 'Negative')).toBe(true);
      expect(isAboRhdCompatible('AB', 'Negative', 'O', 'Negative')).toBe(false);
      expect(isAboRhdCompatible('AB', 'Negative', 'A', 'Negative')).toBe(false);
      expect(isAboRhdCompatible('AB', 'Negative', 'B', 'Negative')).toBe(false);
    });
  });

  describe('Rh Factor Compatibility', () => {
    it('Rh-Negative can give to Rh-Positive', () => {
      expect(isAboRhdCompatible('O', 'Negative', 'O', 'Positive')).toBe(true);
    });

    it('Rh-Negative can give to Rh-Negative', () => {
      expect(isAboRhdCompatible('O', 'Negative', 'O', 'Negative')).toBe(true);
    });

    it('Rh-Positive CANNOT give to Rh-Negative', () => {
      expect(isAboRhdCompatible('O', 'Positive', 'O', 'Negative')).toBe(false);
    });

    it('Rh-Positive can give to Rh-Positive', () => {
      expect(isAboRhdCompatible('O', 'Positive', 'O', 'Positive')).toBe(true);
    });
  });
});
