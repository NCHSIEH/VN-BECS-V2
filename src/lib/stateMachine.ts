/**
 * @fileoverview Blood Unit State Machine (Implementation Plan §3)
 *
 * Enforces the lifecycle of blood components from COLLECTED to terminal states.
 * All state transitions are validated against guard conditions and role requirements.
 *
 * Terminal states (irreversible): DISCARDED, TRANSFUSED, WASTED
 */

import type {
  BloodAssignmentStatus,
  BloodInventoryStatus,
  BloodQualityStatus,
  BloodUnitStateSnapshot,
  BloodUnitStatus,
  Role,
} from '../types';

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export interface TransitionContext {
  idmStatus?: 'PENDING' | 'CLEARED' | 'REACTIVE';
  orderApproved?: boolean;
  barcodeScanMatch?: boolean;
  coldChainCompliant?: boolean;
  crossmatchResult?: 'Compatible' | 'Incompatible' | 'Inconclusive' | 'Emergency_Bypass';
  medicalOrderConfirmed?: boolean;
  dualVerificationPassed?: boolean;
  minutesSinceIssue?: number;
  visualInspectionPassed?: boolean;
  isExpired?: boolean;
  isBreakGlass?: boolean; // Added for SOP 10 Emergency Release
  isUnderLookback?: boolean; // Added for Hemovigilance Lookback safeguard
  baseVersion?: number; // Optimistic-lock client version (used by command service)
}

interface TransitionRule {
  from: BloodUnitStatus;
  to: BloodUnitStatus;
  sop: string;
  allowedRoles: Role[];
  guard: (ctx: TransitionContext) => string | null;
}

const TERMINAL_STATES: ReadonlySet<BloodUnitStatus> = new Set([
  'DISCARDED',
  'TRANSFUSED',
  'WASTED',
]);

const LEGACY_STATUS_TO_STATE: Readonly<Record<string, BloodUnitStateSnapshot>> = {
  COLLECTED: {
    qualityStatus: 'PENDING_TEST',
    inventoryStatus: 'NOT_IN_STOCK',
    assignmentStatus: 'UNASSIGNED',
  },
  QUARANTINE: {
    qualityStatus: 'PENDING_TEST',
    inventoryStatus: 'NOT_IN_STOCK',
    assignmentStatus: 'UNASSIGNED',
  },
  QUARANTINED: {
    qualityStatus: 'HOLD_IDM',
    inventoryStatus: 'NOT_IN_STOCK',
    assignmentStatus: 'UNASSIGNED',
  },
  AVAILABLE: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'AVAILABLE',
    assignmentStatus: 'UNASSIGNED',
  },
  RELEASED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'AVAILABLE',
    assignmentStatus: 'UNASSIGNED',
  },
  ALLOCATED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'ORDER_RESERVED',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  RESERVED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'ORDER_RESERVED',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  PICKED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'PICKED',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  'HUB INTRANSIT': {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'IN_TRANSIT',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  IN_TRANSIT: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'IN_TRANSIT',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  RECEIVED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'RECEIVED',
    assignmentStatus: 'ORDER_ALLOCATED',
  },
  CROSSMATCHED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'RECEIVED',
    assignmentStatus: 'CROSSMATCH_COMPATIBLE',
  },
  ISSUED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'ISSUED',
    assignmentStatus: 'PATIENT_ASSIGNED',
  },
  RETURNED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'RETURN_PENDING',
    assignmentStatus: 'PATIENT_ASSIGNED',
  },
  TRANSFUSED: {
    qualityStatus: 'RELEASED',
    inventoryStatus: 'TRANSFUSED',
    assignmentStatus: 'PATIENT_ASSIGNED',
  },
  WASTED: {
    qualityStatus: 'NONCONFORMING',
    inventoryStatus: 'WASTED',
    assignmentStatus: 'UNASSIGNED',
  },
  DISCARDED: {
    qualityStatus: 'DISCARDED',
    inventoryStatus: 'WASTED',
    assignmentStatus: 'UNASSIGNED',
  },
  EXPIRED: {
    qualityStatus: 'NONCONFORMING',
    inventoryStatus: 'WASTED',
    assignmentStatus: 'UNASSIGNED',
  },
};

const LEGACY_STATUS_TO_CANONICAL_STATUS: Readonly<Record<string, BloodUnitStatus>> = {
  COLLECTED: 'COLLECTED',
  QUARANTINE: 'QUARANTINE',
  QUARANTINED: 'QUARANTINE',
  AVAILABLE: 'AVAILABLE',
  RELEASED: 'AVAILABLE',
  ALLOCATED: 'RESERVED',
  RESERVED: 'RESERVED',
  PICKED: 'PICKED',
  'HUB INTRANSIT': 'IN_TRANSIT',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  CROSSMATCHED: 'CROSSMATCHED',
  ISSUED: 'ISSUED',
  RETURNED: 'RETURNED',
  TRANSFUSED: 'TRANSFUSED',
  WASTED: 'WASTED',
  DISCARDED: 'DISCARDED',
  EXPIRED: 'WASTED',
};

function normalizeStatusKey(status: string): string {
  return status.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function normalizeBloodUnitState(status: string): BloodUnitStateSnapshot | null {
  return LEGACY_STATUS_TO_STATE[normalizeStatusKey(status)] ?? null;
}

export function normalizeBloodUnitStatus(status: string): BloodUnitStatus | null {
  return LEGACY_STATUS_TO_CANONICAL_STATUS[normalizeStatusKey(status)] ?? null;
}

export function isKnownBloodUnitState(status: string): boolean {
  return normalizeStatusKey(status) in LEGACY_STATUS_TO_STATE;
}

export const BLOOD_QUALITY_STATUSES: readonly BloodQualityStatus[] = [
  'PENDING_TEST',
  'RELEASED',
  'HOLD_IDM',
  'HOLD_COLD_CHAIN',
  'HOLD_LOOKBACK',
  'NONCONFORMING',
  'DISCARDED',
];

export const BLOOD_INVENTORY_STATUSES: readonly BloodInventoryStatus[] = [
  'NOT_IN_STOCK',
  'AVAILABLE',
  'ORDER_RESERVED',
  'PICKED',
  'IN_TRANSIT',
  'RECEIVED',
  'ISSUED',
  'RETURN_PENDING',
  'WASTED',
  'TRANSFUSED',
];

export const BLOOD_ASSIGNMENT_STATUSES: readonly BloodAssignmentStatus[] = [
  'UNASSIGNED',
  'ORDER_ALLOCATED',
  'PATIENT_ASSIGNED',
  'CROSSMATCH_COMPATIBLE',
  'EMERGENCY_RELEASED',
];

const TRANSITION_RULES: readonly TransitionRule[] = [
  {
    from: 'COLLECTED',
    to: 'QUARANTINE',
    sop: 'SOP1',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'QUARANTINE',
    to: 'AVAILABLE',
    sop: 'SOP2',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: (ctx) => {
      if (ctx.idmStatus !== 'CLEARED') return '[SOP 2] IDM status must be CLEARED to release to inventory.';
      if (ctx.isUnderLookback) return '[Safety Block] Component is under active Hemovigilance Lookback investigation. Release is strictly prohibited.';
      return null;
    },
  },
  {
    from: 'QUARANTINE',
    to: 'DISCARDED',
    sop: 'SOP2',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: (ctx) => ctx.idmStatus === 'REACTIVE' ? null : '[SOP 2] Only REACTIVE units can be discarded from quarantine.',
  },
  {
    from: 'AVAILABLE',
    to: 'RESERVED',
    sop: 'SOP4',
    allowedRoles: ['Dispatcher', 'WarehouseIssuer', 'Admin', 'HospitalOperator'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot reserve an expired blood unit.';
      return ctx.orderApproved ? null : '[SOP 4] Order must be approved before reservation.';
    },
  },
  {
    from: 'AVAILABLE',
    to: 'IN_TRANSIT',
    sop: 'SOP3',
    allowedRoles: ['LIMS_Simulator', 'QA_Officer', 'Admin'],
    guard: (ctx) => ctx.isExpired ? '[Safety Error] Cannot release an expired blood unit to the hub.' : null,
  },
  {
    from: 'AVAILABLE',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'RESERVED',
    to: 'AVAILABLE',
    sop: 'SOP4',
    allowedRoles: ['Dispatcher', 'WarehouseIssuer', 'HospitalOperator', 'Admin'],
    guard: (ctx) => ctx.isExpired ? '[Safety Error] Expired reserved unit must be wasted, not returned to available stock.' : null,
  },
  {
    from: 'RESERVED',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'RESERVED',
    to: 'PICKED',
    sop: 'Warehouse',
    allowedRoles: ['WarehouseIssuer', 'Admin', 'HospitalOperator'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot pick an expired blood unit.';
      return ctx.barcodeScanMatch ? null : '[SOP 4] Barcode mismatch (ERR_BARCODE_MISMATCH). Scan again.';
    },
  },
  {
    from: 'PICKED',
    to: 'IN_TRANSIT',
    sop: 'SOP5',
    allowedRoles: ['Courier', 'Admin'],
    guard: () => null,
  },
  {
    from: 'PICKED',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'PICKED',
    to: 'WASTED',
    sop: 'SOP5',
    allowedRoles: ['WarehouseIssuer', 'Courier', 'Admin'],
    guard: () => null,
  },
  {
    from: 'IN_TRANSIT',
    to: 'RECEIVED',
    sop: 'SOP5',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'IN_TRANSIT',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'IN_TRANSIT',
    to: 'WASTED',
    sop: 'SOP5',
    allowedRoles: ['Courier', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'RECEIVED',
    to: 'CROSSMATCHED',
    sop: 'SOP7',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot crossmatch an expired blood unit.';
      if (ctx.isBreakGlass) return null; // Bypass for SOP 10
      return ctx.crossmatchResult === 'Compatible'
        ? null
        : `[SOP 7] Crossmatch must be Compatible (got: ${ctx.crossmatchResult ?? 'none'}).`;
    },
  },
  {
    from: 'RECEIVED',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'RECEIVED',
    to: 'WASTED',
    sop: 'SOP5',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'CROSSMATCHED',
    to: 'QUARANTINE',
    sop: 'Hemovigilance',
    allowedRoles: ['QA_Officer', 'MedicalReviewer', 'HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'CROSSMATCHED',
    to: 'ISSUED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Admin', 'Nurse'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot issue an expired blood unit.';
      if (ctx.isBreakGlass) return null; // Bypass for SOP 10
      return ctx.medicalOrderConfirmed ? null : '[SOP 8] Medical order must be confirmed prior to issue.';
    },
  },
  {
    from: 'ISSUED',
    to: 'TRANSFUSED',
    sop: 'SOP6',
    allowedRoles: ['Nurse', 'Admin'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot transfuse an expired blood unit.';
      return ctx.dualVerificationPassed ? null : '[SOP 6] Dual bedside verification (2 qualified clinicians) is required.';
    },
  },
  {
    from: 'ISSUED',
    to: 'RETURNED',
    sop: 'SOP8',
    allowedRoles: ['Nurse', 'HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (ctx.minutesSinceIssue !== undefined && ctx.minutesSinceIssue > 30) {
        return '[SOP 8] 30-minute rule exceeded. Unit cannot be returned to active stock. It must be marked WASTED.';
      }
      return null;
    },
  },
  {
    from: 'RETURNED',
    to: 'AVAILABLE',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (!ctx.coldChainCompliant) return '[SOP 8] Cold chain deviation detected. Unit cannot be re-shelved.';
      if (!ctx.visualInspectionPassed) return '[SOP 8] Visual inspection failed. Unit cannot be re-shelved.';
      return null;
    },
  },
  {
    from: 'RETURNED',
    to: 'WASTED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: () => null,
  },
  {
    from: 'ISSUED',
    to: 'WASTED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Nurse', 'Admin'],
    guard: () => null,
  },
  // Emergency transitions
  {
    from: 'AVAILABLE',
    to: 'ISSUED',
    sop: 'SOP10',
    allowedRoles: ['HospitalOperator', 'Admin', 'Nurse'],
    guard: (ctx) => {
      if (ctx.isExpired) return '[Safety Error] Cannot emergency issue an expired blood unit.';
      if (!ctx.isBreakGlass) return '[SOP 10] Direct issue from AVAILABLE is only allowed in Break-Glass emergency mode.';
      return null;
    }
  }
];

export const BloodUnitStateMachine = {
  isTerminal(status: BloodUnitStatus): boolean {
    return TERMINAL_STATES.has(status);
  },

  transition(
    from: BloodUnitStatus,
    to: BloodUnitStatus,
    role: Role,
    context: TransitionContext = {},
  ): TransitionResult {
    if (TERMINAL_STATES.has(from)) {
      return { allowed: false, reason: `[System] Cannot transition from terminal state: ${from}` };
    }

    const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to);
    if (!rule) {
      return {
        allowed: false,
        reason: `[System] Invalid transition path: ${from} → ${to}`,
      };
    }

    if (!rule.allowedRoles.includes(role)) {
      return {
        allowed: false,
        reason: `[Security] Role '${role}' is not authorized for ${from} → ${to}.`,
      };
    }

    const guardError = rule.guard(context);
    if (guardError) {
      return { allowed: false, reason: guardError };
    }

    return { allowed: true };
  },

  getValidTransitions(from: BloodUnitStatus, role: Role): BloodUnitStatus[] {
    if (TERMINAL_STATES.has(from)) return [];
    return TRANSITION_RULES
      .filter((r) => r.from === from && r.allowedRoles.includes(role))
      .map((r) => r.to);
  },

  getTransitionSop(from: BloodUnitStatus, to: BloodUnitStatus): string | undefined {
    return TRANSITION_RULES.find((r) => r.from === from && r.to === to)?.sop;
  },
};
