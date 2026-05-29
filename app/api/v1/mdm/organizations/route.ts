import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer'],
      action: 'MDM_ORGANIZATION_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const orgs = await db.organizations.getAll();
    return NextResponse.json(orgs);
  } catch (error) {
    return internalErrorResponse(request, error, 'MDM_ORGANIZATION_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authz = authorizeApiRole({
      request,
      body,
      allowedRoles: ['Admin'],
      action: 'MDM_ORGANIZATION_CREATE',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const { name, type, location, chairsCount } = body;
    const id = `ORG-${type.toUpperCase().substring(0,3)}-${Math.floor(Math.random() * 9000) + 1000}`;
    await db.organizations.create({ 
      id, 
      name, 
      type, 
      location, 
      chairsCount: type === 'BloodCenter' ? (chairsCount || 3) : undefined,
      createdAt: new Date().toISOString() 
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return internalErrorResponse(request, error, 'MDM_ORGANIZATION_CREATE_FAILED');
  }
}
