import { describe, it, expect } from 'vitest';
import { validateEmergencyRelease, EMERGENCY_RELEASE_POLICY } from '../lib/clinicalPolicy';
import { validateVietnamDeferralRules } from '../lib/validators';

describe('validateEmergencyRelease (RTM-EMG-01)', () => {
  it('accepts a release with approver and indication', () => {
    const d = validateEmergencyRelease({ approverId: 'Dr X', indication: 'Massive haemorrhage' });
    expect(d.valid).toBe(true);
    expect(d.reviewDueAt).toBeDefined();
    expect(d.policyVersion).toBe(EMERGENCY_RELEASE_POLICY.version);
  });

  it('blocks when the authorizing clinician is missing', () => {
    const d = validateEmergencyRelease({ indication: 'Trauma' });
    expect(d.valid).toBe(false);
    expect(d.errors.join(' ')).toMatch(/authorizing clinician/i);
  });

  it('blocks when the clinical indication is missing', () => {
    const d = validateEmergencyRelease({ approverId: 'Dr X' });
    expect(d.valid).toBe(false);
    expect(d.errors.join(' ')).toMatch(/clinical indication/i);
  });

  it('requires RhD-Negative for unknown / female-childbearing patients', () => {
    const d = validateEmergencyRelease({ approverId: 'Dr X', indication: 'Shock', patientCategory: 'FemaleChildbearingPotential', rhdChoice: 'RhD-Positive' });
    expect(d.valid).toBe(false);
    expect(d.errors.join(' ')).toMatch(/RhD-Negative/);
  });

  it('sets a review-due SLA timestamp in the future', () => {
    const now = new Date('2026-05-29T00:00:00Z');
    const d = validateEmergencyRelease({ approverId: 'Dr X', indication: 'Shock' }, now);
    expect(new Date(d.reviewDueAt!).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('deferral policy version stamping (RTM-DON-03)', () => {
  it('returns a policy version on a clear donor', () => {
    const r = validateVietnamDeferralRules({});
    expect(r.deferred).toBe(false);
    expect(r.policyVersion).toBeTruthy();
  });

  it('returns the policy version on a deferred donor', () => {
    const r = validateVietnamDeferralRules({ hadTattooRecently: true });
    expect(r.deferred).toBe(true);
    expect(r.policyVersion).toBeTruthy();
  });
});
