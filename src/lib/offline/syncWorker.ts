// =============================================================================
// VN-BBMS V2 — Background Sync Worker
// Periodically syncs outbox events and pulls server state updates
// =============================================================================

import { offlineDb } from './dexieSchema.js';
import { syncPendingEvents, updateLocalCache } from './outboxManager.js';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const PULL_INTERVAL_MS = 60_000; // 60 seconds
const API_BASE = '/api/v1';

let syncTimer: ReturnType<typeof setInterval> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let isOnline = navigator.onLine;

/**
 * Starts the background sync worker.
 */
export function startSyncWorker(getAuthToken: () => Promise<string>): void {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('[SyncWorker] Back online — triggering immediate sync');
    doSync(getAuthToken);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('[SyncWorker] Offline — sync paused');
  });

  // Start periodic sync
  syncTimer = setInterval(() => doSync(getAuthToken), SYNC_INTERVAL_MS);
  pullTimer = setInterval(() => doPull(getAuthToken), PULL_INTERVAL_MS);

  // Initial sync
  doSync(getAuthToken);
  console.log('[SyncWorker] Started');
}

/**
 * Stops the background sync worker.
 */
export function stopSyncWorker(): void {
  if (syncTimer) clearInterval(syncTimer);
  if (pullTimer) clearInterval(pullTimer);
  syncTimer = null;
  pullTimer = null;
  console.log('[SyncWorker] Stopped');
}

/**
 * Push outbox events to server.
 */
async function doSync(getAuthToken: () => Promise<string>): Promise<void> {
  if (!isOnline) return;

  try {
    const token = await getAuthToken();
    const result = await syncPendingEvents(token);
    if (result.total > 0) {
      console.log('[SyncWorker] Push result:', result);
    }
  } catch (err) {
    console.warn('[SyncWorker] Push failed:', err);
  }
}

/**
 * Pull latest state changes from server.
 */
async function doPull(getAuthToken: () => Promise<string>): Promise<void> {
  if (!isOnline) return;

  try {
    const token = await getAuthToken();

    // Get last checkpoint
    const checkpoints = await offlineDb.syncCheckpoints.toArray();
    const facilityCheckpoints = checkpoints.reduce<Record<string, string>>((acc, cp) => {
      acc[cp.facilityId] = cp.lastSyncToken;
      return acc;
    }, {});

    // Get device config for facility
    const facilityConfig = await offlineDb.deviceConfig.get('facilityId');
    const facilityId = facilityConfig?.value;
    if (!facilityId) return;

    const since = facilityCheckpoints[facilityId] || '';

    const response = await fetch(
      `${API_BASE}/sync/pull-changes?since=${encodeURIComponent(since)}&limit=200`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    if (data.bags && data.bags.length > 0) {
      await updateLocalCache(data.bags);

      // Update checkpoint
      await offlineDb.syncCheckpoints.put({
        facilityId,
        lastSyncToken: data.checkpoint,
        lastSyncAt: new Date().toISOString(),
      });

      console.log(`[SyncWorker] Pulled ${data.bags.length} bags, hasMore=${data.hasMore}`);
    }
  } catch (err) {
    console.warn('[SyncWorker] Pull failed:', err);
  }
}

/**
 * Returns the current outbox queue status.
 */
export async function getQueueStatus(): Promise<{
  pending: number;
  syncing: number;
  rejected: number;
  needsReview: number;
  failed: number;
}> {
  const [pending, syncing, rejected, needsReview, failed] = await Promise.all([
    offlineDb.outboxEvents.where('syncStatus').equals('Pending').count(),
    offlineDb.outboxEvents.where('syncStatus').equals('Syncing').count(),
    offlineDb.outboxEvents.where('syncStatus').equals('Rejected').count(),
    offlineDb.outboxEvents.where('syncStatus').equals('NeedsReview').count(),
    offlineDb.failedEvents.count(),
  ]);

  return { pending, syncing, rejected, needsReview, failed };
}
