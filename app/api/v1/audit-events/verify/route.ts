import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { verifyAuditChain } from '@/src/server/auditChain';

/**
 * GET /api/v1/audit-events/verify
 *
 * Verifies the integrity of the append-only audit hash chain (RTM-AUD-02).
 * Returns a tamper report. Restricted to Admin / Auditor / QA.
 */
export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Auditor', 'QA_Officer'],
      action: 'AUDIT_CHAIN_VERIFY',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const events = await db.audit_events.getAll();
    const result = verifyAuditChain(Array.isArray(events) ? events : []);

    return NextResponse.json(result, { status: result.valid ? 200 : 409 });
  } catch (error) {
    return internalErrorResponse(request, error, 'AUDIT_CHAIN_VERIFY_FAILED');
  }
}
