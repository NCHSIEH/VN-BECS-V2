/**
 * @fileoverview DOS Color Threshold & Alert Utilities (Implementation Plan §10)
 *
 * Provides color-level classification for DOS (Days of Supply),
 * expiry alerts, and KPI threshold evaluation.
 */

/** Color level for UI rendering. */
export type ColorLevel = 'green' | 'yellow' | 'orange' | 'red' | 'gray';

/** TailwindCSS class mapping for each color level. */
export const COLOR_CLASSES: Record<ColorLevel, { bg: string; text: string; border: string }> = {
  green:  { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',  text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20 dark:border-emerald-500/30' },
  yellow: { bg: 'bg-amber-500/10 dark:bg-amber-500/20',    text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-500/20 dark:border-amber-500/30' },
  orange: { bg: 'bg-orange-500/10 dark:bg-orange-500/20',  text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20 dark:border-orange-500/30' },
  red:    { bg: 'bg-rose-500/10 dark:bg-rose-500/20',      text: 'text-rose-600 dark:text-rose-400',     border: 'border-rose-500/20 dark:border-rose-500/30' },
  gray:   { bg: 'bg-slate-500/10 dark:bg-slate-500/20',    text: 'text-slate-600 dark:text-slate-400',    border: 'border-slate-500/20 dark:border-slate-500/30' },
};

/**
 * Determine DOS (Days of Supply) color level.
 *
 * | DOS Range | Color  | Status              |
 * |-----------|--------|---------------------|
 * | >= 5.0    | green  | Adequate            |
 * | 3.0-4.9   | yellow | Low                 |
 * | 1.0-2.9   | orange | Shortage            |
 * | < 1.0     | red    | Critical Shortage   |
 *
 * @see Implementation Plan §10.1
 */
export function getDosColorLevel(dos: number): ColorLevel {
  if (dos >= 5.0) return 'green';
  if (dos >= 3.0) return 'yellow';
  if (dos >= 1.0) return 'orange';
  return 'red';
}

/** Human-readable label for DOS level. */
export function getDosLabel(dos: number): string {
  if (dos >= 5.0) return 'Adequate';
  if (dos >= 3.0) return 'Low — Consider Restock';
  if (dos >= 1.0) return 'Shortage';
  return 'Critical Shortage';
}

/**
 * Determine expiry alert color level for a blood unit.
 *
 * | Days to Expiry | Color  | Alert                        |
 * |----------------|--------|------------------------------|
 * | > 7            | green  | Normal                       |
 * | 4-7            | yellow | Expires Soon                 |
 * | 1-3            | orange | Expiring — Prioritize        |
 * | 0-1            | red    | Expiring Today               |
 * | < 0            | gray   | Expired (Hard Stop)          |
 *
 * @see Implementation Plan §10.2
 */
export function getExpiryColorLevel(daysUntilExpiry: number): ColorLevel {
  if (daysUntilExpiry < 0) return 'gray';
  if (daysUntilExpiry <= 1) return 'red';
  if (daysUntilExpiry <= 3) return 'orange';
  if (daysUntilExpiry <= 7) return 'yellow';
  return 'green';
}

/** Human-readable label for expiry status. */
export function getExpiryLabel(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry === 0) return 'Expires Today';
  if (daysUntilExpiry <= 3) return `Expires in ${daysUntilExpiry}d`;
  if (daysUntilExpiry <= 7) return 'Expires Soon';
  return '';
}

/**
 * Evaluate a KPI value against configurable thresholds.
 *
 * @param value       - Current KPI value
 * @param greenMax    - Maximum value for green (good). Values <= greenMax are green.
 * @param yellowMax   - Maximum value for yellow (warning). Values <= yellowMax are yellow.
 * @param higherIsBetter - If true, higher values are better (e.g., compliance rate).
 *
 * @see Implementation Plan §10.4
 */
export function getKpiColorLevel(
  value: number,
  greenMax: number,
  yellowMax: number,
  higherIsBetter = false,
): ColorLevel {
  if (higherIsBetter) {
    // e.g., Dual Review Compliance: 100% target, <95% is red
    if (value >= greenMax) return 'green';
    if (value >= yellowMax) return 'yellow';
    return 'red';
  }
  // e.g., Wastage Rate: <2% target, >5% is red
  if (value <= greenMax) return 'green';
  if (value <= yellowMax) return 'yellow';
  return 'red';
}
