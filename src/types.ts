/**
 * @fileoverview Domain Types & Interfaces (Data Dictionary)
 *
 * This module exports all TypeScript definitions for the VN-BBMS system,
 * replacing the disjointed type definitions from previous iterations.
 */

// ─── Base Enums ─────────────────────────────────────────────────────────────

/** Validation Result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** User roles. */
export type Role =
  | 'DonorScreener'
  | 'LIMS_Simulator'
  | 'WarehouseIssuer'
  | 'Dispatcher'
  | 'Courier'
  | 'HospitalOperator'
  | 'Nurse'
  | 'QA_Officer'
  | 'Admin';

/** Subsystems the user can access from the Portal. */
export type SystemType = 'HUB' | 'LIMS' | 'MDM' | 'HOSPITAL' | 'NATIONAL';

/** Organization classification. */
export type OrgType = 'BloodCenter' | 'Hub' | 'Hospital';

/**
 * Blood Unit lifecycle statuses.
 * Transitions are enforced by BloodUnitStateMachine (§3).
 * Terminal states: DISCARDED, TRANSFUSED, WASTED.
 */
export type BloodUnitStatus =
  | 'COLLECTED'
  | 'QUARANTINE'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'PICKED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CROSSMATCHED'
  | 'ISSUED'
  | 'TRANSFUSED'
  | 'RETURNED'
  | 'DISCARDED'
  | 'WASTED';

/** IDM (Infectious Disease Marker) test outcomes. */
export type IdmStatus = 'PENDING' | 'CLEARED' | 'REACTIVE';

/** Order lifecycle statuses. */
export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'REJECTED'
  | 'REVIEW_PENDING';

/** Order urgency levels. */
export type OrderPriority = 'Routine' | 'ASAP' | 'STAT' | 'MTP';

/** Crossmatch methods per AABB standards (§4 SOP7). */
export type CrossmatchMethod = 'IS' | 'AHG' | 'EXM';

/** Crossmatch test outcomes. */
export type CrossmatchResult = 'Compatible' | 'Incompatible' | 'Inconclusive';

/** Adverse reaction classification per ISBT/CDC NHSN (§4 SOP9). */
export type AdverseReactionType =
  | 'FNHTR'
  | 'ALLERGIC'
  | 'ANAPHYLACTIC'
  | 'AHTR'
  | 'DHTR'
  | 'TACO'
  | 'TRALI'
  | 'BACTERIAL';

/** Adverse reaction severity levels. */
export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

/** Offline event sync statuses. */
export type SyncStatus = 'Pending' | 'Syncing' | 'Synced' | 'Conflict' | 'Rejected' | 'NeedsReview';

/** Return status for SOP 8 Issue & Return. */
export type ReturnStatus = 'ColdChainOK' | 'ColdChainViolation' | 'VisualFail' | 'Timeout';

/** MTP case statuses. */
export type MtpStatus = 'ACTIVE' | 'STOPPED' | 'RESOLVED';

/** Transport job statuses. */
export type TransportStatus = 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';

/** ABO blood types. */
export type AboType = 'A' | 'B' | 'O' | 'AB';

/** Rh factor values. */
export type RhdType = 'Positive' | 'Negative';

/** Donation type. */
export type DonationType = 'WholeBlood' | 'Apheresis';

// ─── Master Data ─────────────────────────────────────────────────────────────

/** Organization / facility record. */
export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  location: string;
  active?: boolean;
  createdAt?: string;
}

/** System user bound to an organization. */
export interface User {
  id: string;
  username: string;
  role: Role;
  orgId: string;
  orgName?: string;
  orgType?: OrgType;
  permittedSystems: SystemType[];
  photoUrl?: string;
}

/** ISBT-128 Product Catalog entry. */
export interface ProductCatalog {
  productCode: string;
  alias: string;
  componentClass: string;
  aboRequired: boolean;
  rhdRequired: boolean;
  active?: boolean;
}

/** Patient record (SOP 6/7/8). */
export interface Patient {
  id: string;
  mrn: string;
  name: string;
  abo: AboType | 'Unknown';
  rhd: RhdType | 'Unknown';
  hospitalId: string;
  antibodyHistory: string[];
}

// ─── Supply Side (SOP 1-3) ───────────────────────────────────────────────────

/** Blood donor. */
export interface Donor {
  id: string;
  name: string;
  /** Vietnam 12-digit CCCD national ID. */
  nationalId: string;
  dob: string;
  gender?: 'Male' | 'Female';
  weight?: number;
  bloodType: AboType;
  rhd: RhdType;
  registeredAt: string;
  deferralStatus?: 'Active' | 'None';
  deferralReason?: string;
  deferralUntil?: string;
}

/** Pre-donation health questionnaire. */
export interface Questionnaire {
  id: string;
  donorId: string;
  answersJson: string;
  isPassed: boolean | number;
  createdAt: string;
  deferralReason?: string;
  deferralUntil?: string;
}

/** Blood collection (donation) event — SOP 1. */
export interface Donation {
  id: string;            // ISBT-128 DIN (e.g., =W0000 24 123456)
  donorId: string;
  questionnaireId: string;
  collectedAt: string;
  volume: number;        // ml, range 200-600
  donationType: DonationType;
}

/** Laboratory test record — SOP 2. */
export interface LabTest {
  id: string;
  donationId: string;
  abo: AboType;
  rhd: RhdType;
  idmStatus: IdmStatus;
  natResult?: 'Negative' | 'Positive' | 'Indeterminate';
  serologyResult?: 'Negative' | 'Positive' | 'Indeterminate';
  testedAt?: string;
}

/** Blood component — SOP 3. Core entity for the State Machine. */
export interface BloodComponent {
  id: string;
  donationId: string;
  productCode: string;
  expiryDate: string;
  status: BloodUnitStatus;
  currentLocation: string;
  coldChainViolation?: boolean;
  createdAt: string;
  releasedAt?: string;
}

// ─── Dispatch & Logistics (SOP 4, 5, 10) ─────────────────────────────────────

/** Order line item. */
export interface OrderLine {
  id: string;
  product: string;
  qty: number;
  productCode?: string;
  abo?: AboType;
  rhd?: RhdType;
  approvedQty?: number;
}

/** Hospital order — SOP 10. */
export interface Order {
  id: string;
  hospital: string;
  hospitalId?: string;
  priority: OrderPriority;
  status: OrderStatus;
  hiciScore: number;
  type: string;
  submittedAt: string | null;
  items: OrderLine[];
  mtpCaseId?: string;
  patientId?: string;
  clinicalIndication?: string;
  specialRequirements?: string;
  escalationReason?: string;
  rationale?: {
    demandRisk?: string;
    regionalScarcityRisk?: string;
    leadTimeRisk?: string;
    confidence?: string;
  };
  allocatedUnits?: string[];
}

/** AI allocation proposal — SOP 4. */
export interface AllocationProposal {
  id: string;
  orderId: string;
  proposedUnits: string[];
  hiciScore: number;
  rationale: Record<string, unknown>;
  aiConfidence: number;
}

/** Transport/logistics job — SOP 5. */
export interface TransportJob {
  id: string;
  orderId: string;
  courierId: string;
  status: TransportStatus;
  temperatureLog: { timestamp: string; tempC: number }[];
  gpsLog: { timestamp: string; lat: number; lng: number }[];
  coldChainViolation: boolean;
  departedAt?: string;
  deliveredAt?: string;
}

/** MTP (Mass Transfusion Protocol) case — SOP 10. */
export interface MTPCase {
  id: string;
  hospitalId: string;
  activatedBy: string;
  activatedAt: string;
  status: MtpStatus;
  linkedOrderIds: string[];
  patientIdentifier: string;
  authorizedClinician: string;
  clinicalScenario: string;
}

// ─── Hospital Side (SOP 6, 7, 8, 9) ─────────────────────────────────────────

/** Crossmatch test record — SOP 7. */
export interface CrossmatchTest {
  id: string;
  componentId: string;
  patientId: string;
  method: CrossmatchMethod;
  result: CrossmatchResult;
  testedBy: string;
  specimenDate: string;
  createdAt: string;
}

/** Issue / Return record — SOP 8. */
export interface IssueRecord {
  id: string;
  componentId: string;
  patientId: string;
  issuedTo: string;      // ward/unit name
  issuedBy: string;
  issuedAt: string;
  returnedAt?: string;
  returnStatus?: ReturnStatus;
}

/** Transfusion event with dual verification — SOP 6. */
export interface TransfusionRecord {
  id: string;
  componentId: string;
  patientId: string;
  verifier1: string;
  verifier2Pin: string;
  consentVerified: boolean;
  preVitalsChecked: boolean;
  startedAt: string;
  completedAt?: string;
}

/** Adverse reaction report — SOP 9. */
export interface AdverseReaction {
  id: string;
  transfusionId: string;
  reactionType: AdverseReactionType;
  severity: AlertSeverity;
  description: string;
  actionsTaken: string;
  lookbackTriggered: boolean;
  reportedBy: string;
  reportedAt: string;
}

// ─── System Shared ───────────────────────────────────────────────────────────

/** Immutable audit trail entry. */
export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  actorRole: string;
  eventType: string;
  objectType?: string;
  objectId: string;
  beforeHash?: string;
  afterHash?: string;
  details: string;
}

/** Offline emergency borrowing event. */
export interface OfflineEvent {
  localEventId: string;
  hospitalId?: string;
  unitBarcodeRaw: string;
  patientTempId: string;
  authorizationDoctorId: string;
  timestamp: string;
  syncStatus: SyncStatus;
}

/** Event in the offline outbox waiting for sync. */
export interface OutboxEvent {
  localEventId: string;
  tenantId?: string;
  facilityId?: string;
  deviceId?: string;
  operationType: string;
  din?: string;
  bagUid?: string;
  patientRef?: string;
  payload: any;
  baseVersion?: number;
  clientTimestamp: string;
  idempotencyKey?: string;
  retryCount?: number;
  syncStatus: SyncStatus;
  lastErrorCode?: string;
}

/** Daily reconciliation report (generated by Cloud Functions). */
export interface DailyReconciliationReport {
  id: string;
  date: string;
  hospitalId: string;
  borrowedUnits: string[];
  conflicts: string[];
  resolvedBy?: string;
  resolvedAt?: string;
}

/**
 * Inventory unit (legacy/view model).
 * @deprecated Use BloodComponent instead for new code.
 */
export interface InventoryUnit {
  unitId: string;
  productCode: string;
  abo: string;
  rhd: string;
  expiryDate: string;
  status: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'TRANSFUSED' | 'WASTED';
  location: string;
  isIrradiated?: boolean;
  isCmvNegative?: boolean;
}

// ─── Supply Chain & Resource Management (Phase 2) ────────────────────────────

/** Resource category. */
export type ResourceType = 'Reagent' | 'Equipment' | 'Consumable';

/** Resource status. */
export type ResourceStatus = 'Active' | 'Expired' | 'MaintenanceRequired' | 'OutofStock';

/** Lab/Supply Resource (SOP 2/3). */
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  lotNumber?: string;
  expiryDate?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  status: ResourceStatus;
  stockLevel?: number;
  minStockLevel?: number;
  orgId: string;
}
