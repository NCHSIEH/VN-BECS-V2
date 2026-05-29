# VN-BECS-V2 Vietnam Production Readiness Gap

Purpose: track the gap between the current VN-BECS-V2 pilot/demo implementation and a production-ready blood establishment / hospital transfusion workflow system for Vietnam.

This document is intentionally implementation-facing. Items marked "Needs policy decision" should be confirmed by Vietnam blood authorities, the pilot blood center, and participating hospitals before production launch. Engineering can still proceed by making these items configurable and audit-visible.

## Scope

VN-BECS-V2 is expected to support:

- Donor registration, questionnaire, deferral, collection, laboratory testing, component preparation, release, inventory, and lookback.
- Hospital ordering, dispatch, allocation, picking, cold-chain logistics, delivery, and receipt.
- Crossmatch, issue, return, bedside verification, transfusion completion, adverse reaction reporting, and haemovigilance.
- Offline emergency workflows with later reconciliation.
- MDM, IAM, audit trail, reporting, ISBT 128, and HL7 FHIR interoperability.

## Reference Baseline

Use these as design anchors while local Vietnam requirements are confirmed:

- ISBT 128 / ICCBBA for donation identification, product coding, labeling, and traceability.
- HL7 FHIR R4 for interoperability, especially Patient, ServiceRequest, Specimen, DiagnosticReport, BiologicallyDerivedProduct, SupplyDelivery, Procedure, and AdverseEvent.
- WHO blood safety and haemovigilance guidance for end-to-end transfusion chain monitoring.
- ISBT/IHN/AABB haemovigilance definitions for adverse events and reactions.
- EDQM Blood Guide / Good Practice Guidelines as a quality-system reference.
- ISO 15189 for medical laboratory quality and competence.
- ISO 27799 / ISO 27001-aligned controls for healthcare information security.
- 21 CFR 606 and 21 CFR Part 11 as optional engineering references for traceability, records, authority checks, audit trails, and electronic records.

## Current System Snapshot

Observed from current code and docs:

- Next.js API routes with React front-end.
- Supabase/PostgreSQL schema, but many statuses are free-text and RLS is disabled in the pilot schema.
- In-memory fallback stores are used when Supabase tables are missing or empty.
- Blood unit state machine exists in `src/lib/stateMachine.ts`, but many API routes directly update status strings.
- Offline sync has IndexedDB/Dexie and outbox pieces, but server-side idempotency/conflict handling is still shallow.
- Audit event creation exists, but append-only database enforcement, hash chaining, before/after state, and actor identity are incomplete.
- Role matrix exists in front-end/domain types, but API-level authorization is not yet consistently enforced.

## Readiness Gap Checklist

| Area | Current risk | Production expectation | Decision / action |
| --- | --- | --- | --- |
| Vietnam legal basis | Not documented in repo | Identify applicable Vietnam blood, health data, cybersecurity, and medical record rules | Needs policy decision |
| Facility model | Organizations exist but access isolation is incomplete | Facility-scoped users, devices, inventory, orders, and reports | Implement ABAC/RLS |
| SOP ownership | SOP1-10 are documented but not enforced uniformly | Every SOP step maps to command, guard, audit, and exception path | Implement domain commands |
| Status vocabulary | Multiple status values across types, DB, API, and UI | Single controlled vocabulary or multi-axis status model | High priority |
| Blood unit traceability | Donor/donation/component/inventory split is inconsistent | Forward/backward traceability from donor to recipient and disposition | High priority |
| ISBT 128 | Basic DIN validation and sample codes | Licensed/approved facility identifiers, product catalog, check character, label parser | Needs policy decision |
| IDM release | Some routes can create AVAILABLE directly | No release before authorized negative/cleared testing | Hard stop |
| Component processing | Processing can bypass quarantine sequence | Component preparation records with parent/child links, dates, staff, reagents/lots | High priority |
| Inventory allocation | Can generate mock units when shortage occurs | Never synthesize real inventory; shortage becomes exception/escalation | Remove in production |
| Crossmatch | ABO/Rh and antibody checks exist but are route-local | Crossmatch validity, specimen age, antibody history, method rules, emergency release controls | Hard stop |
| Issue/return | Some issue flows accept AVAILABLE/RELEASED directly | Issue requires assignment, compatibility or emergency waiver, and authority checks | Hard stop |
| Bedside verification | Records transfusion but does not consistently transition unit | Two-person/device checks, patient/unit/order match, transfusion started/completed states | High priority |
| Cold chain | Telemetry simulated and route-local | Validated devices, excursion thresholds, quarantine/waste workflow, CAPA | Needs policy decision |
| MTP/emergency | Break-glass exists conceptually | Explicit emergency policy by patient type, RhD choice, approver, expiry, review SLA | Needs policy decision |
| Offline mode | Client outbox exists; server conflict handling incomplete | Emergency-only offline commands, encryption, signatures, idempotency, review queue | High priority |
| Audit trail | Insert-only by convention, no DB enforcement | Append-only, hash chain, before/after, actor, device, request id, reason code | High priority |
| Authentication | Demo fallbacks exist | Production auth only, password policy/MFA options, session expiry | High priority |
| Authorization | UI role routing exists | API-level RBAC/ABAC with facility scope and dual review | High priority |
| Data privacy | Patient cache exists offline | Minimum necessary data, masking, local retention/clear policy, device loss process | Needs policy decision |
| FHIR/HIS/LIS | Adapter is basic | Versioned mappings and validation for core resources | Medium priority |
| Alerts/CAPA | Alert service is in-memory | Persistent alert lifecycle, owner, acknowledgement, resolution, CAPA | Medium priority |
| Testing | Unit tests and a few Playwright tests | State graph, API, RBAC, audit immutability, offline conflict, SOP1-10 E2E | High priority |
| Deployment | Local/demo assumptions remain | Separate demo/test/prod config, migrations, backups, monitoring, runbooks | Later stage |

## Policy Decisions Required

These should be decided before pilot go-live, but can be modeled as configuration now:

1. Emergency release policy for unknown blood type.
2. O RhD negative versus O RhD positive fallback rules by patient age/sex/clinical context.
3. MTP activation authority and stop criteria.
4. Acceptable cold-chain excursion thresholds by product class.
5. Return-to-stock policy for red cells, plasma, and platelets.
6. Required crossmatch method by antibody history and specimen age.
7. Product discard/quarantine definitions and approval roles.
8. Donor deferral rules and follow-up requirements.
9. Haemovigilance reporting categories, severity, imputability, and national reporting format.
10. Audit retention period and export requirements.
11. Offline mode allowed operations, maximum duration, and reconciliation SLA.
12. Minimum training and e-signature requirements for high-risk actions.

## Engineering Start Criteria

Proceed to code changes when these are true:

- The current branch is `codex-optimize`.
- `.env`, credentials, production DB, and deployment settings remain untouched.
- Production-only behavior is separated from demo fallback behavior.
- Every high-risk change has tests or an explicit test gap.

## Stage 0 Completion Criteria

Stage 0 is complete when:

- This gap list is reviewed by project owner.
- Unknown clinical/regulatory items are logged as policy decisions.
- Stage 1 implementation can proceed without hard-coding unresolved clinical policy.
- Antigravity or another agent can pick up the roadmap and start implementation from the same branch.
