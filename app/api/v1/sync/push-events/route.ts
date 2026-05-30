import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import {
  BloodUnitStateMachine,
  normalizeBloodUnitStatus,
  type TransitionContext,
} from '@/src/lib/stateMachine';
import type { BloodUnitStatus, Role } from '@/src/types';
import {
  buildOfflineEventReceipt,
  findPriorOfflineSyncResult,
  isOfflineEventStale,
  offlineEventKey,
  syncResult,
  verifyOfflineEventSignature,
} from '@/src/server/services/offlineSync';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

type SyncOutcome = ReturnType<typeof syncResult>;

interface PrecheckFailure {
  state: 'Rejected' | 'NeedsReview';
  error: string;
  errorCode: string;
}

interface SyncOperation {
  targetStatus: BloodUnitStatus;
  role: Role;
  actorId: string;
  /** Validate operation-specific clinical prerequisites before touching inventory. */
  precheck?: (event: any) => PrecheckFailure | null;
  buildContext: (event: any, item: any) => TransitionContext;
  /** Optional side-effect after a successful transition (e.g. transfusion record). */
  onSuccess?: (event: any, item: any) => Promise<void>;
}

const QUARANTINE_HOLD_STATUSES = new Set(['QUARANTINE', 'QUARANTINED', 'HOLD_LOOKBACK']);

function patientRefOf(event: any): string | undefined {
  return event.patientRef || event.payload?.patientRef || event.payload?.patientId;
}

/**
 * Declarative map of the offline operations the server will replay. Each entry
 * owns only what differs between operations; the shared lookup → terminal-guard
 * → transition → receipt flow lives once in `processOfflineEvent`.
 */
const SYNC_OPERATIONS: Record<string, SyncOperation> = {
  IssueBag: {
    targetStatus: 'ISSUED',
    role: 'Nurse',
    actorId: 'System',
    precheck: (event) => {
      if (!patientRefOf(event)) {
        return { state: 'Rejected', error: 'Missing patient reference for offline issue event', errorCode: 'PATIENT_REF_REQUIRED' };
      }
      const p = event.payload;
      if (p?.isBreakGlass !== true && p?.emergencyOverride !== true) {
        return { state: 'NeedsReview', error: 'Offline issue requires documented break-glass authorization', errorCode: 'BREAK_GLASS_REQUIRED' };
      }
      return null;
    },
    buildContext: (event, item) => ({
      isBreakGlass: event.payload?.isBreakGlass === true || event.payload?.emergencyOverride === true,
      isExpired: isBloodUnitExpired(item.expiryDate),
      baseVersion: event.baseVersion || item.version,
    }),
  },
  TransfuseBag: {
    targetStatus: 'TRANSFUSED',
    role: 'Nurse',
    actorId: 'Nurse',
    precheck: (event) => {
      if (!patientRefOf(event)) {
        return { state: 'Rejected', error: 'Missing patient reference for offline transfusion event', errorCode: 'PATIENT_REF_REQUIRED' };
      }
      const p = event.payload;
      if (p?.consentVerified !== true || p?.preVitalsChecked !== true) {
        return { state: 'Rejected', error: 'Clinical prerequisites (consent, vitals) missing', errorCode: 'BEDSIDE_CLINICAL_PREREQUISITES_MISSING' };
      }
      if (!p?.verifier1 || !p?.verifier2Pin) {
        return { state: 'Rejected', error: 'Dual bedside verification required', errorCode: 'DUAL_VERIFICATION_REQUIRED' };
      }
      return null;
    },
    buildContext: (event, item) => ({
      dualVerificationPassed: true,
      isExpired: isBloodUnitExpired(item.expiryDate),
      isUnderLookback: QUARANTINE_HOLD_STATUSES.has(item.status),
      baseVersion: event.baseVersion || item.version,
    }),
    onSuccess: async (event, item) => {
      await db.transfusions.create({
        componentId: item.unitId,
        patientId: patientRefOf(event),
        verifier1: event.payload.verifier1,
        verifier2Pin: event.payload.verifier2Pin,
        consentVerified: true,
        preVitalsChecked: true,
        status: 'COMPLETED',
        startedAt: event.clientTimestamp || new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    },
  },
  WasteBag: {
    targetStatus: 'WASTED',
    role: 'HospitalOperator',
    actorId: 'System',
    precheck: (event) => {
      const reasonCode = event.payload?.reasonCode || event.payload?.reason;
      if (!reasonCode) {
        return { state: 'Rejected', error: 'Missing reason code for offline waste event', errorCode: 'MISSING_REASON_CODE' };
      }
      return null;
    },
    buildContext: (event, item) => ({ baseVersion: event.baseVersion || item.version }),
  },
  ReceiveBag: {
    targetStatus: 'RECEIVED',
    role: 'HospitalOperator',
    actorId: 'System',
    buildContext: (event, item) => ({ baseVersion: event.baseVersion || item.version }),
  },
};

async function processOfflineEvent(event: any, requestId: string | null): Promise<SyncOutcome> {
  // OFF-01: reject tampered/forged events when offline signing is configured.
  const sig = verifyOfflineEventSignature(event);
  if (!sig.ok) {
    return syncResult(event, 'Rejected', {
      error: sig.reason === 'MISSING_SIGNATURE' ? 'Offline event signature is required' : 'Offline event signature is invalid',
      errorCode: sig.reason,
    });
  }

  const op = SYNC_OPERATIONS[event.operationType];
  if (!op) {
    return syncResult(event, 'Rejected', { error: 'Unknown operationType', errorCode: 'UNKNOWN_OPERATION_TYPE' });
  }

  // OFF-01: stale offline events go to manual review instead of auto-applying.
  const staleness = isOfflineEventStale(event);
  if (staleness.stale) {
    return syncResult(event, 'NeedsReview', {
      error: `Offline event is ${staleness.ageHours}h old (> ${staleness.maxHours}h limit); manual review required`,
      errorCode: 'OFFLINE_EVENT_STALE',
    });
  }

  const precheckFailure = op.precheck?.(event);
  if (precheckFailure) {
    return syncResult(event, precheckFailure.state, {
      error: precheckFailure.error,
      errorCode: precheckFailure.errorCode,
    });
  }

  const unitId = event.bagUid || event.din;
  const allInventory = await db.inventory.getAll();
  const item = allInventory.find((u: any) => u.unitId === unitId);

  if (!item) {
    return syncResult(event, 'Rejected', { error: 'Bag not found in central DB', errorCode: 'BAG_NOT_FOUND' });
  }

  const normalizedStatus = normalizeBloodUnitStatus(item.status);
  if (normalizedStatus && BloodUnitStateMachine.isTerminal(normalizedStatus)) {
    return syncResult(event, 'NeedsReview', {
      error: `Offline event cannot overwrite terminal blood unit state ${normalizedStatus}`,
      errorCode: 'TERMINAL_STATE_CONFLICT',
      currentStatus: item.status,
      serverVersion: item.version,
    });
  }

  const transitionResult = await executeBloodUnitTransition(
    {
      unitId,
      currentStatus: item.status,
      targetStatus: op.targetStatus,
      role: op.role,
      context: op.buildContext(event, item),
    },
    op.actorId,
    'SERVER',
    'OFFLINE_SYNC_PUSH',
    requestId || 'REQ-SYNC',
  );

  if (!transitionResult.success) {
    const code = transitionResult.error?.code;
    if (code === 'VERSION_CONFLICT') {
      return syncResult(event, 'NeedsReview', {
        error: 'Version mismatch (Concurrency Conflict)',
        errorCode: 'VERSION_CONFLICT',
        currentStatus: item.status,
        serverVersion: item.version,
      });
    }
    return syncResult(event, 'Rejected', {
      error: transitionResult.error?.message || 'Transition blocked',
      errorCode: code || 'TRANSITION_BLOCKED',
      currentStatus: item.status,
      serverVersion: item.version,
    });
  }

  await op.onSuccess?.(event, item);

  return syncResult(event, 'Accepted', {
    currentStatus: op.targetStatus,
    serverVersion: (item.version || event.baseVersion || 1) + 1,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['Admin', 'Manager', 'Dispatcher', 'Courier', 'Nurse', 'HospitalOperator'],
      action: 'SYNC_PUSH_EVENTS',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { events } = body;
    if (!events || !Array.isArray(events)) {
      return apiErrorResponse({
        request,
        code: 'SYNC_INVALID_PAYLOAD',
        message: 'events must be an array',
        status: 400,
      });
    }

    const results: SyncOutcome[] = [];
    const requestId = request.headers.get('X-Request-ID') || request.headers.get('x-request-id');
    const storedOfflineEvents = await db.offlineEvents.getAll().catch(() => []);

    for (const event of events) {
      // Idempotency: events without a key cannot be deduplicated and are rejected
      // without a receipt (nothing to correlate a retry against).
      const key = offlineEventKey(event);
      if (!key) {
        results.push(syncResult(event, 'Rejected', {
          error: 'Missing idempotency key',
          errorCode: 'MISSING_IDEMPOTENCY_KEY',
        }));
        continue;
      }

      // Replay: return the previously stored receipt verbatim.
      const prior = findPriorOfflineSyncResult(storedOfflineEvents, event);
      if (prior) {
        results.push(prior);
        continue;
      }

      let result: SyncOutcome;
      try {
        result = await processOfflineEvent(event, requestId);
      } catch (err: any) {
        console.error('Offline event sync processing error:', err);
        result = syncResult(event, 'Rejected', {
          error: err.message || 'Internal logic error',
          errorCode: 'SYNC_PROCESSING_ERROR',
        });
        await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId)).catch(() => undefined);
        results.push(result);
        continue;
      }

      await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync Push Error:', error);
    return internalErrorResponse(request, error, 'SYNC_PUSH_FAILED');
  }
}
