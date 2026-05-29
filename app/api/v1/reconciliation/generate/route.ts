import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { generateDailyReconciliationReports } from '@/src/server/services/reconciliation';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function POST(request: Request) {
  try {
    const [inventory, existingReports] = await Promise.all([
      db.inventory.getAll(),
      db.reconciliation_reports.getAll(),
    ]);
    const reports = generateDailyReconciliationReports({ inventory, existingReports });

    for (const report of reports) {
      await db.reconciliation_reports.create(report);
      await db.auditEvents.create({
        actorRole: 'System',
        eventType: 'DAILY_RECONCILIATION_GENERATED',
        objectId: report.id,
        details: `Generated daily reconciliation for ${report.hospitalId}: ${report.borrowedUnits.length} active units, ${report.conflicts.length} conflicts.`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'RECONCILIATION_GENERATE_FAILED');
  }
}
