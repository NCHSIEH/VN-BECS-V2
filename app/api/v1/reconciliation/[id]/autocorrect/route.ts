import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { apiErrorResponse, internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reports = await db.reconciliation_reports.getAll();
    const report = reports.find((item: any) => item.id === id);

    if (!report) {
      return apiErrorResponse({
        request,
        code: 'RECONCILIATION_NOT_FOUND',
        message: `Reconciliation report ${id} was not found`,
        status: 404,
      });
    }

    const conflicts: string[] = typeof report.conflicts === 'string' 
      ? JSON.parse(report.conflicts) 
      : (report.conflicts || []);

    const inventoryItems = await db.inventory.getAll();
    const componentItems = await db.components.getAll();
    const correctedUnits: string[] = [];

    for (const conflict of conflicts) {
      const colonIdx = conflict.indexOf(':');
      if (colonIdx === -1) continue;

      const unitId = conflict.substring(0, colonIdx).trim();
      const message = conflict.substring(colonIdx + 1).trim();

      const invItem = inventoryItems.find((u: any) => u.unitId === unitId || u.id === unitId);
      if (!invItem) continue;

      let updatedFields: any = {};
      let syncComponentStatus: string | null = null;

      if (message.includes('expired while')) {
        updatedFields.status = 'DISCARDED';
        syncComponentStatus = 'DISCARDED';
      } else if (message.includes('unknown status')) {
        // If expired, discard it. Otherwise reset to AVAILABLE.
        const isExpired = invItem.expiryDate && new Date(invItem.expiryDate) < new Date();
        updatedFields.status = isExpired ? 'DISCARDED' : 'AVAILABLE';
        syncComponentStatus = updatedFields.status;
      } else if (message.includes('missing optimistic-lock version')) {
        updatedFields.version = 1;
      } else if (message.includes('missing facility/location')) {
        updatedFields.location = 'TEMP-FRIDGE-01';
        updatedFields.hospitalId = report.hospitalId || 'HOSP-DEFAULT';
      }

      if (Object.keys(updatedFields).length > 0) {
        // Fetch current version to execute safe lock or just create/upsert
        const updatedRecord = {
          ...invItem,
          ...updatedFields,
          version: updatedFields.version !== undefined ? updatedFields.version : (invItem.version || 1)
        };

        // Write correction to inventory repo
        await db.inventory.create(updatedRecord);

        // Sync to legacy components table if applicable
        const matchingComponent = componentItems.find((c: any) => c.id === unitId || c.componentId === unitId);
        if (matchingComponent) {
          const compUpdates: any = {};
          if (syncComponentStatus) {
            compUpdates.status = syncComponentStatus;
          }
          if (updatedFields.version !== undefined) {
            compUpdates.version = updatedFields.version;
          }
          if (Object.keys(compUpdates).length > 0) {
            await db.components.update(matchingComponent.id, compUpdates);
          }
        }

        correctedUnits.push(unitId);
      }
    }

    const resolvedBy = body.resolvedBy || body.actorId || 'System Auto-Correction';
    // Clear conflicts and resolve report
    await db.reconciliation_reports.clearConflicts(id, resolvedBy);

    // Audit logs
    await db.auditEvents.create({
      actorRole: body.actorRole || 'Manager',
      eventType: 'DAILY_RECONCILIATION_RESOLVED',
      objectId: id,
      details: `Daily reconciliation auto-corrected and resolved by ${resolvedBy}. Corrected units: [${correctedUnits.join(', ')}].`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      id, 
      resolvedBy, 
      correctedCount: correctedUnits.length,
      correctedUnits 
    });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'RECONCILIATION_AUTOCORRECT_FAILED');
  }
}
