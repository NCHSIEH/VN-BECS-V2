// =============================================================================
// VN-BBMS V2 — Dexie.js Schema (IndexedDB for PWA offline)
// =============================================================================

import Dexie, { type Table } from 'dexie';
import { type OutboxEvent } from '../../types';

/** Cached blood bag (read-only local copy) */
export interface LocalBagCache {
  uid: string;
  din: string;
  productCode: string;
  componentType: string;
  abo: string;
  rhd: string;
  expiryAt: string;
  currentStatus: string;
  currentLocationId: string;
  version: number;
  updatedAt: string;
}

/** Cached patient data (minimal, authorized) */
export interface LocalPatientCache {
  patientUid: string;
  localPatientCode: string;
  displayNameMasked: string;
  abo: string | null;
  rhd: string | null;
  specialRequirements: string[];
  updatedAt: string;
}

/** Sync checkpoint per facility */
export interface SyncCheckpoint {
  facilityId: string;
  lastSyncToken: string;
  lastSyncAt: string;
}

/** Events that failed sync and need manual review */
export interface FailedEvent {
  localEventId: string;
  operationType: string;
  errorCode: string;
  errorMessage: string;
  payload: Record<string, unknown>;
  failedAt: string;
}

/** Device configuration */
export interface DeviceConfig {
  key: string;
  value: string;
}

/**
 * VN-BBMS Offline Database
 * 6 tables matching spec §4.1
 */
export class VnBbmsOfflineDb extends Dexie {
  localBagCache!: Table<LocalBagCache, string>;
  localPatientCache!: Table<LocalPatientCache, string>;
  outboxEvents!: Table<OutboxEvent, string>;
  syncCheckpoints!: Table<SyncCheckpoint, string>;
  failedEvents!: Table<FailedEvent, string>;
  deviceConfig!: Table<DeviceConfig, string>;

  constructor() {
    super('vnbbms-offline');

    this.version(1).stores({
      localBagCache: 'uid, din, currentStatus, currentLocationId, expiryAt',
      localPatientCache: 'patientUid, localPatientCode',
      outboxEvents: 'localEventId, syncStatus, operationType, clientTimestamp',
      syncCheckpoints: 'facilityId',
      failedEvents: 'localEventId, operationType, failedAt',
      deviceConfig: 'key',
    });
  }
}

export const offlineDb = new VnBbmsOfflineDb();
