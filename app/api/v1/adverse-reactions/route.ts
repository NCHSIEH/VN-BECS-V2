import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function GET() {
  try {
    const data = await db.adverse_reactions.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const id = `AR-${Date.now()}`;
    
    // Hemovigilance Lookback Logic (SOP: Adverse Reaction)
    let lookbackTriggered = 0;
    
    if (data.transfusionId) {
      // Find the transfusion record
      const transfusions = await db.transfusions.getAll();
      const tf = transfusions.find((t: any) => t.id === data.transfusionId);
      
      if (tf && tf.componentId) {
        // Find the blood component
        const components = await db.components.getAll();
        const component = components.find((c: any) => c.id === tf.componentId || c.unitId === tf.componentId);
        
        if (component && component.donationId) {
          // Find all other components from the SAME donation (co-components)
          const coComponents = components.filter((c: any) => c.donationId === component.donationId && c.id !== component.id);
          
          if (coComponents.length > 0) {
            lookbackTriggered = 1;
            for (const co of coComponents) {
               // Quarantine them immediately to prevent further harm
               await db.components.updateStatus(co.id, 'QUARANTINE');
               
               // Log audit event for quarantine
               await db.auditEvents.create({
                  actorRole: 'System',
                  eventType: 'HEMOVIGILANCE_QUARANTINE',
                  objectId: co.id,
                  details: `Component auto-quarantined due to adverse reaction reported on co-component ${component.id} (Transfusion ${data.transfusionId}).`,
                  timestamp: new Date().toISOString()
               });
            }
          }
        }
      }
    }

    await db.adverse_reactions.create({ ...data, id, lookbackTriggered, reportedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, id, lookbackTriggered });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
