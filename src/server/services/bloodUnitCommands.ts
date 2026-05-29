import {
  BloodUnitStateMachine,
  normalizeBloodUnitStatus,
  type TransitionContext,
} from '../../lib/stateMachine';
import type { BloodUnitStatus, DomainError, Role } from '../../types';
import * as db from '../db';

export interface BloodUnitTransitionCommand {
  unitId: string;
  currentStatus: string;
  targetStatus: string;
  role: Role;
  context?: TransitionContext;
  correlationId?: string;
}

export interface AllowedBloodUnitTransition {
  allowed: true;
  unitId: string;
  fromStatus: BloodUnitStatus;
  targetStatus: BloodUnitStatus;
  sop?: string;
}

export interface BlockedBloodUnitTransition {
  allowed: false;
  error: DomainError;
  httpStatus: number;
}

export type BloodUnitTransitionDecision =
  | AllowedBloodUnitTransition
  | BlockedBloodUnitTransition;

export function isBloodUnitExpired(expiryDate?: string | null, now = new Date()): boolean {
  if (!expiryDate) return false;

  const expiryTime = Date.parse(expiryDate);
  if (Number.isNaN(expiryTime)) return false;

  return expiryTime <= now.getTime();
}

export function evaluateBloodUnitTransition(
  command: BloodUnitTransitionCommand,
): BloodUnitTransitionDecision {
  const fromStatus = normalizeBloodUnitStatus(command.currentStatus);
  if (!fromStatus) {
    return blocked(command, 400, 'UNKNOWN_CURRENT_STATUS', `Unknown blood unit status '${command.currentStatus}'.`);
  }

  const targetStatus = normalizeBloodUnitStatus(command.targetStatus);
  if (!targetStatus) {
    return blocked(command, 400, 'UNKNOWN_TARGET_STATUS', `Unknown target blood unit status '${command.targetStatus}'.`);
  }

  const result = BloodUnitStateMachine.transition(
    fromStatus,
    targetStatus,
    command.role,
    command.context ?? {},
  );

  if (!result.allowed) {
    const code = result.reason?.startsWith('[Security]')
      ? 'ROLE_NOT_AUTHORIZED'
      : 'TRANSITION_BLOCKED';

    return blocked(
      command,
      code === 'ROLE_NOT_AUTHORIZED' ? 403 : 400,
      code,
      result.reason ?? `Blood unit transition ${fromStatus} -> ${targetStatus} is not allowed.`,
    );
  }

  return {
    allowed: true,
    unitId: command.unitId,
    fromStatus,
    targetStatus,
    sop: BloodUnitStateMachine.getTransitionSop(fromStatus, targetStatus),
  };
}

export interface BloodUnitExecutionResult {
  success: boolean;
  fromStatus: BloodUnitStatus;
  targetStatus: BloodUnitStatus;
  error?: DomainError;
  httpStatus?: number;
}

export async function executeBloodUnitTransition(
  command: BloodUnitTransitionCommand,
  actorId = 'SYSTEM',
  deviceId = 'SERVER',
  reasonCode = 'SOP_TRANSITION',
  requestId = 'REQ-AUTO',
  extraInventoryFields?: Partial<any>
): Promise<BloodUnitExecutionResult> {
  const decision = evaluateBloodUnitTransition(command);
  if (decision.allowed === false) {
    return {
      success: false,
      fromStatus: normalizeBloodUnitStatus(command.currentStatus) || 'COLLECTED',
      targetStatus: normalizeBloodUnitStatus(command.targetStatus) || 'COLLECTED',
      error: decision.error,
      httpStatus: decision.httpStatus,
    };
  }

  const { fromStatus, targetStatus } = decision;

  // 2. Sync inventory status with optimistic lock or default create
  try {
    const allInv = await db.inventory.getAll();
    const invItem = allInv.find((i: any) => i.unitId === command.unitId);
    const clientVersion = command.context?.baseVersion;

    if (invItem) {
      // Version check BEFORE any write — fail fast on concurrency conflict
      if (clientVersion !== undefined && invItem.version !== undefined && Number(clientVersion) !== Number(invItem.version)) {
        // Structured return instead of throw — allows callers to handle gracefully
        return {
          success: false,
          fromStatus,
          targetStatus,
          error: {
            code: 'VERSION_CONFLICT',
            message: `ConcurrencyConflict: Unit ${command.unitId} has been modified by another process. Client version: ${clientVersion}, server version: ${invItem.version}.`,
            severity: 'HardStop',
            actionRequired: 'Refresh and retry.',
          } as DomainError,
          httpStatus: 409,
        };
      }
      const currentVer = invItem.version || 1;

      // 1a. Update component status now (version check passed)
      await db.components.updateStatus(command.unitId, targetStatus);

      // 1b. Sync inventory
      if (typeof db.inventory.updateStatusWithLock === 'function') {
        await db.inventory.updateStatusWithLock(command.unitId, currentVer, {
          ...extraInventoryFields,
          status: targetStatus,
        });
      } else {
        await db.inventory.create({
          ...invItem,
          ...extraInventoryFields,
          status: targetStatus,
          version: currentVer + 1,
        });
      }
    } else {
      // No existing inventory item — component update + create new inventory record
      await db.components.updateStatus(command.unitId, targetStatus);

      let comp: any = null;
      if (typeof db.components.getById === 'function') {
        comp = await db.components.getById(command.unitId);
      } else {
        // Fallback: scan components.getAll (test compat)
        const allComps = await db.components.getAll();
        comp = allComps.find((c: any) => c.id === command.unitId);
      }
      if (comp) {
        await db.inventory.create({
          unitId: command.unitId,
          productCode: comp.productCode || 'E4226',
          abo: comp.abo || 'O',
          rhd: comp.rhd || '+',
          expiryDate: comp.expiryDate,
          version: 1,
          ...extraInventoryFields,
          status: targetStatus,
        });
      }
    }
  } catch (invErr: any) {
    console.warn(`[Inventory Sync Error] Unit ${command.unitId}:`, invErr);
    // Fail-closed in production: an inventory write failure must NOT be reported
    // as a successful transition (RTM-STATE-03). In dev/test the in-memory
    // fallbacks are best-effort and remain lenient.
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        fromStatus,
        targetStatus,
        error: {
          code: 'INVENTORY_SYNC_FAILED',
          message: `Inventory synchronization failed for unit ${command.unitId}. Transition not confirmed.`,
          severity: 'HardStop',
          actionRequired: 'Do not assume the unit moved. Investigate and retry.',
        } as DomainError,
        httpStatus: 500,
      };
    }
  }

  // 3. Write immutable append-only audit event
  try {
    await db.auditEvents.create({
      eventType: 'Transition',
      objectId: command.unitId,
      objectType: 'Component',
      actorId,
      actorRole: command.role,
      deviceId,
      reasonCode,
      requestId,
      beforeHash: fromStatus,
      afterHash: targetStatus,
      details: `Centralized Transition: ${fromStatus} -> ${targetStatus} for unit ${command.unitId}. Reason: ${reasonCode}.`,
      timestamp: new Date().toISOString(),
    });
  } catch (auditErr) {
    console.warn(`[Audit Event Fail] Centralized audit for unit ${command.unitId}:`, auditErr);
    // Fail-closed in production: audit evidence is part of the transition
    // contract. Without it, the action must not be reported as successful.
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        fromStatus,
        targetStatus,
        error: {
          code: 'AUDIT_WRITE_FAILED',
          message: `Audit evidence could not be recorded for unit ${command.unitId}. Transition rejected.`,
          severity: 'HardStop',
          actionRequired: 'Retry. If it persists, stop and escalate — clinical actions require audit evidence.',
        } as DomainError,
        httpStatus: 500,
      };
    }
  }

  return {
    success: true,
    fromStatus,
    targetStatus,
  };
}

export function bloodUnitCommandErrorBody(error: DomainError) {
  return {
    error: error.message,
    code: error.code,
    severity: error.severity,
    actionRequired: error.actionRequired,
    auditHint: error.auditHint,
    correlationId: error.correlationId,
  };
}

function blocked(
  command: BloodUnitTransitionCommand,
  httpStatus: number,
  code: string,
  message: string,
): BlockedBloodUnitTransition {
  return {
    allowed: false,
    httpStatus,
    error: {
      code,
      message,
      severity: 'HardStop',
      actionRequired: 'Do not update the blood unit status. Review the SOP step, role, unit state, and exception policy.',
      auditHint: `${command.unitId}:${command.currentStatus}->${command.targetStatus}`,
      correlationId: command.correlationId ?? createCorrelationId(),
    },
  };
}

function createCorrelationId(): string {
  return `DERR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

