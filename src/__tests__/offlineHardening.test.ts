import { describe, expect, it } from 'vitest';
import {
  signOfflineEvent,
  verifyOfflineEventSignature,
  isOfflineEventStale,
  EMERGENCY_OFFLINE_OPERATIONS,
} from '../server/services/offlineSync';

const SECRET = 'offline-secret-offline-secret-1234';
const baseEvent = {
  operationType: 'IssueBag',
  bagUid: 'CMP-1',
  patientRef: 'MRN-1',
  baseVersion: 2,
  clientTimestamp: '2026-05-29T08:00:00Z',
  idempotencyKey: 'IDEM-1',
};

describe('OFF-01 signature verification (gated)', () => {
  it('passes (not required) when no signing secret is configured', () => {
    const r = verifyOfflineEventSignature(baseEvent, {});
    expect(r).toEqual({ ok: true, required: false });
  });

  it('rejects a missing signature when the secret is set', () => {
    const r = verifyOfflineEventSignature(baseEvent, { VN_BECS_OFFLINE_SIGNING_SECRET: SECRET });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('MISSING_SIGNATURE');
  });

  it('accepts a correctly signed event', () => {
    const signature = signOfflineEvent(baseEvent, SECRET);
    const r = verifyOfflineEventSignature({ ...baseEvent, signature }, { VN_BECS_OFFLINE_SIGNING_SECRET: SECRET });
    expect(r).toEqual({ ok: true, required: true });
  });

  it('rejects a tampered event (signature no longer matches mutated field)', () => {
    const signature = signOfflineEvent(baseEvent, SECRET);
    const tampered = { ...baseEvent, bagUid: 'CMP-EVIL', signature };
    const r = verifyOfflineEventSignature(tampered, { VN_BECS_OFFLINE_SIGNING_SECRET: SECRET });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_SIGNATURE');
  });
});

describe('OFF-01 staleness guard', () => {
  it('is not stale when the client did not stamp a time', () => {
    expect(isOfflineEventStale({ operationType: 'IssueBag' }).stale).toBe(false);
  });

  it('flags an event older than the max age', () => {
    const old = new Date(Date.now() - 100 * 3_600_000).toISOString(); // 100h ago
    const r = isOfflineEventStale({ clientTimestamp: old }, {});
    expect(r.stale).toBe(true);
    expect(r.maxHours).toBe(72);
  });

  it('accepts a fresh event and honours a custom max age', () => {
    const recent = new Date(Date.now() - 1 * 3_600_000).toISOString();
    expect(isOfflineEventStale({ clientTimestamp: recent }, {}).stale).toBe(false);
    const tenHoursAgo = new Date(Date.now() - 10 * 3_600_000).toISOString();
    expect(isOfflineEventStale({ clientTimestamp: tenHoursAgo }, { VN_BECS_OFFLINE_MAX_AGE_HOURS: '6' }).stale).toBe(true);
  });
});

describe('OFF-01 emergency-only operation set', () => {
  it('contains only the emergency operations', () => {
    expect([...EMERGENCY_OFFLINE_OPERATIONS].sort()).toEqual(['IssueBag', 'ReceiveBag', 'TransfuseBag', 'WasteBag']);
  });
});
