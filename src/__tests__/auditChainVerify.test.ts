import { describe, it, expect } from 'vitest';
import {
  buildChainedAuditEvent,
  verifyAuditChain,
  AUDIT_GENESIS_HASH,
} from '../server/auditChain';

function chain() {
  const e1 = buildChainedAuditEvent(
    { id: 'A1', timestamp: '2026-05-29T00:00:01Z', eventType: 'Transition', objectId: 'U1', details: 'a' },
    AUDIT_GENESIS_HASH,
  );
  const e2 = buildChainedAuditEvent(
    { id: 'A2', timestamp: '2026-05-29T00:00:02Z', eventType: 'Transition', objectId: 'U1', details: 'b' },
    e1.eventHash,
  );
  const e3 = buildChainedAuditEvent(
    { id: 'A3', timestamp: '2026-05-29T00:00:03Z', eventType: 'BedsideVerify', objectId: 'U1', details: 'c' },
    e2.eventHash,
  );
  return [e1, e2, e3];
}

describe('verifyAuditChain (RTM-AUD-02)', () => {
  it('accepts an intact chain (order independent)', () => {
    const [e1, e2, e3] = chain();
    const result = verifyAuditChain([e3, e1, e2]); // shuffled input
    expect(result.valid).toBe(true);
    expect(result.verifiedEvents).toBe(3);
    expect(result.breaks).toHaveLength(0);
  });

  it('detects an in-place tampered event (hash mismatch)', () => {
    const events = chain();
    const tampered = { ...events[1], details: 'HACKED' }; // eventHash now stale
    const result = verifyAuditChain([events[0], tampered, events[2]]);
    expect(result.valid).toBe(false);
    expect(result.breaks.some(b => b.reason === 'HASH_MISMATCH')).toBe(true);
  });

  it('detects a deleted/inserted event (broken link)', () => {
    const events = chain();
    const result = verifyAuditChain([events[0], events[2]]); // middle removed
    expect(result.valid).toBe(false);
    expect(result.breaks.some(b => b.reason === 'BROKEN_LINK')).toBe(true);
  });

  it('counts legacy unchained events without failing the chain', () => {
    const events = chain();
    const legacy = { id: 'L1', timestamp: '2026-05-29T00:00:00Z', eventType: 'Legacy', objectId: 'U0', details: 'x' };
    const result = verifyAuditChain([...events, legacy]);
    expect(result.valid).toBe(true);
    expect(result.unchainedEvents).toBe(1);
    expect(result.chainedEvents).toBe(3);
  });
});
