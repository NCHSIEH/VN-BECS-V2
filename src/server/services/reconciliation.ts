import { isKnownBloodUnitState } from '../../lib/stateMachine';

export interface ReconciliationReportDraft {
  id: string;
  date: string;
  hospitalId: string;
  borrowedUnits: string[];
  conflicts: string[];
}

const TERMINAL_STATUSES = new Set(['TRANSFUSED', 'DISCARDED', 'WASTED']);

function reportId(date: string, facilityId: string): string {
  return `REC-${date}-${facilityId.replace(/[^A-Z0-9_-]/gi, '_')}`;
}

function unitId(unit: Record<string, any>): string {
  return unit.unitId || unit.id || unit.componentId || 'UNKNOWN_UNIT';
}

function facilityId(unit: Record<string, any>): string {
  return unit.hospitalId || unit.facilityId || unit.location || 'UNASSIGNED';
}

function isExpired(unit: Record<string, any>, now: Date): boolean {
  if (!unit.expiryDate) return false;
  const expiry = new Date(unit.expiryDate);
  return Number.isFinite(expiry.getTime()) && expiry < now;
}

export function generateDailyReconciliationReports(args: {
  inventory: Array<Record<string, any>>;
  existingReports?: Array<Record<string, any>>;
  date?: string;
  now?: Date;
}): ReconciliationReportDraft[] {
  const date = args.date || new Date().toISOString().slice(0, 10);
  const now = args.now || new Date();
  const existingIds = new Set((args.existingReports || []).map(report => report.id));
  const grouped = new Map<string, Array<Record<string, any>>>();

  for (const unit of args.inventory || []) {
    const facility = facilityId(unit);
    const units = grouped.get(facility) || [];
    units.push(unit);
    grouped.set(facility, units);
  }

  return Array.from(grouped.entries())
    .map(([hospitalId, units]) => {
      const borrowedUnits: string[] = [];
      const conflicts: string[] = [];

      for (const unit of units) {
        const id = unitId(unit);
        const status = unit.status || unit.current_status || 'UNKNOWN';
        const normalizedStatus = String(status).toUpperCase();

        if (!TERMINAL_STATUSES.has(normalizedStatus)) {
          borrowedUnits.push(id);
        }

        if (!isKnownBloodUnitState(normalizedStatus)) {
          conflicts.push(`${id}: unknown status ${status}`);
        }
        if (isExpired(unit, now) && !TERMINAL_STATUSES.has(normalizedStatus)) {
          conflicts.push(`${id}: expired while ${status}`);
        }
        if (unit.version === undefined || unit.version === null) {
          conflicts.push(`${id}: missing optimistic-lock version`);
        }
        if (!unit.location && !unit.hospitalId && !unit.facilityId) {
          conflicts.push(`${id}: missing facility/location`);
        }
      }

      return {
        id: reportId(date, hospitalId),
        date,
        hospitalId,
        borrowedUnits,
        conflicts,
      };
    })
    .filter(report => !existingIds.has(report.id));
}
