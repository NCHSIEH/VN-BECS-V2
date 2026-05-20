/**
 * @fileoverview Alert Service Core (T-501)
 *
 * Centralized alert engine for all system-wide notifications.
 * Processes events from all SOPs and classifies into severity levels.
 *
 * @see Implementation Plan §10.3
 */

import type { AlertSeverity } from '../types';
import { getDosColorLevel, getExpiryColorLevel, type ColorLevel } from './alertThresholds';

/** Alert classification. */
export interface SystemAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  objectId: string;
  timestamp: string;
  acknowledged: boolean;
}

/** T-504: 9 event-driven alert categories. */
export type AlertCategory =
  | 'MTP_ACTIVATED'           // SOP 10: Mass Transfusion Protocol
  | 'COLD_CHAIN_VIOLATION'    // SOP 5: Temperature breach
  | 'CROSSMATCH_INCOMPATIBLE' // SOP 7: Crossmatch hard stop
  | 'ADVERSE_REACTION'        // SOP 9: Hemovigilance event
  | 'BLOOD_TYPE_MISMATCH'     // SOP 2: Lab vs registration mismatch
  | 'INVENTORY_CRITICAL'      // SOP 4: DOS < 1.0
  | 'EXPIRY_IMMINENT'         // SOP 3/8: Units expiring in ≤3 days
  | 'ORDER_SLA_BREACH'        // SOP 10: Order exceeding SLA
  | 'OFFLINE_SYNC_CONFLICT';  // SOP 10: Offline event conflict detected

/** Severity thresholds for auto-classification. */
const SEVERITY_MAP: Record<AlertCategory, AlertSeverity> = {
  MTP_ACTIVATED: 'Critical',
  COLD_CHAIN_VIOLATION: 'Critical',
  CROSSMATCH_INCOMPATIBLE: 'Critical',
  ADVERSE_REACTION: 'High',
  BLOOD_TYPE_MISMATCH: 'High',
  INVENTORY_CRITICAL: 'High',
  EXPIRY_IMMINENT: 'Medium',
  ORDER_SLA_BREACH: 'Medium',
  OFFLINE_SYNC_CONFLICT: 'Medium',
};

/** Human-readable titles for each category. */
const CATEGORY_TITLES: Record<AlertCategory, string> = {
  MTP_ACTIVATED: '🚨 MTP Protocol Activated',
  COLD_CHAIN_VIOLATION: '🌡️ Cold Chain Violation',
  CROSSMATCH_INCOMPATIBLE: '⛔ Crossmatch Incompatible',
  ADVERSE_REACTION: '🩸 Adverse Reaction Reported',
  BLOOD_TYPE_MISMATCH: '⚠️ Blood Type Mismatch',
  INVENTORY_CRITICAL: '📦 Critical Inventory Shortage',
  EXPIRY_IMMINENT: '⏰ Expiry Imminent',
  ORDER_SLA_BREACH: '⏱️ SLA Breach Warning',
  OFFLINE_SYNC_CONFLICT: '🔄 Offline Sync Conflict',
};

/**
 * AlertService — Central alert processing engine.
 *
 * Usage:
 * ```ts
 * const alert = AlertService.create('COLD_CHAIN_VIOLATION', 'ORD-12345', 'Sensor S1: 8.2°C for 12min');
 * ```
 */
export class AlertService {
  private static alerts: SystemAlert[] = [];

  /** Create and register a new alert. */
  static create(category: AlertCategory, objectId: string, message: string): SystemAlert {
    const alert: SystemAlert = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      severity: SEVERITY_MAP[category],
      category,
      title: CATEGORY_TITLES[category],
      message,
      objectId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts.unshift(alert);
    // Keep max 200 alerts in memory
    if (this.alerts.length > 200) this.alerts.pop();
    return alert;
  }

  /** Get all alerts, optionally filtered. */
  static getAll(filter?: { severity?: AlertSeverity; acknowledged?: boolean }): SystemAlert[] {
    let result = [...this.alerts];
    if (filter?.severity) result = result.filter(a => a.severity === filter.severity);
    if (filter?.acknowledged !== undefined) result = result.filter(a => a.acknowledged === filter.acknowledged);
    return result;
  }

  /** Get unacknowledged count by severity. */
  static getCounts(): Record<AlertSeverity, number> {
    const unack = this.alerts.filter(a => !a.acknowledged);
    return {
      Critical: unack.filter(a => a.severity === 'Critical').length,
      High: unack.filter(a => a.severity === 'High').length,
      Medium: unack.filter(a => a.severity === 'Medium').length,
      Low: unack.filter(a => a.severity === 'Low').length,
    };
  }

  /** Acknowledge an alert. */
  static acknowledge(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) { alert.acknowledged = true; return true; }
    return false;
  }

  /** Generate inventory alerts from DOS data. */
  static checkInventoryAlerts(
    items: Array<{ label: string; dos: number; units: number }>
  ): SystemAlert[] {
    const newAlerts: SystemAlert[] = [];
    for (const item of items) {
      const color = getDosColorLevel(item.dos);
      if (color === 'red') {
        newAlerts.push(this.create('INVENTORY_CRITICAL', item.label,
          `${item.label}: ${item.dos.toFixed(1)} DOS (${item.units} units) — Critical shortage`));
      }
    }
    return newAlerts;
  }

  /** Generate expiry alerts from inventory. */
  static checkExpiryAlerts(
    units: Array<{ id: string; expiryDate: string; productCode: string }>
  ): SystemAlert[] {
    const newAlerts: SystemAlert[] = [];
    const now = Date.now();
    for (const unit of units) {
      const daysLeft = Math.floor((new Date(unit.expiryDate).getTime() - now) / (24 * 60 * 60 * 1000));
      const color = getExpiryColorLevel(daysLeft);
      if (color === 'orange' || color === 'red') {
        newAlerts.push(this.create('EXPIRY_IMMINENT', unit.id,
          `${unit.id} (${unit.productCode}) expires in ${daysLeft <= 0 ? 'EXPIRED' : `${daysLeft}d`}`));
      }
    }
    return newAlerts;
  }

  /** Clear all alerts (for testing). */
  static clear(): void {
    this.alerts = [];
  }
}
