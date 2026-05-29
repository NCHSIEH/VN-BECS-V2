import { describe, expect, it } from 'vitest';
import { validateDonationInterval } from '../lib/validators';

const NOW = new Date('2026-05-29T00:00:00Z');

describe('validateDonationInterval (VN26/AABB 12-week rule)', () => {
  it('is eligible when there is no prior donation', () => {
    const r = validateDonationInterval(null, NOW);
    expect(r.eligible).toBe(true);
    expect(r.weeksSinceLast).toBeNull();
  });

  it('blocks a repeat donation inside the 12-week window', () => {
    const lastWeek = new Date(NOW.getTime() - 6 * 7 * 24 * 60 * 60 * 1000).toISOString(); // 6 weeks ago
    const r = validateDonationInterval(lastWeek, NOW);
    expect(r.eligible).toBe(false);
    expect(r.weeksSinceLast).toBe(6);
    expect(r.weeksRequired).toBe(12);
  });

  it('allows a donation once the interval has elapsed', () => {
    const old = new Date(NOW.getTime() - 13 * 7 * 24 * 60 * 60 * 1000).toISOString(); // 13 weeks ago
    expect(validateDonationInterval(old, NOW).eligible).toBe(true);
  });

  it('treats exactly 12 weeks as eligible (boundary)', () => {
    const exactly = new Date(NOW.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(validateDonationInterval(exactly, NOW).eligible).toBe(true);
  });

  it('fails open on an unparseable date (does not block enrollment)', () => {
    expect(validateDonationInterval('not-a-date', NOW).eligible).toBe(true);
  });

  it('honours a custom minimum interval', () => {
    const fourWeeks = new Date(NOW.getTime() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(validateDonationInterval(fourWeeks, NOW, 8).eligible).toBe(false);
    expect(validateDonationInterval(fourWeeks, NOW, 4).eligible).toBe(true);
  });
});
