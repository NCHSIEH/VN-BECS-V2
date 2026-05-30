/**
 * @fileoverview Donor <-> recipient bidirectional traceability (RTM-TRACE-01).
 *
 * Supports the two haemovigilance directions:
 *  - FORWARD  (donor -> recipients): given a donor (e.g. found infectious),
 *    enumerate every donation, component, current disposition and the patients
 *    who received them — the recall/lookback view.
 *  - BACKWARD (unit/recipient -> donor): given a blood unit or a patient,
 *    trace back to the source donation and donor — the reaction-investigation
 *    view.
 *
 * Pure functions over plain data collections so they are unit-testable without
 * a database. The data chain is:
 *   donor -> donation(donorId) -> component(donationId)
 *         -> {crossmatch,issue_records,transfusions}(componentId) -> patient
 *         -> adverse_reactions(transfusionId)
 */

export interface TraceData {
  donors: any[];
  donations: any[];
  components: any[];
  labTests: any[];
  crossmatch: any[];
  issueRecords: any[];
  transfusions: any[];
  adverseReactions: any[];
  patients: any[];
}

export interface TraceReaction {
  id: string;
  reactionType?: string;
  severity?: string;
  reportedAt?: string;
}

export interface TraceRecipient {
  patientId: string;
  patientName?: string;
  via: 'transfusion' | 'issue' | 'crossmatch';
  transfusionId?: string;
  issuedAt?: string;
  transfusedAt?: string;
  reactions: TraceReaction[];
}

export interface TraceUnit {
  componentId: string;
  productCode?: string;
  type?: string;
  status?: string;
  abo?: string;
  rhd?: string;
  idmStatus?: string;
  recipients: TraceRecipient[];
}

export interface DonorSummary {
  id: string;
  name?: string;
  nationalId?: string;
  bloodType?: string;
  rhd?: string;
}

export interface DonorTraceReport {
  direction: 'forward';
  found: boolean;
  donor: DonorSummary | null;
  donations: Array<{
    id: string;
    collectedAt?: string;
    volume?: number;
    donationType?: string;
    units: TraceUnit[];
  }>;
  summary: { donationCount: number; unitCount: number; recipientCount: number; reactionCount: number };
  generatedAt: string;
}

export interface UnitTraceReport {
  direction: 'backward';
  found: boolean;
  unit: TraceUnit | null;
  donation: { id: string; collectedAt?: string; donationType?: string } | null;
  donor: DonorSummary | null;
  generatedAt: string;
}

function donorSummary(d: any): DonorSummary | null {
  if (!d) return null;
  return { id: d.id, name: d.name, nationalId: d.nationalId, bloodType: d.bloodType, rhd: d.rhd };
}

/** Collect the patients who received (or were matched/issued) a given component. */
function recipientsForComponent(componentId: string, data: TraceData): TraceRecipient[] {
  const recipients: TraceRecipient[] = [];
  const patientName = (pid: string) =>
    data.patients.find(p => p.id === pid || p.mrn === pid)?.name;
  const reactionsFor = (transfusionId?: string): TraceReaction[] =>
    transfusionId
      ? data.adverseReactions
          .filter(r => r.transfusionId === transfusionId)
          .map(r => ({ id: r.id, reactionType: r.reactionType, severity: r.severity, reportedAt: r.reportedAt }))
      : [];

  for (const tf of data.transfusions.filter(t => t.componentId === componentId)) {
    recipients.push({
      patientId: tf.patientId,
      patientName: patientName(tf.patientId),
      via: 'transfusion',
      transfusionId: tf.id,
      transfusedAt: tf.completedAt || tf.startedAt,
      reactions: reactionsFor(tf.id),
    });
  }
  for (const ir of data.issueRecords.filter(i => i.componentId === componentId)) {
    if (recipients.some(r => r.patientId === ir.patientId && r.via === 'transfusion')) continue;
    recipients.push({
      patientId: ir.patientId,
      patientName: patientName(ir.patientId),
      via: 'issue',
      issuedAt: ir.issuedAt,
      reactions: [],
    });
  }
  for (const xm of data.crossmatch.filter(x => x.componentId === componentId)) {
    if (recipients.some(r => r.patientId === xm.patientId)) continue;
    recipients.push({
      patientId: xm.patientId,
      patientName: patientName(xm.patientId),
      via: 'crossmatch',
      reactions: [],
    });
  }
  return recipients;
}

function buildTraceUnit(component: any, data: TraceData): TraceUnit {
  const idm = data.labTests.find(t => t.donationId === component.donationId);
  return {
    componentId: component.id,
    productCode: component.productCode,
    type: component.type,
    status: component.status,
    abo: component.abo,
    rhd: component.rhd,
    idmStatus: idm?.idmStatus,
    recipients: recipientsForComponent(component.id, data),
  };
}

/** FORWARD: donor -> every donation -> component -> recipient (lookback/recall). */
export function traceDonorToRecipients(donorId: string, data: TraceData): DonorTraceReport {
  const donor = data.donors.find(d => d.id === donorId || d.nationalId === donorId);
  const generatedAt = new Date().toISOString();
  if (!donor) {
    return {
      direction: 'forward',
      found: false,
      donor: null,
      donations: [],
      summary: { donationCount: 0, unitCount: 0, recipientCount: 0, reactionCount: 0 },
      generatedAt,
    };
  }

  const donations = data.donations.filter(dn => dn.donorId === donor.id).map(dn => {
    const units = data.components.filter(c => c.donationId === dn.id).map(c => buildTraceUnit(c, data));
    return { id: dn.id, collectedAt: dn.collectedAt, volume: dn.volume, donationType: dn.donationType, units };
  });

  const allUnits = donations.flatMap(d => d.units);
  const recipientKeys = new Set<string>();
  let reactionCount = 0;
  for (const u of allUnits) {
    for (const r of u.recipients) {
      recipientKeys.add(`${u.componentId}:${r.patientId}`);
      reactionCount += r.reactions.length;
    }
  }

  return {
    direction: 'forward',
    found: true,
    donor: donorSummary(donor),
    donations,
    summary: {
      donationCount: donations.length,
      unitCount: allUnits.length,
      recipientCount: recipientKeys.size,
      reactionCount,
    },
    generatedAt,
  };
}

/** BACKWARD: blood unit -> donation -> donor (reaction investigation). */
export function traceUnitToDonor(unitId: string, data: TraceData): UnitTraceReport {
  const generatedAt = new Date().toISOString();
  const component = data.components.find(c => c.id === unitId || c.donationId === unitId);
  if (!component) {
    return { direction: 'backward', found: false, unit: null, donation: null, donor: null, generatedAt };
  }
  const donation = data.donations.find(dn => dn.id === component.donationId) || null;
  const donor = donation ? data.donors.find(d => d.id === donation.donorId) : null;
  return {
    direction: 'backward',
    found: true,
    unit: buildTraceUnit(component, data),
    donation: donation ? { id: donation.id, collectedAt: donation.collectedAt, donationType: donation.donationType } : null,
    donor: donorSummary(donor),
    generatedAt,
  };
}
