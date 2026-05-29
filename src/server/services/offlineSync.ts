export type OfflineSyncState = 'Accepted' | 'Rejected' | 'NeedsReview';

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
