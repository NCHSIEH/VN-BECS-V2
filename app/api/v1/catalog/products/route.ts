import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'Dispatcher', 'WarehouseIssuer', 'LIMS_Simulator'],
      action: 'PRODUCT_CATALOG_LIST',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }

    const data = await db.product_catalog.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'PRODUCT_CATALOG_LIST_FAILED');
  }
}
