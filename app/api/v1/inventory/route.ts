import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  normalizeBloodUnitStatus,
} from '@/src/lib/stateMachine';
import {
  evaluateBloodUnitTransition,
  executeBloodUnitTransition,
  bloodUnitCommandErrorBody,
  isBloodUnitExpired,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { apiErrorResponse, getRequestId, internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const data = await db.inventory.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'INVENTORY_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.unitId) {
      return apiErrorResponse({
        request,
        code: 'INVENTORY_UNIT_ID_MISSING',
        message: 'Missing required field: unitId',
        status: 400,
      });
    }

    const allInventory = await db.inventory.getAll();
    const existing = allInventory.find((item: any) => item.unitId === data.unitId);

    const incomingStatus = data.status || (existing ? existing.status : 'AVAILABLE');
    const targetStatus = normalizeBloodUnitStatus(incomingStatus);

    if (!targetStatus) {
      return apiErrorResponse({
        request,
        code: 'INVALID_BLOOD_UNIT_STATUS',
        message: `Unknown status: '${incomingStatus}'`,
        status: 400,
      });
    }

    const role = (data.actorRole || data.role || 'HospitalOperator') as Role;

    if (existing && existing.status !== targetStatus) {
      let adverseReactionsService: any = null;
      let labTestsService: any = null;
      try {
        adverseReactionsService = db.adverse_reactions;
      } catch {}
      try {
        labTestsService = db.lab_tests;
      } catch {}

      const [allReactions, components, labTests] = await Promise.all([
        adverseReactionsService && typeof adverseReactionsService.getAll === 'function'
          ? adverseReactionsService.getAll()
          : Promise.resolve([]),
        db.components.getAll(),
        labTestsService && typeof labTestsService.getAll === 'function'
          ? labTestsService.getAll()
          : Promise.resolve([]),
      ]);

      const comp = components.find((c: any) => c.id === data.unitId);
      const donationId = comp?.donationId;
      const labTest = donationId && (Array.isArray(labTests) ? labTests : []).find((t: any) => t.donationId === donationId);
      const idmStatus = data.idmStatus || labTest?.idmStatus || 'CLEARED';

      const isUnderLookback = (Array.isArray(allReactions) ? allReactions : []).some((r: any) => {
        return r.lookbackTriggered === 1 && (
          r.componentId === data.unitId ||
          (donationId && (r.donationId === donationId || (r.componentId && components.find((c: any) => c.id === r.componentId)?.donationId === donationId)))
        );
      });

      const result = await executeBloodUnitTransition(
        {
          unitId: data.unitId,
          currentStatus: existing.status,
          targetStatus,
          role,
          context: {
            idmStatus,
            orderApproved: data.orderApproved ?? true,
            barcodeScanMatch: data.barcodeScanMatch ?? true,
            coldChainCompliant: data.coldChainCompliant ?? true,
            visualInspectionPassed: data.visualInspectionPassed ?? true,
            isExpired: isBloodUnitExpired(data.expiryDate || existing.expiryDate),
            isUnderLookback,
            baseVersion: existing.version,
          },
        },
        'SYSTEM',
        'SERVER',
        'INVENTORY_UPDATE',
        getRequestId(request),
        data
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            ...bloodUnitCommandErrorBody(result.error!),
            requestId: getRequestId(request),
          },
          { status: result.httpStatus || 400 },
        );
      }
    } else {
      // New inventory unit or same status update.
      await db.inventory.create({
        ...existing,
        ...data,
        status: targetStatus,
      });
      try {
        await db.components.updateStatus(data.unitId, targetStatus);
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('INVENTORY_CREATE_ERROR:', error);
    return internalErrorResponse(request, error, 'INVENTORY_CREATE_FAILED');
  }
}

