import { describe, expect, it } from 'vitest';
import {
  AUDIT_CHAIN_SCHEMA_VERSION,
  AUDIT_GENESIS_HASH,
  buildChainedAuditEvent,
  canonicalizeAuditEvent,
  latestAuditHash,
  legacyAuditDetailsWithChain,
} from '../server/auditChain';

describe('auditChain', () => {
  it('canonicalizes objects deterministically regardless of key order', () => {
    expect(canonicalizeAuditEvent({ b: 2, a: 1, nested: { z: true, y: 'ok' } })).toBe(
      canonicalizeAuditEvent({ nested: { y: 'ok', z: true }, a: 1, b: 2 })
    );
  });

  it('builds a chained audit event with a stable previous hash reference', () => {
    const event = buildChainedAuditEvent(
      {
        id: 'AUD-1',
        timestamp: '2026-05-27T12:00:00.000Z',
        actorRole: 'Admin',
        eventType: 'BLOOD_UNIT_RELEASED',
        objectId: 'CMP-1',
        details: 'Released from quarantine',
      },
      'previous-hash'
    );

    expect(event.previousHash).toBe('previous-hash');
    expect(event.schemaVersion).toBe(AUDIT_CHAIN_SCHEMA_VERSION);
    expect(event.eventHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('uses the latest event hash or genesis when building the next link', () => {
    expect(latestAuditHash([])).toBe(AUDIT_GENESIS_HASH);
    expect(
      latestAuditHash([
        { timestamp: '2026-05-27T10:00:00.000Z', eventHash: 'older' },
        { timestamp: '2026-05-27T11:00:00.000Z', eventHash: 'newer' },
      ])
    ).toBe('newer');
  });

  it('embeds chain metadata into legacy details when schema columns are missing', () => {
    const event = buildChainedAuditEvent(
      {
        id: 'AUD-2',
        timestamp: '2026-05-27T12:00:00.000Z',
        eventType: 'SUPERUSER_LOGIN',
        objectId: 'root',
        details: 'login',
      },
      AUDIT_GENESIS_HASH
    );

    expect(legacyAuditDetailsWithChain(event.details, event)).toContain(event.eventHash);
  });
});
