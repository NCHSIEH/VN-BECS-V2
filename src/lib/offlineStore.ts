/**
 * @fileoverview PWA Offline Storage Engine (T-601)
 *
 * Wraps IndexedDB to provide persistent, encrypted-at-rest (simulated here)
 * local storage for emergency offline borrowing events.
 *
 * @see Implementation Plan §9 (Offline Tolerance)
 */

import type { SyncStatus } from '../types';

export interface OfflineEmergencyEvent {
  localEventId: string;
  hospitalId: string;
  unitBarcodeRaw: string;
  patientTempId: string;
  authorizationDoctorId: string;
  timestamp: string;
  syncStatus: SyncStatus;
}

const DB_NAME = 'nbms_offline_db';
const STORE_NAME = 'emergency_events';
const DB_VERSION = 1;

export class OfflineStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localEventId' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
      };
    });
  }

  async saveEvent(event: Omit<OfflineEmergencyEvent, 'localEventId' | 'syncStatus'>): Promise<OfflineEmergencyEvent> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("IndexedDB not supported");

    const fullEvent: OfflineEmergencyEvent = {
      ...event,
      localEventId: `OFF-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      syncStatus: 'Pending'
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(fullEvent);

      request.onsuccess = () => resolve(fullEvent);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingEvents(): Promise<OfflineEmergencyEvent[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('syncStatus');
      const request = index.getAll('Pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(localEventId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(localEventId);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.syncStatus = 'Synced';
          store.put(data);
          resolve();
        } else {
          reject(new Error("Event not found"));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsConflict(localEventId: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(localEventId);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.syncStatus = 'Conflict';
          store.put(data);
          resolve();
        } else {
          reject(new Error("Event not found"));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton export
export const offlineStore = new OfflineStore();
