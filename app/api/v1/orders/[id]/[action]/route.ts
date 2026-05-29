import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  bloodUnitCommandErrorBody,
  evaluateBloodUnitTransition,
  executeBloodUnitTransition,
  isBloodUnitExpired,
  type BlockedBloodUnitTransition,
} from '@/src/server/services/bloodUnitCommands';
import type { BloodUnitStatus, Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, authorizeFacilityScope, facilityIdOf, facilityScopeErrorBody, rbacErrorBody } from '@/src/server/rbacPolicy';

type InventoryItem = {
  unitId: string;
  status: string;
  expiryDate?: string;
  location?: string;
  abo?: string;
  rhd?: string;
  [key: string]: any;
};

function getRequestedQty(item: any): number {
  return Number(item.qty ?? item.quantity ?? item.approvedQty ?? 0);
}

function hasMatchingBloodGroup(item: any, unit: InventoryItem): boolean {
  if (!item.abo || !item.rhd) return true;
  return item.abo === unit.abo && item.rhd === unit.rhd;
}

function sortFefo(a: InventoryItem, b: InventoryItem): number {
  return Date.parse(a.expiryDate ?? '') - Date.parse(b.expiryDate ?? '');
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string' || value.trim() === '') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    // Fall through to comma-separated legacy format.
  }

  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function blockedTransitionResponse(decision: BlockedBloodUnitTransition, request?: Request) {
  return NextResponse.json(
    {
      success: false,
      ...bloodUnitCommandErrorBody(decision.error),
      requestId: getRequestId(request),
    },
    { status: decision.httpStatus },
  );
}

function hardStopResponse(code: string, message: string, status = 400, request?: Request) {
  return apiErrorResponse({
    request,
    code,
    message,
    status,
    details: {
      severity: 'HardStop',
      actionRequired: 'Stop this workflow and resolve the clinical or inventory discrepancy before retrying.',
    },
  });
}

async function persistBloodUnitInventoryState(
  unit: InventoryItem,
  status: BloodUnitStatus,
  role: Role,
  request: Request,
  overrides: Partial<InventoryItem> = {},
  context?: any
): Promise<InventoryItem> {
  const result = await executeBloodUnitTransition(
    {
      unitId: unit.unitId,
      currentStatus: unit.status,
      targetStatus: status,
      role,
      context: {
        ...context,
        baseVersion: unit.version,
      },
    },
    'SYSTEM',
    'SERVER',
    'ORDER_ACTION_TRANSITION',
    getRequestId(request),
    overrides
  );

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to execute blood unit transition');
  }

  return { ...unit, ...overrides, status, version: (unit.version || 1) + 1 };
}

async function applyBloodUnitTransition(args: {
  unit: InventoryItem;
  targetStatus: BloodUnitStatus;
  role: Role;
  request: Request;
  context?: Parameters<typeof evaluateBloodUnitTransition>[0]['context'];
  overrides?: Partial<InventoryItem>;
}) {
  const transition = evaluateBloodUnitTransition({
    unitId: args.unit.unitId,
    currentStatus: args.unit.status,
    targetStatus: args.targetStatus,
    role: args.role,
    context: args.context,
  });

  if (transition.allowed === false) {
    return {
      allowed: false as const,
      response: blockedTransitionResponse(transition, args.request),
    };
  }

  const updatedUnit = await persistBloodUnitInventoryState(args.unit, args.targetStatus, args.role, args.request, args.overrides, args.context);
  return {
    allowed: true as const,
    transition,
    updatedUnit,
  };
}

async function applyBatchBloodUnitTransitions(args: {
  units: InventoryItem[];
  targetStatus: BloodUnitStatus;
  role: Role;
  request: Request;
  contextForUnit?: (unit: InventoryItem) => Parameters<typeof evaluateBloodUnitTransition>[0]['context'];
  overridesForUnit?: (unit: InventoryItem) => Partial<InventoryItem>;
}) {
  for (const unit of args.units) {
    const transition = evaluateBloodUnitTransition({
      unitId: unit.unitId,
      currentStatus: unit.status,
      targetStatus: args.targetStatus,
      role: args.role,
      context: args.contextForUnit?.(unit),
    });

    if (transition.allowed === false) {
      return {
        allowed: false as const,
        response: blockedTransitionResponse(transition, args.request),
      };
    }
  }

  const updatedUnits: InventoryItem[] = [];
  for (const unit of args.units) {
    updatedUnits.push(await persistBloodUnitInventoryState(
      unit,
      args.targetStatus,
      args.role,
      args.request,
      args.overridesForUnit?.(unit) ?? {},
      args.contextForUnit?.(unit)
    ));
  }

  return {
    allowed: true as const,
    updatedUnits,
  };
}

type PlannedBloodUnitTransition = {
  unit: InventoryItem;
  targetStatus: BloodUnitStatus;
  context?: Parameters<typeof evaluateBloodUnitTransition>[0]['context'];
  overrides?: Partial<InventoryItem>;
};

async function applyPlannedBloodUnitTransitions(args: {
  plans: PlannedBloodUnitTransition[];
  role: Role;
  request: Request;
}) {
  for (const plan of args.plans) {
    const transition = evaluateBloodUnitTransition({
      unitId: plan.unit.unitId,
      currentStatus: plan.unit.status,
      targetStatus: plan.targetStatus,
      role: args.role,
      context: plan.context,
    });

    if (transition.allowed === false) {
      return {
        allowed: false as const,
        response: blockedTransitionResponse(transition, args.request),
      };
    }
  }

  const updatedUnits: InventoryItem[] = [];
  for (const plan of args.plans) {
    updatedUnits.push(await persistBloodUnitInventoryState(
      plan.unit,
      plan.targetStatus,
      args.role,
      args.request,
      plan.overrides ?? {},
      plan.context
    ));
  }

  return {
    allowed: true as const,
    updatedUnits,
  };
}

function getInventoryUnitsByIds(unitIds: string[], allInventory: InventoryItem[]): InventoryItem[] {
  return unitIds
    .map((unitId) => allInventory.find((unit) => unit.unitId === unitId))
    .filter(Boolean) as InventoryItem[];
}

function allowedRolesForOrderAction(action: string): Role[] {
  switch (action) {
    case 'approve':
    case 'revert':
    case 'escalate':
      return ['Dispatcher'];
    case 'medical-approve':
      return ['MedicalReviewer'];
    case 'dispatch':
      return ['WarehouseIssuer', 'HospitalOperator'];
    case 'transit':
    case 'telemetry':
      return ['Courier'];
    case 'deliver':
      return ['HospitalOperator'];
    case 'waste':
      return ['Courier', 'HospitalOperator'];
    default:
      return [];
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const ordersList = await db.orders.getAll();
    const order = ordersList.find((o: any) => o.id === id);

    if (!order) {
      return apiErrorResponse({
        request,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        status: 404,
      });
    }

    const updateOrderState = async (updateData: any) => {
      const version = order.version || 1;
      if (typeof db.orders.updateWithLock === 'function') {
        await db.orders.updateWithLock(id, version, updateData);
      } else {
        await db.orders.update(id, updateData);
      }
    };

    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // Body might be empty, ignore
    }

    const clientVersion = requestBody.baseVersion ?? requestBody.version;
    if (clientVersion !== undefined && order.version !== undefined && Number(clientVersion) !== Number(order.version)) {
      return apiErrorResponse({
        request,
        code: 'VERSION_CONFLICT',
        message: `Concurrency Conflict: Order has been modified by another process (client version: ${clientVersion}, server version: ${order.version}).`,
        status: 409,
      });
    }

    const allowedRoles = allowedRolesForOrderAction(action);
    if (allowedRoles.length > 0) {
      const authz = authorizeApiRole({
        request,
        body: requestBody,
        allowedRoles,
        action: `ORDER_${action.toUpperCase().replace(/-/g, '_')}`,
      });
      if (!authz.allowed) {
        return NextResponse.json(rbacErrorBody(authz), { status: 403 });
      }

      // ABAC: order actions are confined to the order's owning hospital/facility
      // (defence-in-depth; DB RLS is the second layer once facility_id exists).
      const scope = authorizeFacilityScope({ decision: authz, resourceOrgId: facilityIdOf(order) });
      if (!scope.allowed) {
        return NextResponse.json(facilityScopeErrorBody(authz, facilityIdOf(order)), { status: 403 });
      }
    }

    let updatedOrder = { ...order };

    if (action === 'approve') {
      const actorRole = (requestBody.actorRole || 'Dispatcher') as Role;
      updatedOrder.status = 'APPROVED';

      const allInventory = await db.inventory.getAll();
      const allocatedUnits: string[] = [];
      const plannedUnits: InventoryItem[] = [];
      const usedUnitIds = new Set<string>();

      for (const item of order.items || []) {
        const requestedQty = getRequestedQty(item);
        if (requestedQty <= 0) continue;

        const candidates = allInventory
          .filter((u: InventoryItem) => !usedUnitIds.has(u.unitId) && hasMatchingBloodGroup(item, u))
          .sort(sortFefo);

        const selected: InventoryItem[] = [];
        for (const unit of candidates) {
          const transition = evaluateBloodUnitTransition({
            unitId: unit.unitId,
            currentStatus: unit.status,
            targetStatus: 'RESERVED',
            role: actorRole,
            context: {
              orderApproved: true,
              isExpired: isBloodUnitExpired(unit.expiryDate),
            },
          });

          if (transition.allowed) {
            selected.push(unit);
            if (selected.length === requestedQty) break;
          }
        }

        if (selected.length < requestedQty) {
          return hardStopResponse(
            'INSUFFICIENT_RELEASABLE_STOCK',
            `Not enough releasable stock for ${item.abo ?? 'any'} ${item.rhd ?? ''}. Required ${requestedQty}, selected ${selected.length}.`,
            409,
            request,
          );
        }

        for (const unit of selected) {
          usedUnitIds.add(unit.unitId);
          allocatedUnits.push(unit.unitId);
          plannedUnits.push(unit);
        }
      }

      if (allocatedUnits.length === 0) {
        return hardStopResponse('ORDER_HAS_NO_ALLOCATABLE_ITEMS', 'Order has no positive-quantity line items to allocate.', 400, request);
      }

      const reserved = await applyBatchBloodUnitTransitions({
        units: plannedUnits,
        targetStatus: 'RESERVED',
        role: actorRole,
        request,
        contextForUnit: (unit) => ({
            orderApproved: true,
            isExpired: isBloodUnitExpired(unit.expiryDate),
        }),
      });
      if (reserved.allowed === false) return reserved.response;

      updatedOrder.allocatedUnits = allocatedUnits;
      updatedOrder.verifiedUnits = [];
      await updateOrderState({ status: 'APPROVED', allocatedUnits, verifiedUnits: [] });

      await db.auditEvents.create({
        eventType: 'Order Approval',
        objectId: id,
        actorRole,
        details: `Order approved and allocated with FEFO units: ${allocatedUnits.join(', ')}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'revert') {
      const actorRole = (requestBody.actorRole || 'Dispatcher') as Role;
      const allocated = asStringList(order.allocatedUnits);
      const allInventory = await db.inventory.getAll();
      const releaseUnits = getInventoryUnitsByIds(allocated, allInventory);
      const released = await applyBatchBloodUnitTransitions({
        units: releaseUnits,
        targetStatus: 'AVAILABLE',
        role: actorRole,
        request,
        contextForUnit: (unit) => ({
          isExpired: isBloodUnitExpired(unit.expiryDate),
        }),
      });
      if (released.allowed === false) return released.response;

      updatedOrder.status = 'SUBMITTED';
      updatedOrder.allocatedUnits = [];
      updatedOrder.verifiedUnits = [];
      await updateOrderState({ status: 'SUBMITTED', allocatedUnits: [], verifiedUnits: [] });

      await db.auditEvents.create({
        eventType: 'Order Reverted',
        objectId: id,
        actorRole,
        details: `Order reverted to SUBMITTED state. Released units: ${releaseUnits.map((unit) => unit.unitId).join(', ') || 'none'}.`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'escalate') {
      const reason = requestBody.reason || 'STAT Override';
      updatedOrder.status = 'REVIEW_PENDING';
      updatedOrder.escalationReason = reason;
      await updateOrderState({ status: 'REVIEW_PENDING', escalationReason: reason });

      await db.auditEvents.create({
        eventType: 'Order Escalated',
        objectId: id,
        actorRole: 'Dispatcher',
        details: `Order escalated to Medical Reviewer. Reason: ${reason}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'medical-approve') {
      updatedOrder.status = 'APPROVED';
      await updateOrderState({ status: 'APPROVED' });

      await db.auditEvents.create({
        eventType: 'Medical Approval',
        objectId: id,
        actorRole: 'MedicalReviewer',
        details: `Order medically reviewed and approved.`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'dispatch') {
      const actorRole = (requestBody.actorRole || 'WarehouseIssuer') as Role;
      const { scannedCode } = requestBody;
      if (!scannedCode) {
        return apiErrorResponse({ request, code: 'BARCODE_SCAN_MISSING', message: 'Missing raw barcode scan', status: 400 });
      }

      // 1. Retrieve the scanned unit from global inventory
      const allInventory = await db.inventory.getAll();
      const unit = allInventory.find((u: any) => u.unitId === scannedCode);

      if (!unit) {
        return apiErrorResponse({ request, code: 'SCANNED_UNIT_NOT_FOUND', message: `Scanned unit not found in system inventory (ISBT-128: ${scannedCode})`, status: 404 });
      }

      // 2. Verify unit location is 'Central HUB'
      if (unit.location !== 'Central HUB') {
        return apiErrorResponse({ request, code: 'UNIT_LOCATION_INVALID', message: `Location Error: Unit ${scannedCode} is located at "${unit.location}", not at Central HUB.`, status: 400 });
      }

      // 3. Verify unit safety status & expiration
      if (unit.status === 'QUARANTINE' || unit.status === 'EXPIRED') {
        return apiErrorResponse({ request, code: 'UNIT_NOT_RELEASABLE', message: `Safety Block: Unit ${scannedCode} is Quarantined or Expired!`, status: 400 });
      }

      const isExpired = new Date(unit.expiryDate) < new Date();
      if (isExpired) {
        return apiErrorResponse({ request, code: 'UNIT_EXPIRED', message: `Safety Block: Unit ${scannedCode} has EXPIRED! (Expiry: ${new Date(unit.expiryDate).toLocaleDateString()})`, status: 400 });
      }

      // 4. Verify blood group matching
      // Calculate total required quantity across all items
      let totalQty = 0;
      let matchesAnyItem = false;
      let requestedBloodTypes: string[] = [];

      for (const item of order.items || []) {
        totalQty += getRequestedQty(item);
        requestedBloodTypes.push(`${item.abo} ${item.rhd === 'Positive' ? '+' : '-'}`);
        if (item.abo === unit.abo && item.rhd === unit.rhd) {
          matchesAnyItem = true;
        }
      }

      if (!matchesAnyItem) {
        return apiErrorResponse({ request, code: 'BLOOD_GROUP_MISMATCH', message: `Blood Group Mismatch: Scanned bag is ${unit.abo} ${unit.rhd === 'Positive' ? '+' : '-'}, but this order requires: ${requestedBloodTypes.join(', ')}`, status: 400 });
      }

      // 5. Manage verified list
      const verified = asStringList(order.verifiedUnits);
      const allocated = asStringList(order.allocatedUnits);
      let unitStatusForPick = unit.status;

      if (verified.includes(scannedCode)) {
        return apiErrorResponse({ request, code: 'UNIT_ALREADY_VERIFIED', message: `Safety Alert: Unit ${scannedCode} has already been verified for this order!`, status: 400 });
      }

      // Dynamic Swap if scanned unit is compatible but not in the original allocated list
      if (!allocated.includes(scannedCode)) {
        // Find an unverified allocated unit of the same ABO/Rh group to replace
        let replacedIndex = -1;
        
        for (let i = 0; i < allocated.length; i++) {
          const allocId = allocated[i];
          if (!verified.includes(allocId)) {
            const allocUnit = allInventory.find((u: any) => u.unitId === allocId);
            if (allocUnit && allocUnit.abo === unit.abo && allocUnit.rhd === unit.rhd) {
              replacedIndex = i;
              break;
            }
          }
        }

        if (replacedIndex !== -1) {
          const oldUnitId = allocated[replacedIndex];
          const oldUnit = allInventory.find((u: any) => u.unitId === oldUnitId);
          const swapPlans: PlannedBloodUnitTransition[] = [];
          if (oldUnit) {
            swapPlans.push({
              unit: oldUnit,
              targetStatus: 'AVAILABLE',
              context: {
                isExpired: isBloodUnitExpired(oldUnit.expiryDate),
              },
            });
          }
          swapPlans.push({
            unit,
            targetStatus: 'RESERVED',
            context: {
              orderApproved: true,
              isExpired: isBloodUnitExpired(unit.expiryDate),
            },
          });

          const swapped = await applyPlannedBloodUnitTransitions({
            plans: swapPlans,
            role: actorRole,
            request,
          });
          if (swapped.allowed === false) return swapped.response;

          allocated[replacedIndex] = scannedCode;
          unitStatusForPick = 'RESERVED';
        } else {
          return apiErrorResponse({ request, code: 'ORDER_UNIT_CAPACITY_EXCEEDED', message: `Capacity Exceeded: Scanned compatible unit ${scannedCode} exceeds the required quantity for this blood type.`, status: 400 });
        }
      }

      const pickTransition = evaluateBloodUnitTransition({
        unitId: scannedCode,
        currentStatus: unitStatusForPick,
        targetStatus: 'PICKED',
        role: actorRole,
        context: {
          barcodeScanMatch: true,
          isExpired: isBloodUnitExpired(unit.expiryDate),
        },
      });

      if (pickTransition.allowed === false) return blockedTransitionResponse(pickTransition, request);

      // Add to verified list
      verified.push(scannedCode);

      // 6. Transition to DISPATCHED if all units are verified
      const isComplete = verified.length === totalQty;
      const finalStatus = isComplete ? 'DISPATCHED' : 'APPROVED';

      updatedOrder.status = finalStatus;
      updatedOrder.allocatedUnits = allocated;
      updatedOrder.verifiedUnits = verified;

      await updateOrderState({ 
        status: finalStatus, 
        allocatedUnits: allocated, 
        verifiedUnits: verified 
      });

      // Update unit status to PICKED
      const picked = await applyBloodUnitTransition({
        unit: { ...unit, status: unitStatusForPick },
        targetStatus: 'PICKED',
        role: actorRole,
        request,
        context: {
          barcodeScanMatch: true,
          isExpired: isBloodUnitExpired(unit.expiryDate),
        },
      });
      if (picked.allowed === false) return picked.response;

      // Audit Event
      await db.auditEvents.create({
        eventType: 'Order Unit Verified',
        objectId: id,
        actorRole,
        details: `Unit ${scannedCode} verified. Progress: ${verified.length}/${totalQty} units verified.`,
        timestamp: new Date().toISOString()
      });

      if (isComplete) {
        await db.auditEvents.create({
          eventType: 'Order Dispatched',
          objectId: id,
          actorRole,
          details: `Order fully picked, verified (${verified.join(', ')}), and dispatched. Ready for transit.`,
          timestamp: new Date().toISOString()
        });
      }

    } else if (action === 'transit') {
      const actorRole = (requestBody.actorRole || 'Courier') as Role;
      const units = asStringList(order.allocatedUnits);
      const allInventory = await db.inventory.getAll();
      const transitUnits = getInventoryUnitsByIds(units, allInventory);

      if (transitUnits.length !== units.length) {
        return hardStopResponse('SHIPMENT_UNIT_NOT_FOUND', 'One or more allocated units are missing from inventory.', 404, request);
      }

      const transited = await applyBatchBloodUnitTransitions({
        units: transitUnits,
        targetStatus: 'IN_TRANSIT',
        role: actorRole,
        request,
      });
      if (transited.allowed === false) return transited.response;

      updatedOrder.status = 'IN_TRANSIT';
      await updateOrderState({ status: 'IN_TRANSIT' });

      await db.auditEvents.create({
        eventType: 'Transit Initiated',
        objectId: id,
        actorRole,
        details: `Shipment departed and is in transit. Cold chain telemetry active. Units: ${units.join(', ')}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'deliver') {
      const actorRole = (requestBody.actorRole || 'HospitalOperator') as Role;
      const { handoverCode } = requestBody;

      // SOP 5: Cold chain integrity validation on the backend before delivery
      const transportJob = await db.transport_jobs.getByOrderId(id);
      if (transportJob && transportJob.coldChainViolation) {
         return apiErrorResponse({ request, code: 'COLD_CHAIN_VIOLATION', message: 'SAFETY BLOCK: Cold Chain Violation detected in transit telemetry! Delivery is aborted. Shipment must be quarantined/wasted.', status: 400 });
      }

      const units = asStringList(order.allocatedUnits);
      const allInventory = await db.inventory.getAll();
      const deliveryUnits = getInventoryUnitsByIds(units, allInventory);

      if (deliveryUnits.length !== units.length) {
        return hardStopResponse('DELIVERY_UNIT_NOT_FOUND', 'One or more allocated units are missing from inventory.', 404, request);
      }

      const delivered = await applyBatchBloodUnitTransitions({
        units: deliveryUnits,
        targetStatus: 'RECEIVED',
        role: actorRole,
        request,
        overridesForUnit: () => ({
          location: order.hospital || 'HOSPITAL',
        }),
      });
      if (delivered.allowed === false) return delivered.response;

      updatedOrder.status = 'DELIVERED';
      await updateOrderState({ status: 'DELIVERED' });

      await db.auditEvents.create({
        eventType: 'Secure Handover Complete',
        objectId: id,
        actorRole,
        details: `Secure handover completed successfully. PIN verification code: ${handoverCode}. Units received: ${units.join(', ')}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'waste') {
      const actorRole = (requestBody.actorRole || 'Courier') as Role;
      const units = asStringList(order.allocatedUnits);
      const allInventory = await db.inventory.getAll();
      const wasteUnits = getInventoryUnitsByIds(units, allInventory);

      if (wasteUnits.length !== units.length) {
        return hardStopResponse('WASTE_UNIT_NOT_FOUND', 'One or more allocated units are missing from inventory.', 404, request);
      }

      const wasted = await applyBatchBloodUnitTransitions({
        units: wasteUnits,
        targetStatus: 'WASTED',
        role: actorRole,
        request,
      });
      if (wasted.allowed === false) return wasted.response;

      updatedOrder.status = 'WASTED';
      await updateOrderState({ status: 'WASTED' });

      await db.auditEvents.create({
        eventType: 'Shipment Wasted',
        objectId: id,
        actorRole,
        details: `Shipment reported wasted due to cold chain breach. Units wasted: ${units.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'telemetry') {
      const { temp, isWasted } = requestBody;
      
      await db.transport_jobs.upsertTemperature(
        id,
        'SENSOR-COURIER-01',
        [{ time: new Date().toISOString(), temp }],
        isWasted
      );
      
      return NextResponse.json({ success: true, recordedTemp: temp, violation: isWasted });
    } else {
      return apiErrorResponse({ request, code: 'ORDER_ACTION_UNSUPPORTED', message: 'Unsupported action type', status: 400 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Order Action Route Error:', error);
    return internalErrorResponse(request, error, 'ORDER_ACTION_FAILED');
  }
}
