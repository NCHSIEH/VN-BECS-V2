import { NextResponse } from 'next/server';
import * as db from '@/src/server/db';
import {
  evaluateBloodUnitTransition,
  executeBloodUnitTransition,
} from '@/src/server/services/bloodUnitCommands';
import type { Role } from '@/src/types';
import { internalErrorResponse } from '@/src/server/apiResponses';
import { authorizeApiRole, rbacErrorBody } from '@/src/server/rbacPolicy';

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
  } catch {}
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function isSeriousReaction(reactionType?: string, severity?: string): boolean {
  const normType = reactionType?.trim().toUpperCase() ?? '';
  const normSeverity = severity?.trim().toUpperCase() ?? '';

  // If explicitly mild or moderate, it is NOT serious
  if (normSeverity === 'MILD' || normSeverity === 'MODERATE') {
    return false;
  }
  
  const severeTypes = new Set(['TRALI', 'TACO', 'HTR', 'ANAPHYLAXIS', 'SEPTIC', 'HEMOLYTIC', 'ACUTE HEMOLYTIC', 'ACUTE_HEMOLYTIC']);
  const severeLevels = new Set(['SERIOUS', 'SEVERE', 'FATAL']);
  
  if (severeTypes.has(normType) || severeLevels.has(normSeverity)) {
    return true;
  }

  // If both are completely omitted, default to serious for maximum safety
  if (!reactionType && !severity) {
    return true;
  }
  
  return false;
}

export async function GET(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Manager', 'Auditor', 'QA_Officer', 'Nurse', 'HospitalOperator', 'MedicalReviewer'], action: 'ADVERSE_REACTION_READ' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const data = await db.adverse_reactions.getAll();
    return NextResponse.json(data);
  } catch (error) {
    return internalErrorResponse(request, error, 'ADVERSE_REACTION_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  const authz = authorizeApiRole({ request, allowedRoles: ['Admin', 'Nurse', 'HospitalOperator', 'MedicalReviewer'], action: 'ADVERSE_REACTION_CREATE' });
  if (!authz.allowed) return NextResponse.json(rbacErrorBody(authz), { status: 403 });
  try {
    const data = await request.json();
    const id = `AR-${Date.now()}`;
    
    let patientId = data.patientId;
    let componentId = data.componentId;
    let orderId = data.orderId;
    let issueRecordId = data.issueRecordId;
    let crossmatchId = data.crossmatchId;

    if (data.transfusionId) {
      const transfusions = await db.transfusions.getAll();
      const tf = transfusions.find((t: any) => t.id === data.transfusionId || t.transfusionId === data.transfusionId);
      if (tf) {
        patientId = patientId || tf.patientId;
        componentId = componentId || tf.componentId;
      }
    }

    let component: any = null;
    let donation: any = null;
    let donor: any = null;

    if (componentId) {
      const components = await db.components.getAll();
      component = components.find((c: any) => c.id === componentId || c.unitId === componentId);
      
      if (component) {
        patientId = patientId || component.patientId;
        
        // Find issue record
        let issueRecordsService: any = null;
        try {
          issueRecordsService = db.issueRecords;
        } catch {}
        if (issueRecordsService && typeof issueRecordsService.getAll === 'function') {
          const issueRecords = await issueRecordsService.getAll();
          const issue = issueRecords.find((r: any) => r.componentId === component.id);
          if (issue) {
            issueRecordId = issueRecordId || issue.id;
            patientId = patientId || issue.patientId;
          }
        }

        // Find original order
        let ordersService: any = null;
        try {
          ordersService = db.orders;
        } catch {}
        if (ordersService && typeof ordersService.getAll === 'function') {
          const orders = await ordersService.getAll();
          const order = orders.find((o: any) => {
            const alloc = asStringList(o.allocatedUnits);
            return alloc.includes(component.id);
          });
          if (order) {
            orderId = orderId || order.id;
            patientId = patientId || order.patientId;
          }
        }

        // Find crossmatch record
        let crossmatchService: any = null;
        try {
          crossmatchService = db.crossmatch;
        } catch {}
        if (crossmatchService && typeof crossmatchService.getAll === 'function') {
          const crossmatches = await crossmatchService.getAll();
          const xm = crossmatches.find((x: any) => x.componentId === component.id);
          if (xm) {
            crossmatchId = crossmatchId || xm.id;
            patientId = patientId || xm.patientId;
          }
        }

        // Load donation & donor for deferral
        let donationsService: any = null;
        let donorsService: any = null;
        try {
          donationsService = db.donations;
        } catch {}
        try {
          donorsService = db.donors;
        } catch {}
        if (component.donationId && donationsService && typeof donationsService.getAll === 'function') {
          const donations = await donationsService.getAll();
          donation = donations.find((d: any) => d.id === component.donationId);
          if (donation && donorsService && typeof donorsService.getAll === 'function') {
            const donorsList = await donorsService.getAll();
            donor = donorsList.find((d: any) => d.id === donation.donorId);
          }
        }
      }
    }

    // Hemovigilance Lookback Logic (SOP: Adverse Reaction)
    const serious = isSeriousReaction(data.reactionType, data.severity);
    const lookbackTriggered = serious ? 1 : 0;
    const quarantinedComponents: string[] = [];
    const needsReview: Array<{ componentId: string; reason: string }> = [];
    
    // Defer donor if reaction is serious
    let donorsServiceForUpdate: any = null;
    try {
      donorsServiceForUpdate = db.donors;
    } catch {}
    if (lookbackTriggered === 1 && donor && donorsServiceForUpdate && typeof donorsServiceForUpdate.update === 'function') {
      await db.donors.update(donor.id, {
        deferralStatus: 'Active',
        deferralReason: `HEMOVIGILANCE LOOKBACK: Suspected serious transfusion reaction (AR: ${id}) on component ${component?.id} from donation ${donation?.id}`,
        deferralUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months temp deferral
      });

      await db.auditEvents.create({
        actorRole: 'System',
        eventType: 'HEMOVIGILANCE_DONOR_DEFERRED',
        objectId: donor.id,
        details: `Source donor ${donor.name} (ID: ${donor.id}) temporarily deferred due to serious suspected transfusion reaction reported on co-component ${component?.id} (Donation ${donation?.id}).`,
        timestamp: new Date().toISOString()
      });
    }

    if (lookbackTriggered === 1 && component) {
      await db.auditEvents.create({
        actorRole: 'System',
        eventType: 'HEMOVIGILANCE_LOOKBACK_TRIGGERED',
        objectId: component.id,
        details: `Active Lookback investigation triggered for donation ${component.donationId} after serious suspected reaction reported on component ${component.id}.`,
        timestamp: new Date().toISOString()
      });
    }

    // Cascade auto-quarantine for co-components
    if (lookbackTriggered === 1 && component && component.donationId) {
      const components = await db.components.getAll();
      const coComponents = components.filter((c: any) => c.donationId === component.donationId && c.id !== component.id);
      const allInventory = await db.inventory.getAll();
      
      if (coComponents.length > 0) {
        for (const co of coComponents) {
           const actorRole = (data.actorRole || data.role || 'QA_Officer') as Role;
           
           const invItem = allInventory.find((item: any) => item.unitId === co.id);
           const currentStatus = invItem ? invItem.status : co.status;

           const transitionResult = await executeBloodUnitTransition(
             {
               unitId: co.id,
               currentStatus,
               targetStatus: 'QUARANTINE',
               role: actorRole,
             },
             'System',
             'SERVER',
             'HEMOVIGILANCE_QUARANTINE',
             'REQ-LOOKBACK'
           );

           if (!transitionResult.success) {
             needsReview.push({
               componentId: co.id,
               reason: transitionResult.error?.message || 'Transition blocked',
             });

             await db.auditEvents.create({
                actorRole: 'System',
                eventType: 'HEMOVIGILANCE_QUARANTINE_REVIEW_REQUIRED',
                objectId: co.id,
                details: `Co-component could not be auto-quarantined after adverse reaction on ${component.id}. Reason: ${transitionResult.error?.message}`,
                timestamp: new Date().toISOString()
             });
             continue;
           }

           quarantinedComponents.push(co.id);
        }
      }
    }

    const payload = {
      ...data,
      id,
      patientId,
      componentId,
      orderId,
      issueRecordId,
      crossmatchId,
      lookbackTriggered,
      lookbackNeedsReview: needsReview.length > 0 ? 1 : 0,
      reportedAt: new Date().toISOString()
    };

    await db.adverse_reactions.create(payload);

    await db.auditEvents.create({
      actorRole: (data.actorRole || data.role || 'QA_Officer'),
      eventType: 'HEMOVIGILANCE_REACTION_REPORTED',
      objectId: id,
      details: `Suspected adverse transfusion reaction reported: patient ${patientId}, component ${componentId}, severity ${data.severity}, type ${data.reactionType}. Lookback Triggered: ${lookbackTriggered}.`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      id, 
      patientId,
      componentId,
      orderId,
      issueRecordId,
      crossmatchId,
      lookbackTriggered, 
      quarantinedComponents, 
      needsReview 
    });
  } catch (error) {
    console.error('ADVERSE_REACTION_POST_ERROR:', error);
    return internalErrorResponse(request, error, 'ADVERSE_REACTION_CREATE_FAILED');
  }
}
