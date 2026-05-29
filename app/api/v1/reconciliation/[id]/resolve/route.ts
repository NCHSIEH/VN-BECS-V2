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

    const resolvedBy = body.resolvedBy || body.actorId || 'System';
    await db.reconciliation_reports.resolve(id, resolvedBy);
    await db.auditEvents.create({
      actorRole: body.actorRole || 'Manager',
      eventType: 'DAILY_RECONCILIATION_RESOLVED',
      objectId: id,
      details: `Daily reconciliation resolved by ${resolvedBy}.`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id, resolvedBy });
  } catch (error: any) {
    return internalErrorResponse(request, error, 'RECONCILIATION_RESOLVE_FAILED');
  }
}
