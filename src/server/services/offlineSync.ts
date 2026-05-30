import crypto from 'node:crypto';

export type OfflineSyncState = 'Accepted' | 'Rejected' | 'NeedsReview';

/**
 * Emergency-only operations permitted in offline mode (RTM-OFF-01). The sync
 * route only handles these operation types; anything else is rejected as an
 * unknown operation, so offline mode cannot be used for routine workflows.
 */
export const EMERGENCY_OFFLINE_OPERATIONS: ReadonlySet<string> = new Set([
  'IssueBag', 'TransfuseBag', 'WasteBag', 'ReceiveBag',
]);

type Env = Record<string, string | undefined>;

/**
 * Canonical signing string for an offline event — the safety-relevant fields
 * that must not be tampered with in transit/at rest on the device.
 */
export function offlineEventCanonicalString(event: Record<string, any>): string {
  return [
    event.operationType || '',
    event.bagUid || event.din || '',
    event.patientRef || event.payload?.patientRef || event.payload?.patientId || '',
    event.baseVersion ?? '',
    event.clientTimestamp || '',
    event.idempotencyKey || event.localEventId || '',
  ].join('|');
}

/** HMAC-SHA256 signature for an offline event (used by the client device). */
export function signOfflineEvent(event: Record<string, any>, secret: string): string {
  return crypto.createHmac('sha256', secret).update(offlineEventCanonicalString(event)).digest('base64url');
}

export interface SignatureCheck { ok: boolean; required: boolean; reason?: 'MISSING_SIGNATURE' | 'INVALID_SIGNATURE'; }

/**
 * Verify an offline event's signature (RTM-OFF-01). Gated: when
 * `VN_BECS_OFFLINE_SIGNING_SECRET` is unset, signatures are not required and the
 * check passes (current behaviour). When set, every event MUST carry a valid
 * HMAC `signature` or it is rejected — closing offline event forgery/tampering.
 */
export function verifyOfflineEventSignature(event: Record<string, any>, env: Env = process.env): SignatureCheck {
  const secret = env.VN_BECS_OFFLINE_SIGNING_SECRET;
  if (!secret) return { ok: true, required: false };
  const provided = typeof event.signature === 'string' ? event.signature : '';
  if (!provided) return { ok: false, required: true, reason: 'MISSING_SIGNATURE' };
  const expected = signOfflineEvent(event, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, required: true, reason: 'INVALID_SIGNATURE' };
  }
  return { ok: true, required: true };
}

/**
 * Staleness guard (RTM-OFF-01): offline events older than the configured max age
 * are routed to manual review rather than auto-applied. Default 72h; only
 * checked when the client stamped the event.
 */
export function isOfflineEventStale(event: Record<string, any>, env: Env = process.env): { stale: boolean; ageHours?: number; maxHours: number } {
  const maxHours = Number(env.VN_BECS_OFFLINE_MAX_AGE_HOURS || '72');
  const ts = event.clientTimestamp ? Date.parse(event.clientTimestamp) : NaN;
  if (Number.isNaN(ts)) return { stale: false, maxHours };
  const ageHours = (Date.now() - ts) / 3_600_000;
  return { stale: ageHours > maxHours, ageHours: Math.floor(ageHours), maxHours };
}

export interface OfflineSyncResult {
  idempotencyKey: string | null;
  syncState: OfflineSyncState;
  error?: string;
  errorCode?: string;
  duplicate?: boolean;
  serverVersion?: number;
  currentStatus?: string;
}

export function offlineEventKey(event: Record<string, any>): string | null {
  return event.idempotencyKey || event.localEventId || null;
}

export function findPriorOfflineSyncResult(
  storedEvents: Array<Record<string, any>>,
  event: Record<string, any>
): OfflineSyncResult | null {
  const key = offlineEventKey(event);
  if (!key) return null;

  const prior = storedEvents.find(stored =>
    stored.idempotencyKey === key ||
    stored.localEventId === key
  );

  if (!prior?.syncStatus) return null;

  return {
    idempotencyKey: key,
    syncState: prior.syncStatus,
    error: prior.errorMessage || prior.lastErrorCode,
    errorCode: prior.errorCode || prior.lastErrorCode,
    duplicate: true,
    serverVersion: prior.serverVersion,
    currentStatus: prior.currentStatus,
  };
}

export function buildOfflineEventReceipt(
  event: Record<string, any>,
  result: OfflineSyncResult,
  requestId?: string | null
) {
  const key = offlineEventKey(event);
  const now = new Date().toISOString();

  return {
    localEventId: event.localEventId || key || `OFF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    idempotencyKey: key,
    tenantId: event.tenantId || null,
    facilityId: event.facilityId || event.hospitalId || null,
    deviceId: event.deviceId || null,
    operationType: event.operationType || 'UNKNOWN_OPERATION',
    din: event.din || null,
    bagUid: event.bagUid || null,
    patientRef: event.patientRef || event.payload?.patientRef || null,
    payload: JSON.stringify(event.payload || {}),
    baseVersion: event.baseVersion ?? null,
    clientTimestamp: event.clientTimestamp || null,
    serverTimestamp: now,
    syncStatus: result.syncState,
    errorCode: result.errorCode || null,
    errorMessage: result.error || null,
    serverVersion: result.serverVersion ?? null,
    currentStatus: result.currentStatus || null,
    requestId: requestId || null,
  };
}

export function syncResult(
  event: Record<string, any>,
  syncState: OfflineSyncState,
  options: Omit<OfflineSyncResult, 'idempotencyKey' | 'syncState'> = {}
): OfflineSyncResult {
  return {
    idempotencyKey: offlineEventKey(event),
    syncState,
    ...options,
  };
}
