import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const reports = await db.reconciliation_reports.getAll();
    return NextResponse.json(reports);
  } catch (error: any) {
    return internalErrorResponse(request, error, 'RECONCILIATION_LIST_FAILED');
  }
}
