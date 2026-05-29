import { NextResponse } from 'next/server';
import { inventory, donations, adverse_reactions } from '@/src/server/db';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';
import { internalErrorResponse } from '@/src/server/apiResponses';

export async function GET(request: Request) {
  try {
    const authz = authorizeApiRole({
      request,
      allowedRoles: ['Admin', 'Manager', 'QA_Officer', 'NationalCommander', 'Dashboard'],
      action: 'STATS_READ',
    });
    if (!authz.allowed) {
      return NextResponse.json(rbacErrorBody(authz), { status: 403 });
    }
    const invData = await inventory.getAll();
    const donData = await donations.getAll();
    const advData = await adverse_reactions.getAll();

    // Aggregate stats
    const totalCollected = donData.length * 450; // ML estimation
    const totalWasted = invData.filter((u: any) => u.status === 'WASTED').length;
    const totalUnits = invData.length;
    
    // Group by ABO/RhD for National Heatmap
    const supplyByGroup: any = {};
    invData.forEach((u: any) => {
       const key = `${u.abo}${u.rhd === 'Positive' ? '+' : '-'}`;
       supplyByGroup[key] = (supplyByGroup[key] || 0) + 1;
    });

    // Mock burn rate for DOS calculation (Units per day)
    const burnRate = 45; 
    const dosByGroup: any = {};
    Object.keys(supplyByGroup).forEach(group => {
       dosByGroup[group] = (supplyByGroup[group] / (burnRate / 8)).toFixed(1);
    });

    return NextResponse.json({
      totalCollected,
      totalUnits,
      totalWasted,
      adverseCount: advData.length,
      supplyByGroup,
      dosByGroup,
      hospitalCoverage: 124, // Mock
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return internalErrorResponse(request, error, 'STATS_READ_FAILED');
  }
}
