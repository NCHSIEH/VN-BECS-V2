import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const ordersList = await db.orders.getAll();
    const order = ordersList.find((o: any) => o.id === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // Body might be empty, ignore
    }

    let updatedOrder = { ...order };

    if (action === 'approve') {
      // 1. Set status to APPROVED
      updatedOrder.status = 'APPROVED';

      // 2. Auto-allocate matching inventory units
      const allInventory = await db.inventory.getAll();
      const allocatedUnits: string[] = [];

      for (const item of order.items) {
        // Find matching available units
        const matches = allInventory.filter(
          (u: any) => u.abo === item.abo && u.rhd === item.rhd && u.status === 'AVAILABLE'
        );
        const toAllocate = matches.slice(0, item.qty);
        for (const unit of toAllocate) {
          allocatedUnits.push(unit.unitId);
          // Reserve it in inventory
          await db.inventory.create({ ...unit, status: 'RESERVED' });
        }

        // If not enough units, generate mock barcodes to fulfill the order beautifully
        if (allocatedUnits.length < item.qty) {
          const needed = item.qty - allocatedUnits.length;
          for (let k = 0; k < needed; k++) {
            const randId = `C-${Math.floor(Math.random() * 800000) + 100000}-01`;
            allocatedUnits.push(randId);
            // Insert into inventory
            await db.inventory.create({
              unitId: randId,
              productCode: item.productCode || 'E4226',
              abo: item.abo || 'O',
              rhd: item.rhd || 'Positive',
              expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'RESERVED',
              location: 'Central HUB'
            });
          }
        }
      }

      updatedOrder.allocatedUnits = allocatedUnits;
      updatedOrder.verifiedUnits = [];
      await db.orders.update(id, { status: 'APPROVED', allocatedUnits, verifiedUnits: [] });

      // Audit Event
      await db.auditEvents.create({
        eventType: 'Order Approval',
        objectId: id,
        actorRole: 'Dispatcher',
        details: `Order approved and allocated with units: ${allocatedUnits.join(', ')}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'revert') {
      updatedOrder.status = 'SUBMITTED';
      updatedOrder.allocatedUnits = [];
      updatedOrder.verifiedUnits = [];
      await db.orders.update(id, { status: 'SUBMITTED', allocatedUnits: [], verifiedUnits: [] });

      await db.auditEvents.create({
        eventType: 'Order Reverted',
        objectId: id,
        actorRole: 'Dispatcher',
        details: `Order reverted to SUBMITTED state.`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'escalate') {
      const reason = requestBody.reason || 'STAT Override';
      updatedOrder.status = 'REVIEW_PENDING';
      updatedOrder.escalationReason = reason;
      await db.orders.update(id, { status: 'REVIEW_PENDING', escalationReason: reason });

      await db.auditEvents.create({
        eventType: 'Order Escalated',
        objectId: id,
        actorRole: 'Dispatcher',
        details: `Order escalated to Medical Reviewer. Reason: ${reason}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'medical-approve') {
      updatedOrder.status = 'APPROVED';
      await db.orders.update(id, { status: 'APPROVED' });

      await db.auditEvents.create({
        eventType: 'Medical Approval',
        objectId: id,
        actorRole: 'MedicalReviewer',
        details: `Order medically reviewed and approved.`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'dispatch') {
      const { scannedCode } = requestBody;
      if (!scannedCode) {
        return NextResponse.json({ error: 'Missing raw barcode scan' }, { status: 400 });
      }

      // 1. Retrieve the scanned unit from global inventory
      const allInventory = await db.inventory.getAll();
      const unit = allInventory.find((u: any) => u.unitId === scannedCode);

      if (!unit) {
        return NextResponse.json({ 
          error: `🚨 Scanned unit not found in system inventory (ISBT-128: ${scannedCode})` 
        }, { status: 404 });
      }

      // 2. Verify unit location is 'Central HUB'
      if (unit.location !== 'Central HUB') {
        return NextResponse.json({ 
          error: `🚨 Location Error: Unit ${scannedCode} is located at "${unit.location}", not at Central HUB.` 
        }, { status: 400 });
      }

      // 3. Verify unit safety status & expiration
      if (unit.status === 'QUARANTINE' || unit.status === 'EXPIRED') {
        return NextResponse.json({ 
          error: `🚨 Safety Block: Unit ${scannedCode} is Quarantined or Expired!` 
        }, { status: 400 });
      }

      const isExpired = new Date(unit.expiryDate) < new Date();
      if (isExpired) {
        return NextResponse.json({ 
          error: `🚨 Safety Block: Unit ${scannedCode} has EXPIRED! (Expiry: ${new Date(unit.expiryDate).toLocaleDateString()})` 
        }, { status: 400 });
      }

      // 4. Verify blood group matching
      // Calculate total required quantity across all items
      let totalQty = 0;
      let matchesAnyItem = false;
      let requestedBloodTypes: string[] = [];

      for (const item of order.items) {
        totalQty += item.qty;
        requestedBloodTypes.push(`${item.abo} ${item.rhd === 'Positive' ? '+' : '-'}`);
        if (item.abo === unit.abo && item.rhd === unit.rhd) {
          matchesAnyItem = true;
        }
      }

      if (!matchesAnyItem) {
        return NextResponse.json({
          error: `🚨 Blood Group Mismatch: Scanned bag is ${unit.abo} ${unit.rhd === 'Positive' ? '+' : '-'}, but this order requires: ${requestedBloodTypes.join(', ')}`
        }, { status: 400 });
      }

      // 5. Manage verified list
      const verified = order.verifiedUnits || [];
      const allocated = order.allocatedUnits || [];

      if (verified.includes(scannedCode)) {
        return NextResponse.json({ error: `🚨 Safety Alert: Unit ${scannedCode} has already been verified for this order!` }, { status: 400 });
      }

      // Dynamic Swap if scanned unit is compatible but not in the original allocated list
      if (!allocated.includes(scannedCode)) {
        // Find an unverified allocated unit of the same ABO/Rh group to replace
        let replacedIndex = -1;
        
        for (let i = 0; i < allocated.length; i++) {
          const allocId = allocated[i];
          if (!verified.includes(allocId)) {
            const allocUnit = allInventory.find((u: any) => u.unitId === allocId);
            if (allocUnit && allocUnit.abo === unit.abo && allocUnit.rhd === unit.rhd) {
              replacedIndex = i;
              break;
            }
          }
        }

        if (replacedIndex !== -1) {
          // Revert old reserved unit status
          const oldUnitId = allocated[replacedIndex];
          const oldUnit = allInventory.find((u: any) => u.unitId === oldUnitId);
          if (oldUnit) {
            await db.inventory.create({ ...oldUnit, status: 'AVAILABLE' });
          }

          // Allocate new unit
          allocated[replacedIndex] = scannedCode;
          await db.inventory.create({ ...unit, status: 'RESERVED' });
        } else {
          return NextResponse.json({ error: `🚨 Capacity Exceeded: Scanned compatible unit ${scannedCode} exceeds the required quantity for this blood type.` }, { status: 400 });
        }
      }

      // Add to verified list
      verified.push(scannedCode);

      // 6. Transition to DISPATCHED if all units are verified
      const isComplete = verified.length === totalQty;
      const finalStatus = isComplete ? 'DISPATCHED' : 'APPROVED';

      updatedOrder.status = finalStatus;
      updatedOrder.allocatedUnits = allocated;
      updatedOrder.verifiedUnits = verified;

      await db.orders.update(id, { 
        status: finalStatus, 
        allocatedUnits: allocated, 
        verifiedUnits: verified 
      });

      // Update unit status to PICKED
      await db.inventory.create({ ...unit, status: 'PICKED' });

      try {
        await db.components.updateStatus(scannedCode, 'PICKED');
      } catch (e) {}

      // Audit Event
      await db.auditEvents.create({
        eventType: 'Order Unit Verified',
        objectId: id,
        actorRole: 'WarehouseIssuer',
        details: `Unit ${scannedCode} verified. Progress: ${verified.length}/${totalQty} units verified.`,
        timestamp: new Date().toISOString()
      });

      if (isComplete) {
        await db.auditEvents.create({
          eventType: 'Order Dispatched',
          objectId: id,
          actorRole: 'WarehouseIssuer',
          details: `Order fully picked, verified (${verified.join(', ')}), and dispatched. Ready for transit.`,
          timestamp: new Date().toISOString()
        });
      }

    } else if (action === 'transit') {
      updatedOrder.status = 'IN_TRANSIT';
      await db.orders.update(id, { status: 'IN_TRANSIT' });

      // Transition blood units to IN_TRANSIT
      const units = order.allocatedUnits || [];
      for (const unit of units) {
        try {
          await db.components.updateStatus(unit, 'IN_TRANSIT');
        } catch (e) {}
      }

      await db.auditEvents.create({
        eventType: 'Transit Initiated',
        objectId: id,
        actorRole: 'Courier',
        details: `Shipment departed and is in transit. Cold chain telemetry active.`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'deliver') {
      const { handoverCode } = requestBody;
      updatedOrder.status = 'DELIVERED';
      await db.orders.update(id, { status: 'DELIVERED' });

      // Transition blood units to RECEIVED and update location in inventory
      const units = order.allocatedUnits || [];
      const allInventory = await db.inventory.getAll();
      for (const unit of units) {
        try {
          await db.components.updateStatus(unit, 'RECEIVED');
          
          // Move inventory to Hospital
          const invItem = allInventory.find((inv: any) => inv.unitId === unit);
          if (invItem) {
            await db.inventory.create({
              ...invItem,
              status: 'AVAILABLE',
              location: order.hospital || 'HOSPITAL' // If hospital id is available
            });
          }
        } catch (e) {}
      }

      await db.auditEvents.create({
        eventType: 'Secure Handover Complete',
        objectId: id,
        actorRole: 'Courier',
        details: `Secure handover completed successfully. PIN verification code: ${handoverCode}`,
        timestamp: new Date().toISOString()
      });

    } else if (action === 'waste') {
      updatedOrder.status = 'WASTED';
      await db.orders.update(id, { status: 'WASTED' });

      // Transition blood units to WASTED
      const units = order.allocatedUnits || [];
      for (const unit of units) {
        try {
          await db.components.updateStatus(unit, 'WASTED');
        } catch (e) {}
      }

      await db.auditEvents.create({
        eventType: 'Shipment Wasted',
        objectId: id,
        actorRole: 'Courier',
        details: `Shipment reported wasted due to cold chain breach.`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ error: 'Unsupported action type' }, { status: 400 });
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Order Action Route Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
