import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import { inventory } from '@/src/server/repositories/inventoryRepo';

export async function POST(request: Request) {
  try {
    const { events } = await request.json();
    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const results = [];

    for (const event of events) {
      try {
        if (event.operationType === 'IssueBag') {
           // Simulate processing offline issue
           const payload = event.payload;
           const unitId = event.bagUid || event.din;
           
           // Fetch component
           const allInventory = await db.inventory.getAll();
           const item = allInventory.find((u: any) => u.unitId === unitId);
           
           if (!item) {
              results.push({ idempotencyKey: event.idempotencyKey, syncState: 'Rejected', error: 'Bag not found in central DB' });
              continue;
           }
           
           // Process issue
           if (item.status !== 'AVAILABLE') {
              results.push({ idempotencyKey: event.idempotencyKey, syncState: 'Rejected', error: `Bag is not available. Status: ${item.status}` });
              continue;
           }

           // Check version for optimistic locking
           if (event.baseVersion && item.version && event.baseVersion !== item.version) {
              results.push({ idempotencyKey: event.idempotencyKey, syncState: 'NeedsReview', error: 'Version mismatch (Concurrency Conflict)' });
              continue;
           }

           // Perform the update
           await inventory.updateStatusWithLock(unitId, event.baseVersion || 1, { status: 'ISSUED' });
           
           // Create audit event
           await db.auditEvents.create({
              eventType: 'Offline Sync: Bag Issued',
              objectId: unitId,
              actorRole: 'System',
              details: `Bag issued offline and synchronized. Client timestamp: ${event.clientTimestamp}`,
              timestamp: new Date().toISOString()
           });

           results.push({ idempotencyKey: event.idempotencyKey, syncState: 'Accepted' });
        } else {
           results.push({ idempotencyKey: event.idempotencyKey, syncState: 'Rejected', error: 'Unknown operationType' });
        }
      } catch (err: any) {
         results.push({ idempotencyKey: event.idempotencyKey, syncState: 'Rejected', error: err.message || 'Internal logic error' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync Push Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
