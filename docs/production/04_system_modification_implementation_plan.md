# VN-BECS-V2 System Modification Implementation Plan

Purpose: convert the current VN-BECS-V2 pilot/demo implementation into a production-ready blood establishment, hospital blood bank, and transfusion workflow platform.

Decision: the system must not be used as the authoritative clinical blood bank system until the go-live gates in this plan are met, validated, and signed off by the pilot organization, hospital users, IT security, quality/regulatory owners, and local legal/regulatory reviewers.

## 1. Scope

This plan addresses the defects identified in the system-wide review:

- Subsystem coupling is directionally correct but the lifecycle model still relies on duplicated and free-text status fields.
- Information flow is present but not yet enforced consistently by database constraints, domain commands, authorization, audit, and validation.
- Regulatory alignment is partial and needs formal local policy decisions plus implementation evidence.
- Safety checks exist but need stronger identity, traceability, exception, offline, and cold-chain controls.
- The current system is suitable for demo, UAT, simulation, or shadow pilot only. It is not ready for direct clinical go-live.

## 2. Implementation Principles

1. Fail closed for every clinical safety decision.
2. Treat blood unit lifecycle changes as domain commands, not direct table updates.
3. Split quality, inventory, assignment, and custody state.
4. Make `inventory` the operational stock source of truth and keep `components` as product lineage and quality source of truth.
5. Preserve complete donor-to-recipient and recipient-to-donor traceability.
6. Separate demo/test behavior from production behavior at code, migration, seed, and deployment levels.
7. Enforce role, facility, and high-risk action authorization in APIs, not only in UI.
8. Make audit evidence append-only and tamper-evident.
9. Store local clinical policy as versioned configuration with effective dates.
10. Validate with evidence: unit tests, API tests, unsafe-path tests, E2E SOP tests, UAT, IQ/OQ/PQ, and pilot acceptance.

## 3. Critical Gap To Remediation Map

| Gap | Risk | Required modification | Acceptance evidence |
| --- | --- | --- | --- |
| Free-text and duplicated blood unit status | Unsafe or inconsistent component/inventory state | Add multi-axis state model and command service; remove direct status writes | State graph tests, route tests, migration test, reconciliation report clean |
| RLS disabled and weak DB constraints | Cross-facility data leakage, invalid state persistence | Add enums, FK, CHECK, version columns, facility scope, RLS policies | DB migration tests, RLS tests, negative access tests |
| Production fallback/demo data paths | Missing tables or demo credentials may mask production failure | Disable fallback stores and demo login in production | Production config test and startup health check |
| RBAC optional flag | Unauthorized high-risk actions | Enforce API RBAC/ABAC by default in production | Role matrix tests and audit proof |
| Audit only application-level | Audit can be incomplete or mutable | Append-only audit table, hash chain, DB trigger restrictions | Tamper tests and audit export validation |
| Basic ISBT 128 validation only | Misidentified blood products or labels | Implement full ISBT 128 parser, product catalog versioning, scanner workflow | Barcode/check-character tests and label UAT |
| Basic FHIR adapter | HIS/LIS messages may be incomplete or invalid | Add validated mappings for Patient, ServiceRequest, Specimen, DiagnosticReport, BiologicallyDerivedProduct, SupplyDelivery, Procedure, AdverseEvent | FHIR validation tests and interface acceptance |
| Simulated or route-local cold chain | Excursion may not quarantine units reliably | Add device, container, trip, excursion, quarantine, CAPA model | Cold-chain excursion E2E tests |
| Weak dual verification | Same person or unauthenticated user may pass bedside check | Require two distinct authenticated users with roles and facility scope | Bedside verification negative tests |
| Offline workflow not production-grade | Stale or conflicting events can change stock | Emergency-only commands, encrypted outbox, signed events, idempotency, review queue | Offline conflict tests and reconciliation UAT |
| Incomplete validation pack | Cannot support regulated go-live | Build validation matrix, SOP E2E suite, traceability report | IQ/OQ/PQ, UAT, pilot sign-off |

## 4. Workstream A: Domain Model And State Commands

Priority: P0, blocks all production work.

Target files:

- `src/lib/stateMachine.ts`
- `src/server/services/bloodUnitCommands.ts`
- `src/types.ts`
- `app/api/v1/lims/**`
- `app/api/v1/orders/**`
- `app/api/v1/crossmatch/route.ts`
- `app/api/v1/issue/**`
- `app/api/v1/bedside-verify/route.ts`
- `app/api/v1/sync/push-events/route.ts`
- `app/api/v1/adverse-reactions/route.ts`

Implementation tasks:

1. Add canonical enums for `quality_status`, `inventory_status`, `assignment_status`, `custody_holder_type`, and `disposition_status`.
2. Add command types: `AuthorizeRelease`, `QuarantineUnit`, `DiscardReactiveUnit`, `ReserveUnit`, `PickUnit`, `DispatchUnit`, `ReceiveUnit`, `CrossmatchUnit`, `IssueUnit`, `ReturnUnit`, `RestockReturnedUnit`, `WasteUnit`, `TransfuseUnit`, `ReportReaction`, `QuarantineCoComponents`, `EmergencyIssueUnit`.
3. Move all status transitions into `bloodUnitCommands`.
4. Make each command require actor, role, facility, reason code, request id, device id, before version, and command context.
5. Remove route-local direct status updates or isolate them behind compatibility adapters.
6. Treat terminal states as irreversible unless a documented correction workflow exists.
7. Add state graph tests covering all allowed and denied transitions.

Acceptance criteria:

- No API route directly writes clinical status without calling a command.
- Unknown status values are rejected.
- `components` and `inventory` cannot disagree on operational state after any command.
- Every command writes an audit event with before/after state.

## 5. Workstream B: Database Production Hardening

Priority: P0, must run with Workstream A.

Target files:

- `supabase_schema.sql`
- new migration files under the repo's migration location once chosen
- `src/server/db.ts`
- `src/server/services/reconciliation.ts`

Implementation tasks:

1. Convert core status columns from `TEXT` to enums or constrained values.
2. Add missing FK constraints for donor, donation, lab test, component, inventory, order, patient, crossmatch, issue, transfusion, reaction, transport, and audit relationships.
3. Add `version`, `created_at`, `updated_at`, `created_by`, `updated_by`, `facility_id`, and `org_id` where required.
4. Add unique indexes for DIN, component id, inventory unit id, idempotency key, external message id, and audit hash.
5. Add transaction wrappers for multi-table lifecycle changes.
6. Enable RLS for production tables and add facility-scoped policies.
7. Disable fallback stores in production and make missing tables a hard startup failure.
8. Add reconciliation checks for orphan records, duplicate DINs, invalid statuses, missing versions, expired active units, custody mismatch, and component/inventory drift.

Acceptance criteria:

- Production startup fails if required schema objects are missing.
- DB rejects invalid status, duplicate identifiers, cross-facility access, and orphan clinical records.
- Reconciliation report is clean on seed and UAT datasets.

## 6. Workstream C: Authentication, Authorization, And Audit

Priority: P0.

Target files:

- `src/server/authPolicy.ts`
- `src/server/rbacPolicy.ts`
- `src/server/auditChain.ts`
- `app/api/v1/login/route.ts`
- `app/api/v1/audit-events/route.ts`
- all high-risk API routes

Implementation tasks:

1. Remove or hard-disable demo credentials in production.
2. Make API RBAC mandatory in production, not opt-in.
3. Add ABAC checks for facility, organization, custody holder, and assigned workflow role.
4. Require two distinct authenticated users for dual verification, release approval, emergency issue review, and selected audit corrections.
5. Add reason code and comment requirements for high-risk exceptions.
6. Make audit events append-only. Disallow update/delete through API and database policies.
7. Add hash-chain verification endpoint and scheduled integrity check.
8. Add audit export with filters for unit, patient, donor, actor, facility, SOP, event type, and date range.

Acceptance criteria:

- Unauthorized users cannot perform high-risk API actions even if they call the endpoint directly.
- Audit events cannot be edited or deleted through supported interfaces.
- Hash-chain verification detects tampering in tests.
- Every safety exception is tied to actor, reason, timestamp, device, and request id.

## 7. Workstream D: SOP1 To SOP10 Clinical Workflow Hardening

Priority: P0/P1.

Implementation tasks:

1. SOP1 donor and collection:
   - Version donor questionnaire rules.
   - Add hard stops for age, weight, deferral, incomplete consent, duplicate donor identity, and collection volume.
   - Store policy version used at decision time.

2. SOP2 testing and release:
   - Enforce no component release before authorized negative or cleared IDM result.
   - Add second review for reactive or discrepant results.
   - Link lab test instrument/result metadata where available.

3. SOP3 component preparation:
   - Add parent/child component traceability.
   - Prevent component creation from uncollected, rejected, reactive, or expired donation records.

4. SOP4 inventory and allocation:
   - Remove synthetic/mock inventory from production paths.
   - Enforce FEFO, product type, ABO/Rh, reservation version, and facility stock ownership.

5. SOP5 dispatch and cold chain:
   - Add shipment/container/device model.
   - Require temperature evidence at dispatch and receipt.
   - Quarantine units on unresolved excursion.

6. SOP6 bedside verification:
   - Require patient wristband scan, unit scan, two distinct users, and valid crossmatch/emergency policy.
   - Record transfusion start/end and vital sign observation windows.

7. SOP7 crossmatch:
   - Enforce specimen age policy, antibody history, method suitability, ABO/Rh compatibility, and patient identity.
   - Block electronic or immediate-spin crossmatch when antibody history requires AHG or full crossmatch.

8. SOP8 issue, return, and waste:
   - Enforce 30-minute rule, visual inspection, cold-chain status, custody chain, and final disposition.
   - Require waste reason codes and supervisor review for selected waste types.

9. SOP9 haemovigilance and lookback:
   - Classify reaction severity and imputability.
   - Trigger co-component quarantine only for configured severity/imputability rules.
   - Support donor-to-recipient and recipient-to-donor lookback.

10. SOP10 emergency/MTP:
    - Require emergency indication, approver, patient category policy, ABO/Rh choice policy, and post-event review SLA.
    - Separate emergency issue from ordinary incompatible issue.

Acceptance criteria:

- Each SOP has happy-path tests and unsafe-path tests.
- Each exception path creates audit and alert evidence.
- SOP ownership and policy versions are visible in admin configuration.

## 8. Workstream E: ISBT 128, Labeling, And Traceability

Priority: P1.

Implementation tasks:

1. Implement full ISBT 128 parser service for DIN, facility identifier, product code, collection date, expiration, ABO/Rh, special testing, and check character where applicable.
2. Add product catalog versioning with effective dates.
3. Add scanner workflow tests for wrong unit, wrong patient, duplicate scan, expired label, and unknown product code.
4. Require label parsing before release, dispatch, receipt, issue, return, and bedside verification.
5. Add traceability report from donor to donation, components, transport, inventory, patient, transfusion, reaction, and final disposition.

Acceptance criteria:

- Invalid label data is rejected before clinical state changes.
- Traceability report can answer "where did this unit go" and "which units did this patient receive".

## 9. Workstream F: Interoperability With HIS, LIS, And FHIR

Priority: P1/P2.

Target files:

- `src/lib/FhirAdapter.ts`
- `app/api/v1/fhir/route.ts`
- new message validation services

Implementation tasks:

1. Expand FHIR resources to Patient, ServiceRequest, Specimen, DiagnosticReport, BiologicallyDerivedProduct, SupplyDelivery, Procedure, and AdverseEvent.
2. Add message versioning, schema validation, and external id mapping.
3. Add inbound HIS order validation and outbound transfusion/reaction reporting.
4. Add LIS result import with instrument/source metadata and authorization workflow.
5. Add idempotency and duplicate message protection for external messages.

Acceptance criteria:

- Invalid external messages fail safely and create audit evidence.
- Interfaces can be replayed without duplicating clinical actions.
- UAT includes at least one HIS order flow, LIS result flow, and transfusion result flow.

## 10. Workstream G: Offline, Reconciliation, And Resilience

Priority: P1.

Target files:

- `src/lib/offline/**`
- `src/server/services/offlineSync.ts`
- `app/api/v1/sync/**`
- `app/api/v1/reconciliation/**`

Implementation tasks:

1. Restrict offline actions to approved emergency commands.
2. Add local data minimization, encryption assumptions, device identity, and retention/clear policy.
3. Sign offline events or attach a verifiable device/session proof.
4. Enforce server-side idempotency and version conflict checks.
5. Send stale, conflicting, or non-emergency offline events to `NeedsReview`, never auto-accept.
6. Add manual review UI and audit trail for offline reconciliation.
7. Add startup and scheduled reconciliation jobs for inventory, custody, issue, transfusion, expiry, and reaction data.

Acceptance criteria:

- Offline events cannot bypass ordinary safety gates.
- Duplicate events are idempotent.
- Conflicts never silently overwrite server state.

## 11. Workstream H: Validation, Quality, And Deployment Readiness

Priority: P0 through go-live.

Implementation tasks:

1. Build a requirements traceability matrix linking regulation/SOP/policy to code, tests, and evidence.
2. Add unit tests for validators, state graph, ISBT parser, RBAC, audit chain, and FHIR mappings.
3. Add API tests for all high-risk command endpoints.
4. Add E2E tests for SOP1-SOP10 happy paths and major unsafe paths.
5. Add data migration tests using realistic anonymized datasets.
6. Produce IQ/OQ/PQ protocol and execution evidence.
7. Produce UAT scripts for donor center, blood center, hub, hospital blood bank, ward/bedside, QA, and admin roles.
8. Add runbooks for backup/restore, incident response, downtime/offline mode, audit export, account recovery, and release rollback.
9. Add monitoring for failed commands, rejected safety events, cold-chain excursions, audit-chain failure, sync backlog, and inventory drift.

Acceptance criteria:

- Validation report identifies no unresolved P0 or P1 safety gaps.
- Pilot users complete UAT without open blocking defects.
- Backup/restore and incident drills are executed and recorded.
- Go-live checklist is signed by clinical, quality, regulatory, security, and operations owners.

## 12. Recommended Sequence

1. Freeze production behavior boundaries.
   - Disable production fallback paths.
   - Confirm environment separation.
   - Define policy owners and sign-off flow.

2. Implement Workstream A and B together.
   - Multi-axis state model.
   - DB constraints and migrations.
   - Command service.
   - Component/inventory synchronization.

3. Implement Workstream C.
   - Mandatory API authorization.
   - Immutable audit.
   - Dual-user verification.

4. Harden SOP1-SOP10 in Workstream D.
   - Prioritize release, crossmatch, issue, return, bedside verification, adverse reaction, and emergency issue first.

5. Add ISBT 128 and traceability in Workstream E.

6. Add offline and reconciliation controls in Workstream G.

7. Expand interoperability in Workstream F.

8. Execute Workstream H continuously, then complete formal UAT, IQ/OQ/PQ, and pilot acceptance.

## 13. Release Gates

### Gate 1: Engineering Safety Gate

Required before any clinical pilot:

- No production demo login or fallback stores.
- API RBAC/ABAC enforced.
- Multi-axis state model implemented for release, inventory, crossmatch, issue, return, transfusion, waste, and reaction workflows.
- DB rejects invalid statuses and orphan records.
- Audit append-only and hash-chain verification pass.
- P0 tests pass.

### Gate 2: Clinical Workflow Gate

Required before shadow pilot:

- SOP1-SOP10 UAT scripts drafted and approved.
- Crossmatch, issue, bedside verification, adverse reaction, and emergency workflows pass UAT.
- ISBT 128 scanner workflow passes UAT.
- Cold-chain excursion workflow quarantines affected units.
- Offline conflict workflow sends unsafe events to review.

### Gate 3: Regulatory And Quality Gate

Required before authoritative go-live:

- Local Vietnam legal/regulatory mapping completed.
- Policy decisions documented with effective dates.
- IQ/OQ/PQ executed.
- Training completed for all roles.
- Backup/restore and incident response drills completed.
- Clinical, quality, security, operations, and regulatory owners sign off.

## 14. Priority Backlog

### P0: Must Fix Before Clinical Pilot

- Production fallback/demo credential removal.
- Mandatory API RBAC/ABAC.
- Multi-axis state and command service.
- DB constraints, RLS, versioning, and transaction safety.
- Immutable audit.
- No release before IDM clearance.
- No issue before valid crossmatch or documented emergency release.
- Bedside two-user verification.
- Component/inventory consistency.
- High-risk SOP unsafe-path tests.

### P1: Must Fix Before Shadow Pilot Or Controlled Limited Pilot

- Full ISBT 128 scanner workflow.
- Cold-chain device/trip/excursion workflow.
- Offline emergency-only sync with review queue.
- Reconciliation dashboard and manual resolution.
- Haemovigilance severity/imputability policy.
- Donor-to-recipient and recipient-to-donor traceability report.

### P2: Must Fix Before Broad Deployment

- Full HIS/LIS/FHIR validation.
- Advanced alerting and escalation.
- Audit export package.
- Operations runbooks and monitoring.
- Performance, backup, restore, and disaster recovery tests.

## 15. Definition Of Done

A work item is complete only when all are true:

1. Clinical rule is implemented server-side.
2. Database cannot persist invalid critical state.
3. API route has positive and negative tests.
4. High-risk action creates audit evidence.
5. Unauthorized role/facility tests fail closed.
6. UI reflects the same rule and does not offer unsafe actions.
7. Reconciliation detects or prevents drift.
8. Documentation and UAT script are updated.

## 16. Final Go-Live Position

VN-BECS-V2 should move through demo, UAT, shadow pilot, and controlled pilot in sequence. Direct clinical go-live is acceptable only after Gate 1, Gate 2, and Gate 3 are all complete and signed off. Until then, the system can support training, workflow simulation, and non-authoritative parallel validation, but it should not be the sole source of truth for real blood release, issue, transfusion, or haemovigilance decisions.
