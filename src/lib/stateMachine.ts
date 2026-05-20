/**
 * @fileoverview Blood Unit State Machine (Implementation Plan §3)
 *
 * Enforces the lifecycle of blood components from COLLECTED to terminal states.
 * All state transitions are validated against guard conditions and role requirements.
 *
 * Terminal states (irreversible): DISCARDED, TRANSFUSED, WASTED
 *
 * @example
 * ```ts
 * import { BloodUnitStateMachine } from './stateMachine';
 * const result = BloodUnitStateMachine.transition('QUARANTINE', 'AVAILABLE', 'LIMS_Simulator');
 * if (!result.allowed) console.error(result.reason);
 * ```
 */

import type { BloodUnitStatus, Role } from '../types';

/** Represents the outcome of a state transition attempt. */
export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/** Context for evaluating guard conditions. */
export interface TransitionContext {
  /** IDM status from lab test (SOP 2). */
  idmStatus?: 'PENDING' | 'CLEARED' | 'REACTIVE';
  /** Whether the order has been approved (SOP 4). */
  orderApproved?: boolean;
  /** Whether the barcode scan matched (warehouse). */
  barcodeScanMatch?: boolean;
  /** Whether cold chain was maintained (SOP 5). */
  coldChainCompliant?: boolean;
  /** Crossmatch result (SOP 7). */
  crossmatchResult?: 'Compatible' | 'Incompatible' | 'Inconclusive';
  /** Whether a medical order exists (SOP 8). */
  medicalOrderConfirmed?: boolean;
  /** Whether dual verification passed (SOP 6). */
  dualVerificationPassed?: boolean;
  /** Minutes since issue for return evaluation (SOP 8). */
  minutesSinceIssue?: number;
  /** Whether visual inspection passed (SOP 8). */
  visualInspectionPassed?: boolean;
  /** Whether the blood unit has expired. */
  isExpired?: boolean;
}

/** Definition of a single allowed state transition. */
interface TransitionRule {
  from: BloodUnitStatus;
  to: BloodUnitStatus;
  sop: string;
  allowedRoles: Role[];
  /** Guard condition — return null if passed, or error message if blocked. */
  guard: (ctx: TransitionContext) => string | null;
}

/** Immutable terminal states — no transitions allowed from these. */
const TERMINAL_STATES: ReadonlySet<BloodUnitStatus> = new Set([
  'DISCARDED',
  'TRANSFUSED',
  'WASTED',
]);

/**
 * Complete transition rules table.
 * See Implementation Plan §3 "State Transition Rules".
 */
const TRANSITION_RULES: readonly TransitionRule[] = [
  {
    from: 'COLLECTED',
    to: 'QUARANTINE',
    sop: 'SOP1',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: () => null,  // Automatic transition
  },
  {
    from: 'QUARANTINE',
    to: 'AVAILABLE',
    sop: 'SOP2',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: (ctx) => ctx.idmStatus === 'CLEARED' ? null : 'IDM status must be CLEARED',
  },
  {
    from: 'QUARANTINE',
    to: 'DISCARDED',
    sop: 'SOP2',
    allowedRoles: ['LIMS_Simulator', 'Admin'],
    guard: (ctx) => ctx.idmStatus === 'REACTIVE' ? null : 'IDM status must be REACTIVE to discard',
  },
  {
    from: 'AVAILABLE',
    to: 'RESERVED',
    sop: 'SOP4',
    allowedRoles: ['Dispatcher', 'Admin'],
    guard: (ctx) => {
      if (ctx.isExpired) return 'Cannot reserve expired blood unit';
      return ctx.orderApproved ? null : 'Order must be approved before reservation';
    },
  },
  {
    from: 'RESERVED',
    to: 'PICKED',
    sop: 'Warehouse',
    allowedRoles: ['WarehouseIssuer', 'Admin'],
    guard: (ctx) => ctx.barcodeScanMatch ? null : 'Barcode scan must match (ERR_BARCODE_MISMATCH)',
  },
  {
    from: 'PICKED',
    to: 'IN_TRANSIT',
    sop: 'SOP5',
    allowedRoles: ['Courier', 'Admin'],
    guard: () => null,  // Cold box scan confirmation
  },
  {
    from: 'IN_TRANSIT',
    to: 'RECEIVED',
    sop: 'SOP5',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: () => null,  // Delivery scan confirmation
  },
  {
    from: 'RECEIVED',
    to: 'CROSSMATCHED',
    sop: 'SOP7',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (ctx.isExpired) return 'Cannot crossmatch expired blood unit';
      return ctx.crossmatchResult === 'Compatible'
        ? null
        : `Crossmatch must be Compatible (got: ${ctx.crossmatchResult ?? 'none'})`;
    },
  },
  {
    from: 'CROSSMATCHED',
    to: 'ISSUED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (ctx.isExpired) return 'Cannot issue expired blood unit';
      return ctx.medicalOrderConfirmed ? null : 'Medical order must be confirmed';
    },
  },
  {
    from: 'ISSUED',
    to: 'TRANSFUSED',
    sop: 'SOP6',
    allowedRoles: ['Nurse', 'Admin'],
    guard: (ctx) => ctx.dualVerificationPassed ? null : 'Dual verification (2 nurses) required',
  },
  {
    from: 'ISSUED',
    to: 'RETURNED',
    sop: 'SOP8',
    allowedRoles: ['Nurse', 'HospitalOperator', 'Admin'],
    guard: (ctx) => {
      if (ctx.minutesSinceIssue !== undefined && ctx.minutesSinceIssue > 30) {
        return 'Return window exceeded (>30 minutes) — unit must be marked WASTED';
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
      if (!ctx.coldChainCompliant) return 'Cold chain must be compliant for re-shelving';
      if (!ctx.visualInspectionPassed) return 'Visual inspection must pass for re-shelving';
      return null;
    },
  },
  {
    from: 'RETURNED',
    to: 'WASTED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Admin'],
    guard: () => null,  // Always allowed — cold chain violation or visual fail
  },
  {
    from: 'ISSUED',
    to: 'WASTED',
    sop: 'SOP8',
    allowedRoles: ['HospitalOperator', 'Nurse', 'Admin'],
    guard: () => null,  // Expiry or damage
  },
];

/**
 * Blood Unit State Machine — the core lifecycle engine.
 *
 * All state transitions in the system MUST go through this module.
 * Frontend uses it for UI gating (hide/show buttons).
 * Backend uses it as the authoritative guard.
 */
export const BloodUnitStateMachine = {
  /** Check if a status is a terminal (irreversible) state. */
  isTerminal(status: BloodUnitStatus): boolean {
    return TERMINAL_STATES.has(status);
  },

  /**
   * Attempt a state transition.
   *
   * @param from    - Current status of the blood unit
   * @param to      - Desired target status
   * @param role    - Role of the user attempting the transition
   * @param context - Additional context for guard evaluation
   * @returns TransitionResult with allowed=true or reason for rejection
   */
  transition(
    from: BloodUnitStatus,
    to: BloodUnitStatus,
    role: Role,
    context: TransitionContext = {},
  ): TransitionResult {
    // Block any transition from terminal states
    if (TERMINAL_STATES.has(from)) {
      return { allowed: false, reason: `Cannot transition from terminal state: ${from}` };
    }

    // Find matching rule
    const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to);
    if (!rule) {
      return {
        allowed: false,
        reason: `No transition rule exists: ${from} → ${to}`,
      };
    }

    // Check role permission
    if (!rule.allowedRoles.includes(role)) {
      return {
        allowed: false,
        reason: `Role '${role}' is not authorized for ${from} → ${to} (requires: ${rule.allowedRoles.join(', ')})`,
      };
    }

    // Evaluate guard condition
    const guardError = rule.guard(context);
    if (guardError) {
      return { allowed: false, reason: guardError };
    }

    return { allowed: true };
  },

  /**
   * Get all valid next states from a given status for a specific role.
   * Useful for UI to determine which action buttons to show.
   */
  getValidTransitions(from: BloodUnitStatus, role: Role): BloodUnitStatus[] {
    if (TERMINAL_STATES.has(from)) return [];
    return TRANSITION_RULES
      .filter((r) => r.from === from && r.allowedRoles.includes(role))
      .map((r) => r.to);
  },

  /**
   * Get the SOP identifier for a given transition.
   */
  getTransitionSop(from: BloodUnitStatus, to: BloodUnitStatus): string | undefined {
    return TRANSITION_RULES.find((r) => r.from === from && r.to === to)?.sop;
  },
};
