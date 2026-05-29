import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import {
  evaluateBloodUnitTransition,
} from '@/src/server/services/bloodUnitCommands';
import type { BloodUnitStatus, Role } from '@/src/types';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const donationId = (await params).id;
    const body = await request.json();
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['LIMS_Simulator', 'QA_Officer', 'Admin'],
      action: 'LIMS_LAB_TEST_AUTH',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { action } = body; // action should be 'clear' or 'quarantine'

    if (action !== 'clear' && action !== 'quarantine') {
      return apiErrorResponse({
        request,
        code: 'LIMS_LAB_AUTH_ACTION_INVALID',
        message: 'Lab authorization action must be clear or quarantine.',
        status: 400,
      });
    }

    const status = action === 'clear' ? 'CLEARED' : 'QUARANTINED';
    const actorRole = (body.actorRole || body.role || 'LIMS_Simulator') as Role;
    
    await db.lab_tests.updateByDonationId(donationId, {
      idmStatus: status,
      testedAt: new Date().toISOString()
    });

    // Retrospective cascading to existing components and inventory
    let adverseReactionsService: any = null;
    try {
      adverseReactionsService = db.adverse_reactions;
    } catch {}
    
    const [components, allInventory, allReactions] = await Promise.all([
      db.components.getAll(),
      db.inventory.getAll(),
      adverseReactionsService && typeof adverseReactionsService.getAll === 'function'
        ? adverseReactionsService.getAll()
        : Promise.resolve([]),
    ]);

    const donationComponents = components.filter((c: any) => c.donationId === donationId);

    for (const comp of donationComponents) {
      const invItem = allInventory.find((item: any) => item.unitId === comp.id);
      const currentStatus = invItem ? invItem.status : comp.status;

      const isUnderLookback = (Array.isArray(allReactions) ? allReactions : []).some((r: any) => {
        return r.lookbackTriggered === 1 && (
          r.componentId === comp.id ||
          r.donationId === donationId ||
          (r.componentId && components.find((c: any) => c.id === r.componentId)?.donationId === donationId)
        );
      });

      let targetStatus: BloodUnitStatus = 'QUARANTINE';
      let context: any = {};

      if (status === 'QUARANTINED') {
        if (currentStatus === 'QUARANTINE') {
          targetStatus = 'DISCARDED';
          context = { idmStatus: 'REACTIVE' };
        } else {
          targetStatus = 'QUARANTINE';
        }
      } else if (status === 'CLEARED') {
        if (currentStatus === 'QUARANTINE') {
          targetStatus = 'AVAILABLE';
          context = { idmStatus: 'CLEARED', isUnderLookback };
        } else {
          continue;
        }
      }

      const transition = evaluateBloodUnitTransition({
        unitId: comp.id,
        currentStatus,
        targetStatus,
        role: actorRole,
        context,
      });

      if (transition.allowed === false) {
        await db.auditEvents.create({
          actorRole: 'System',
          eventType: 'HEMOVIGILANCE_QUARANTINE_REVIEW_REQUIRED',
          objectId: comp.id,
          details: `Component could not be auto-transitioned to ${targetStatus} after IDM test result on donation ${donationId}. Reason: ${transition.error.message}`,
          timestamp: new Date().toISOString()
        });
      } else {
        await db.components.updateStatus(comp.id, targetStatus);
        if (invItem) {
          await db.inventory.create({
            ...invItem,
            status: targetStatus,
          });
        }

        await db.auditEvents.create({
          actorRole: 'System',
          eventType: status === 'QUARANTINED' ? 'HEMOVIGILANCE_QUARANTINE' : 'LIMS_COMPONENT_RELEASE',
          objectId: comp.id,
          details: `Component auto-transitioned to ${targetStatus} due to retrospective IDM test results on donation ${donationId}. Transition: ${transition.fromStatus} -> ${transition.targetStatus}.`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('LIMS_LAB_TEST_AUTH_ERROR:', error);
    return internalErrorResponse(request, error, 'LIMS_LAB_TEST_AUTH_FAILED');
  }
}

