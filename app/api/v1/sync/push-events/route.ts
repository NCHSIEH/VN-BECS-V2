import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { inventory } from '@/src/server/repositories/inventoryRepo';
import {
  evaluateBloodUnitTransition,
  executeBloodUnitTransition,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import {
  BloodUnitStateMachine,
  normalizeBloodUnitStatus,
} from '@/src/lib/stateMachine';
import {
  buildOfflineEventReceipt,
  findPriorOfflineSyncResult,
  offlineEventKey,
  syncResult,
} from '@/src/server/services/offlineSync';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

async function syncComponentStatusIfPresent(unitId: string, status: string) {
  try {
    if (db.components && typeof db.components.updateStatus === 'function') {
      await db.components.updateStatus(unitId, status);
    }
  } catch (error) {
    console.warn(`Offline sync inventory status was updated but component ${unitId} could not be synced to ${status}:`, error);
  }
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

    const results = [];
    const requestId = request.headers.get('X-Request-ID') || request.headers.get('x-request-id');
    const storedOfflineEvents = await db.offlineEvents.getAll().catch(() => []);

    for (const event of events) {
      try {
        const key = offlineEventKey(event);
        if (!key) {
          results.push(syncResult(event, 'Rejected', {
            error: 'Missing idempotency key',
            errorCode: 'MISSING_IDEMPOTENCY_KEY',
          }));
          continue;
        }

        const prior = findPriorOfflineSyncResult(storedOfflineEvents, event);
        if (prior) {
          results.push(prior);
          continue;
        }

        let result;

        if (event.operationType === 'IssueBag') {
           // Simulate processing offline issue
           const payload = event.payload;
           const unitId = event.bagUid || event.din;
           const patientRef = event.patientRef || payload?.patientRef;

           if (!patientRef) {
              result = syncResult(event, 'Rejected', {
                error: 'Missing patient reference for offline issue event',
                errorCode: 'PATIENT_REF_REQUIRED',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           if (payload?.isBreakGlass !== true && payload?.emergencyOverride !== true) {
              result = syncResult(event, 'NeedsReview', {
                error: 'Offline issue requires documented break-glass authorization',
                errorCode: 'BREAK_GLASS_REQUIRED',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }
           
           // Fetch component
           const allInventory = await db.inventory.getAll();
           const item = allInventory.find((u: any) => u.unitId === unitId);
           
           if (!item) {
              result = syncResult(event, 'Rejected', {
                error: 'Bag not found in central DB',
                errorCode: 'BAG_NOT_FOUND',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           const normalizedStatus = normalizeBloodUnitStatus(item.status);
           if (normalizedStatus && BloodUnitStateMachine.isTerminal(normalizedStatus)) {
              result = syncResult(event, 'NeedsReview', {
                error: `Offline event cannot overwrite terminal blood unit state ${normalizedStatus}`,
                errorCode: 'TERMINAL_STATE_CONFLICT',
                currentStatus: item.status,
                serverVersion: item.version,
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }
           
           // Centralized transition via command
           const transitionResult = await executeBloodUnitTransition(
             {
               unitId,
               currentStatus: item.status,
               targetStatus: 'ISSUED',
               role: 'Nurse',
               context: {
                 isBreakGlass: payload?.isBreakGlass === true || payload?.emergencyOverride === true,
                 isExpired: isBloodUnitExpired(item.expiryDate),
                 baseVersion: event.baseVersion || item.version,
               },
             },
             'System',
             'SERVER',
             'OFFLINE_SYNC_PUSH',
             requestId || 'REQ-SYNC'
           );

           if (!transitionResult.success) {
             const code = transitionResult.error?.code;
             if (code === 'VERSION_CONFLICT') {
               result = syncResult(event, 'NeedsReview', {
                 error: 'Version mismatch (Concurrency Conflict)',
                 errorCode: 'VERSION_CONFLICT',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             } else {
               result = syncResult(event, 'Rejected', {
                 error: transitionResult.error?.message || 'Transition blocked',
                 errorCode: code || 'TRANSITION_BLOCKED',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             }
             await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
             results.push(result);
             continue;
           }

           result = syncResult(event, 'Accepted', {
              currentStatus: 'ISSUED',
              serverVersion: (item.version || event.baseVersion || 1) + 1,
           });
           await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
           results.push(result);
        } else if (event.operationType === 'TransfuseBag') {
           const payload = event.payload;
           const unitId = event.bagUid || event.din;
           const patientRef = event.patientRef || payload?.patientRef || payload?.patientId;

           if (!patientRef) {
              result = syncResult(event, 'Rejected', {
                error: 'Missing patient reference for offline transfusion event',
                errorCode: 'PATIENT_REF_REQUIRED',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           if (payload?.consentVerified !== true || payload?.preVitalsChecked !== true) {
              result = syncResult(event, 'Rejected', {
                error: 'Clinical prerequisites (consent, vitals) missing',
                errorCode: 'BEDSIDE_CLINICAL_PREREQUISITES_MISSING',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           if (!payload?.verifier1 || !payload?.verifier2Pin) {
              result = syncResult(event, 'Rejected', {
                error: 'Dual bedside verification required',
                errorCode: 'DUAL_VERIFICATION_REQUIRED',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           // Fetch component
           const allInventory = await db.inventory.getAll();
           const item = allInventory.find((u: any) => u.unitId === unitId);
           
           if (!item) {
              result = syncResult(event, 'Rejected', {
                error: 'Bag not found in central DB',
                errorCode: 'BAG_NOT_FOUND',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           const normalizedStatus = normalizeBloodUnitStatus(item.status);
           if (normalizedStatus && BloodUnitStateMachine.isTerminal(normalizedStatus)) {
              result = syncResult(event, 'NeedsReview', {
                error: `Offline event cannot overwrite terminal blood unit state ${normalizedStatus}`,
                errorCode: 'TERMINAL_STATE_CONFLICT',
                currentStatus: item.status,
                serverVersion: item.version,
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           // Centralized transition via command
           const transitionResult = await executeBloodUnitTransition(
             {
               unitId,
               currentStatus: item.status,
               targetStatus: 'TRANSFUSED',
               role: 'Nurse',
               context: {
                 dualVerificationPassed: true,
                 isExpired: isBloodUnitExpired(item.expiryDate),
                 isUnderLookback: item.status === 'QUARANTINE' || item.status === 'QUARANTINED' || item.status === 'HOLD_LOOKBACK',
                 baseVersion: event.baseVersion || item.version,
               },
             },
             'Nurse',
             'SERVER',
             'OFFLINE_SYNC_PUSH',
             requestId || 'REQ-SYNC'
           );

           if (!transitionResult.success) {
             const code = transitionResult.error?.code;
             if (code === 'VERSION_CONFLICT') {
               result = syncResult(event, 'NeedsReview', {
                 error: 'Version mismatch (Concurrency Conflict)',
                 errorCode: 'VERSION_CONFLICT',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             } else {
               result = syncResult(event, 'Rejected', {
                 error: transitionResult.error?.message || 'Transition blocked',
                 errorCode: code || 'TRANSITION_BLOCKED',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             }
             await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
             results.push(result);
             continue;
           }

           // Create transfusion record
           await db.transfusions.create({
              componentId: unitId,
              patientId: patientRef,
              verifier1: payload.verifier1,
              verifier2Pin: payload.verifier2Pin,
              consentVerified: true,
              preVitalsChecked: true,
              status: 'COMPLETED',
              startedAt: event.clientTimestamp || new Date().toISOString(),
              completedAt: new Date().toISOString(),
           });

           result = syncResult(event, 'Accepted', {
              currentStatus: 'TRANSFUSED',
              serverVersion: (item.version || event.baseVersion || 1) + 1,
           });
           await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
           results.push(result);
        } else if (event.operationType === 'WasteBag') {
           const payload = event.payload;
           const unitId = event.bagUid || event.din;
           const reasonCode = payload?.reasonCode || payload?.reason;

           if (!reasonCode) {
              result = syncResult(event, 'Rejected', {
                error: 'Missing reason code for offline waste event',
                errorCode: 'MISSING_REASON_CODE',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           // Fetch component
           const allInventory = await db.inventory.getAll();
           const item = allInventory.find((u: any) => u.unitId === unitId);
           
           if (!item) {
              result = syncResult(event, 'Rejected', {
                error: 'Bag not found in central DB',
                errorCode: 'BAG_NOT_FOUND',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           const normalizedStatus = normalizeBloodUnitStatus(item.status);
           if (normalizedStatus && BloodUnitStateMachine.isTerminal(normalizedStatus)) {
              result = syncResult(event, 'NeedsReview', {
                error: `Offline event cannot overwrite terminal blood unit state ${normalizedStatus}`,
                errorCode: 'TERMINAL_STATE_CONFLICT',
                currentStatus: item.status,
                serverVersion: item.version,
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           // Evaluate transition
           const transitionResult = await executeBloodUnitTransition(
              {
                unitId,
                currentStatus: item.status,
                targetStatus: 'WASTED',
                role: 'HospitalOperator',
                context: {
                  baseVersion: event.baseVersion || item.version,
                },
              },
              'System',
              'SERVER',
              'OFFLINE_SYNC_PUSH',
              requestId || 'REQ-SYNC'
            );

            if (!transitionResult.success) {
              const code = transitionResult.error?.code;
              if (code === 'VERSION_CONFLICT') {
                result = syncResult(event, 'NeedsReview', {
                  error: 'Version mismatch (Concurrency Conflict)',
                  errorCode: 'VERSION_CONFLICT',
                  currentStatus: item.status,
                  serverVersion: item.version,
                });
              } else {
                result = syncResult(event, 'Rejected', {
                  error: transitionResult.error?.message || 'Transition blocked',
                  errorCode: code || 'TRANSITION_BLOCKED',
                  currentStatus: item.status,
                  serverVersion: item.version,
                });
              }
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
            }

            result = syncResult(event, 'Accepted', {
               currentStatus: 'WASTED',
               serverVersion: (item.version || event.baseVersion || 1) + 1,
            });
            await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
            results.push(result);
        } else if (event.operationType === 'ReceiveBag') {
           const unitId = event.bagUid || event.din;

           // Fetch component
           const allInventory = await db.inventory.getAll();
           const item = allInventory.find((u: any) => u.unitId === unitId);
           
           if (!item) {
              result = syncResult(event, 'Rejected', {
                error: 'Bag not found in central DB',
                errorCode: 'BAG_NOT_FOUND',
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           const normalizedStatus = normalizeBloodUnitStatus(item.status);
           if (normalizedStatus && BloodUnitStateMachine.isTerminal(normalizedStatus)) {
              result = syncResult(event, 'NeedsReview', {
                error: `Offline event cannot overwrite terminal blood unit state ${normalizedStatus}`,
                errorCode: 'TERMINAL_STATE_CONFLICT',
                currentStatus: item.status,
                serverVersion: item.version,
              });
              await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
              results.push(result);
              continue;
           }

           // Centralized transition via command
           const transitionResult = await executeBloodUnitTransition(
             {
               unitId,
               currentStatus: item.status,
               targetStatus: 'RECEIVED',
               role: 'HospitalOperator',
               context: {
                 baseVersion: event.baseVersion || item.version,
               },
             },
             'System',
             'SERVER',
             'OFFLINE_SYNC_PUSH',
             requestId || 'REQ-SYNC'
           );

           if (!transitionResult.success) {
             const code = transitionResult.error?.code;
             if (code === 'VERSION_CONFLICT') {
               result = syncResult(event, 'NeedsReview', {
                 error: 'Version mismatch (Concurrency Conflict)',
                 errorCode: 'VERSION_CONFLICT',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             } else {
               result = syncResult(event, 'Rejected', {
                 error: transitionResult.error?.message || 'Transition blocked',
                 errorCode: code || 'TRANSITION_BLOCKED',
                 currentStatus: item.status,
                 serverVersion: item.version,
               });
             }
             await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
             results.push(result);
             continue;
           }

           result = syncResult(event, 'Accepted', {
              currentStatus: 'RECEIVED',
              serverVersion: (item.version || event.baseVersion || 1) + 1,
           });
           await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
           results.push(result);
        } else {
           result = syncResult(event, 'Rejected', {
              error: 'Unknown operationType',
              errorCode: 'UNKNOWN_OPERATION_TYPE',
           });
           await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId));
           results.push(result);
        }
      } catch (err: any) {
         console.error('Offline event sync processing error:', err);
         const result = syncResult(event, 'Rejected', {
            error: err.message || 'Internal logic error',
            errorCode: 'SYNC_PROCESSING_ERROR',
         });
         await db.offlineEvents.create(buildOfflineEventReceipt(event, result, requestId)).catch(() => undefined);
         results.push(result);
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync Push Error:', error);
    return internalErrorResponse(request, error, 'SYNC_PUSH_FAILED');
  }
}
