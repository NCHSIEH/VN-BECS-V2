import { NextResponse } from 'next/server';
import { inventory, donations, adverse_reactions } from '@/src/server/db';

export async function GET() {
  try {
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
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
