import { createHash } from 'node:crypto';

export const AUDIT_CHAIN_SCHEMA_VERSION = 'AUDIT_CHAIN_V1';
export const AUDIT_GENESIS_HASH = 'GENESIS';

type CanonicalValue = string | number | boolean | null | CanonicalValue[] | { [key: string]: CanonicalValue };

export interface AuditChainEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  actorRole?: string;
  eventType: string;
  objectType?: string;
  objectId: string;
  beforeHash?: string;
  afterHash?: string;
  details: string;
  requestId?: string;
  deviceId?: string;
  reasonCode?: string;
  previousHash: string;
  schemaVersion: string;
  eventHash: string;
}

function canonicalizeValue(value: unknown): CanonicalValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(canonicalizeValue)
      .filter((item): item is CanonicalValue => item !== undefined);
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, CanonicalValue>>((acc, key) => {
        const canonical = canonicalizeValue((value as Record<string, unknown>)[key]);
        if (canonical !== undefined) acc[key] = canonical;
        return acc;
      }, {});
  }
  return String(value);
}

export function canonicalizeAuditEvent(event: Record<string, unknown>): string {
  return JSON.stringify(canonicalizeValue(event));
}

export function hashAuditEvent(event: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalizeAuditEvent(event)).digest('hex');
}

export function latestAuditHash(events: Array<Partial<AuditChainEvent> | null | undefined>): string {
  const latest = events
    .filter((event): event is Partial<AuditChainEvent> => Boolean(event))
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .find(event => typeof event.eventHash === 'string' && event.eventHash.length > 0);

  return latest?.eventHash || AUDIT_GENESIS_HASH;
}

export function buildChainedAuditEvent(
  event: Omit<Partial<AuditChainEvent>, 'previousHash' | 'schemaVersion' | 'eventHash'> & {
    id: string;
    timestamp: string;
    eventType: string;
    objectId: string;
    details: string;
  },
  previousHash: string
): AuditChainEvent {
  const base = {
    ...event,
    previousHash,
    schemaVersion: AUDIT_CHAIN_SCHEMA_VERSION,
  };

  return {
    ...base,
    eventHash: hashAuditEvent(base),
  };
}

export interface AuditChainVerificationBreak {
  index: number;
  id?: string;
  reason: 'HASH_MISMATCH' | 'BROKEN_LINK';
  expectedPreviousHash?: string;
  actualPreviousHash?: string;
}

export interface AuditChainVerificationResult {
  valid: boolean;
  totalEvents: number;
  chainedEvents: number;
  verifiedEvents: number;
  unchainedEvents: number;
  breaks: AuditChainVerificationBreak[];
}

/**
 * Verify the integrity of an append-only audit hash chain (RTM-AUD-02).
 *
 * For each chained event it (1) recomputes the event hash and compares it to
 * the stored `eventHash` (detects in-place tampering), and (2) checks that the
 * `previousHash` links to the prior event's hash (detects insertion/deletion).
 * Events without an `eventHash` are treated as legacy/unchained and counted
 * separately rather than failing the whole chain.
 */
export function verifyAuditChain(
  events: Array<AuditChainEvent | Record<string, unknown> | null | undefined>,
): AuditChainVerificationResult {
  const chained = events
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof (e as any).eventHash === 'string' && ((e as any).eventHash as string).length > 0)
    .sort((a, b) => {
      const ta = String((a as any).timestamp || '');
      const tb = String((b as any).timestamp || '');
      if (ta !== tb) return ta.localeCompare(tb);
      return String((a as any).id || '').localeCompare(String((b as any).id || ''));
    });

  const breaks: AuditChainVerificationBreak[] = [];
  let expectedPrev = AUDIT_GENESIS_HASH;
  let verified = 0;

  chained.forEach((event, index) => {
    const { eventHash, ...rest } = event as Record<string, unknown> & { eventHash: string };
    const recomputed = hashAuditEvent(rest);
    const actualPrev = String((event as any).previousHash ?? '');

    const hashOk = recomputed === eventHash;
    const linkOk = actualPrev === expectedPrev;

    if (!hashOk) {
      breaks.push({ index, id: String((event as any).id ?? ''), reason: 'HASH_MISMATCH' });
    } else if (!linkOk) {
      breaks.push({
        index,
        id: String((event as any).id ?? ''),
        reason: 'BROKEN_LINK',
        expectedPreviousHash: expectedPrev,
        actualPreviousHash: actualPrev,
      });
    } else {
      verified += 1;
    }

    expectedPrev = eventHash;
  });

  return {
    valid: breaks.length === 0,
    totalEvents: events.filter(Boolean).length,
    chainedEvents: chained.length,
    verifiedEvents: verified,
    unchainedEvents: events.filter(Boolean).length - chained.length,
    breaks,
  };
}

export function legacyAuditDetailsWithChain(details: string, event: AuditChainEvent): string {
  const chainEnvelope = JSON.stringify({
    auditChain: {
      schemaVersion: event.schemaVersion,
      previousHash: event.previousHash,
      eventHash: event.eventHash,
      requestId: event.requestId,
      deviceId: event.deviceId,
      reasonCode: event.reasonCode,
    },
  });

  return details ? `${details}\n${chainEnvelope}` : chainEnvelope;
}
