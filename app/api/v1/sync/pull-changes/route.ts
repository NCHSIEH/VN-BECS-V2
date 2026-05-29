import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'Dispatcher', 'Courier', 'Nurse', 'HospitalOperator'],
      action: 'SYNC_PULL_CHANGES',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    
    // Fetch all inventory (simulate fetching updated bags since token)
    const allInventory = await db.inventory.getAll();
    
    // If 'since' is provided, we should ideally filter by updated_at > since.
    // For this simulation, just return all if since is empty, else empty array if since is very recent.
    // We'll use a simplistic checkpoint based on ISO string.
    
    let updatedBags = allInventory;
    if (since) {
       updatedBags = allInventory.filter((bag: any) => {
          return bag.updatedAt && new Date(bag.updatedAt) > new Date(since);
       });
    }

    const bags = updatedBags.map((bag: any) => ({
      uid: bag.unitId,
      din: bag.unitId,
      product_code: bag.productCode,
      component_type: bag.type || 'RBC',
      abo: bag.abo,
      rhd: bag.rhd,
      expiry_at: bag.expiryDate,
      current_status: bag.status,
      current_location_id: bag.location,
      version: bag.version || 1,
      updated_at: bag.updatedAt || new Date().toISOString()
    }));

    return NextResponse.json({
      bags,
      checkpoint: new Date().toISOString(),
      hasMore: false
    });
  } catch (error) {
    return internalErrorResponse(request, error, 'SYNC_PULL_FAILED');
  }
}
