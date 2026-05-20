// =============================================================================
// VN-BBMS V2 — Outbox Manager
// Manages offline event queuing, idempotency key generation, and sync
// =============================================================================

import { offlineDb } from './dexieSchema.js';
import { type OutboxEvent } from '../../types';

const MAX_RETRY = 5;
const API_BASE = '/api/v1';

/**
 * Generates an idempotency key per spec format:
 * {device_id}:{client_uuid}:{operation_type}:{din}:{timestamp_bucket}
 */
function generateIdempotencyKey(
  deviceId: string,
  operationType: string,
  din?: string
): string {
  const uuid = crypto.randomUUID();
  const bucket = Math.floor(Date.now() / 60000); // 1-minute bucket
  return `${deviceId}:${uuid}:${operationType}:${din || 'NONE'}:${bucket}`;
}

/**
 * Enqueues a new event to the outbox.
 */
export async function enqueueEvent(params: {
  tenantId: string;
  facilityId: string;
  deviceId: string;
  operationType: string;
  din?: string;
  bagUid?: string;
  patientRef?: string;
  payload: Record<string, unknown>;
  baseVersion?: number;
}): Promise<string> {
  const localEventId = crypto.randomUUID();

  const event: OutboxEvent = {
    localEventId,
    tenantId: params.tenantId,
    facilityId: params.facilityId,
    deviceId: params.deviceId,
    operationType: params.operationType,
    din: params.din,
    bagUid: params.bagUid,
    patientRef: params.patientRef,
    payload: params.payload,
    baseVersion: params.baseVersion,
    clientTimestamp: new Date().toISOString(),
    idempotencyKey: generateIdempotencyKey(
      params.deviceId, params.operationType, params.din
    ),
    retryCount: 0,
    syncStatus: 'Pending',
  };

  await offlineDb.outboxEvents.add(event);
  return localEventId;
}

/**
 * Gets all pending events, ordered by timestamp.
 */
export async function getPendingEvents(): Promise<OutboxEvent[]> {
  return offlineDb.outboxEvents
    .where('syncStatus')
    .anyOf(['Pending', 'Syncing'])
    .sortBy('clientTimestamp');
}

/**
 * Attempts to sync all pending events with the server.
 * Returns a summary of results.
 */
export async function syncPendingEvents(authToken: string): Promise<{
  total: number;
  accepted: number;
  rejected: number;
  needsReview: number;
  failed: number;
}> {
  const pending = await getPendingEvents();
  if (pending.length === 0) return { total: 0, accepted: 0, rejected: 0, needsReview: 0, failed: 0 };

  // Mark as syncing
  const ids = pending.map(e => e.localEventId);
  await offlineDb.outboxEvents
    .where('localEventId').anyOf(ids)
    .modify({ syncStatus: 'Syncing' });

  const summary = { total: pending.length, accepted: 0, rejected: 0, needsReview: 0, failed: 0 };

  try {
    const response = await fetch(`${API_BASE}/sync/push-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify({
        events: pending.map(e => ({
          operationType: e.operationType,
          bagUid: e.bagUid,
          din: e.din,
          payload: e.payload,
          baseVersion: e.baseVersion,
          clientTimestamp: e.clientTimestamp,
          idempotencyKey: e.idempotencyKey,
        })),
      }),
    });

    if (!response.ok) {
      // Network-level failure — revert to pending for retry
      await offlineDb.outboxEvents
        .where('localEventId').anyOf(ids)
        .modify((event: OutboxEvent) => {
          event.syncStatus = 'Pending';
          event.retryCount = (event.retryCount || 0) + 1;
        });
      summary.failed = pending.length;
      return summary;
    }

    const result = await response.json();

    // Process each result
    for (const r of result.results) {
      const event = pending.find(e => e.idempotencyKey === r.idempotencyKey);
      if (!event) continue;

      if (r.syncState === 'Accepted') {
        await offlineDb.outboxEvents.delete(event.localEventId);
        summary.accepted++;
      } else if (r.syncState === 'Rejected') {
        await offlineDb.outboxEvents.update(event.localEventId, {
          syncStatus: 'Rejected',
          lastErrorCode: r.error,
        });
        // Move to failed events if max retries
        if ((event.retryCount || 0) >= MAX_RETRY) {
          await offlineDb.failedEvents.add({
            localEventId: event.localEventId,
            operationType: event.operationType,
            errorCode: r.error || 'MAX_RETRY',
            errorMessage: r.error || 'Max retry count exceeded',
            payload: event.payload,
            failedAt: new Date().toISOString(),
          });
        }
        summary.rejected++;
      } else if (r.syncState === 'NeedsReview') {
        await offlineDb.outboxEvents.update(event.localEventId, {
          syncStatus: 'NeedsReview',
          lastErrorCode: r.error,
        });
        summary.needsReview++;
      }
    }
  } catch {
    // Network failure — revert
    await offlineDb.outboxEvents
      .where('localEventId').anyOf(ids)
      .modify((event: OutboxEvent) => {
        event.syncStatus = 'Pending';
        event.retryCount = (event.retryCount || 0) + 1;
      });
    summary.failed = pending.length;
  }

  return summary;
}

/**
 * Updates local bag cache from server pull-changes response.
 */
export async function updateLocalCache(bags: Array<{
  uid: string;
  din: string;
  product_code: string;
  component_type: string;
  abo: string;
  rhd: string;
  expiry_at: string;
  current_status: string;
  current_location_id: string;
  version: number;
  updated_at: string;
}>): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.localBagCache, async () => {
    for (const bag of bags) {
      await offlineDb.localBagCache.put({
        uid: bag.uid,
        din: bag.din,
        productCode: bag.product_code,
        componentType: bag.component_type,
        abo: bag.abo,
        rhd: bag.rhd,
        expiryAt: bag.expiry_at,
        currentStatus: bag.current_status,
        currentLocationId: bag.current_location_id,
        version: bag.version,
        updatedAt: bag.updated_at,
      });
    }
  });
}
