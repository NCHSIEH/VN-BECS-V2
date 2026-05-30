import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'Dispatcher', 'WarehouseIssuer', 'HospitalOperator', 'Nurse', 'Courier', 'MedicalReviewer'], action: 'ORDER_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const orders = await db.orders.getAll();
    return NextResponse.json(orders);
  } catch (error) {
    return internalErrorResponse(request, error, 'ORDER_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'HospitalOperator', 'Nurse'], action: 'ORDER_CREATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const data = await request.json();
    const id = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
    const order = {
      ...data,
      id,
      status: data.priority === 'STAT' ? 'REVIEW_PENDING' : 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    await db.orders.create(order);
    
    // Auto escalate STAT orders
    if (data.priority === 'STAT') {
       await db.auditEvents.create({
          actorRole: 'System',
          eventType: 'ORDER_STAT_ESCALATED',
          objectId: id,
          details: `STAT Order auto-escalated to Medical Reviewer immediately upon submission.`,
          timestamp: new Date().toISOString()
       });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return internalErrorResponse(request, error, 'ORDER_CREATE_FAILED');
  }
}
