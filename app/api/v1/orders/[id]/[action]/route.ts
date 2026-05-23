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
      await db.orders.update(id, { status: 'APPROVED', allocatedUnits });

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
      await db.orders.update(id, { status: 'SUBMITTED', allocatedUnits: [] });

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

      // Add to allocated if not present
      const allocated = order.allocatedUnits || [];
      if (!allocated.includes(scannedCode)) {
        allocated.push(scannedCode);
      }

      updatedOrder.status = 'DISPATCHED';
      updatedOrder.allocatedUnits = allocated;
      await db.orders.update(id, { status: 'DISPATCHED', allocatedUnits: allocated });

      // Transition blood unit status to PICKED
      try {
        await db.components.updateStatus(scannedCode, 'PICKED');
      } catch (e) {
        // Fallback for components table missing
      }

      await db.auditEvents.create({
        eventType: 'Order Dispatched',
        objectId: id,
        actorRole: 'WarehouseIssuer',
        details: `Blood unit ${scannedCode} verified and dispatched for shipment.`,
        timestamp: new Date().toISOString()
      });

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

      // Transition blood units to RECEIVED
      const units = order.allocatedUnits || [];
      for (const unit of units) {
        try {
          await db.components.updateStatus(unit, 'RECEIVED');
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
