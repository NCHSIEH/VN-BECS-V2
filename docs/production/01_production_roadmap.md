# VN-BECS-V2 Production Roadmap

Goal: evolve VN-BECS-V2 from a pilot/demo application into a production-ready Vietnam blood supply chain and hospital transfusion workflow platform.

Ground rules:

- Work only on the `codex-optimize` branch unless explicitly instructed otherwise.
- Do not switch to `main`, merge, reset, or modify `.env`, credentials, production database, or deployment settings.
- Explain intended file changes before every modification.
- Keep demo/test behavior clearly separated from production behavior.

## Stage 0 - Vietnam Readiness And Policy Gap

Objective: document the regulatory, SOP, and policy gaps that affect production use in Vietnam.

Deliverables:

- Production readiness gap checklist.
- Policy decision log.
- Configurable policy parameters for unresolved clinical choices.

Likely files:

- `docs/production/00_vietnam_readiness_gap.md`
- Future: `src/config/clinicalPolicy.ts` or equivalent, only after implementation begins.

Acceptance:

- Open decisions are explicit and not hidden in code.
- Engineering can continue by using configurable defaults.

Antigravity prompt:

```text
Review VN-BECS-V2 for Vietnam production readiness. Create or update the regulatory/SOP gap checklist covering blood collection, IDM testing, component release, cold chain, emergency release, transfusion verification, haemovigilance, privacy, and audit retention. Do not modify .env, credentials, deployment, or production DB settings.
```

## Stage 1 - Domain Model And Blood Unit State Machine

Objective: establish one production-grade domain model for blood components, inventory, custody, assignment, and disposition.

Deliverables:

- Single source of truth for statuses.
- Domain commands for all high-risk state changes.
- Guard checks for IDM, expiry, cold chain, crossmatch, issue, return, and emergency release.
- Transition tests.

Likely files:

- `src/types.ts`
- `src/lib/stateMachine.ts`
- New domain files under `src/domain/bloodUnit/`
- `app/api/v1/**/route.ts`
- `src/__tests__/**`

Acceptance:

- No API directly writes arbitrary blood unit status.
- Invalid SOP transitions fail with structured errors.
- Status terms are consistent across type definitions, schema, API, and UI.

Antigravity prompt:

```text
Refactor VN-BECS-V2 blood unit lifecycle into a production-grade domain state machine. Unify status vocabularies across types, API routes, components, inventory, and tests. All status changes must go through validated domain commands with guards and audit hooks.
```

## Stage 2 - Database Production Hardening

Objective: make persistence enforce domain invariants instead of accepting free-text pilot data.

Deliverables:

- Controlled enum/check constraints.
- Foreign keys for donor, donation, component, inventory, order, issue, transfusion, and adverse reaction records.
- `version`, `created_at`, `updated_at`, and facility scope columns where needed.
- Migration strategy separating demo seed from production migration.

Likely files:

- `supabase_schema.sql`
- Repository files under `src/server/repositories/`
- `src/server/db.ts`
- Migration/seed scripts if introduced.

Acceptance:

- Database blocks impossible statuses and orphan records.
- High-risk updates use transaction semantics or optimistic locking.
- Demo fallback cannot silently replace production data access.

Antigravity prompt:

```text
Upgrade VN-BECS-V2 Supabase/PostgreSQL schema for production use. Add constraints, enums, foreign keys, version columns, updated_at fields, and RLS-ready facility scoping. Separate demo seed data from production migrations.
```

## Stage 3 - Authentication, Authorization, And Immutable Audit

Objective: enforce production-grade user accountability and tamper-evident audit records.

Deliverables:

- Remove hardcoded demo/emergency login paths from production mode.
- API-level RBAC/ABAC middleware.
- Facility-scoped access rules.
- Append-only audit events with hash chain, before/after hashes, reason code, request id, device id, and actor id.

Likely files:

- `app/api/v1/login/route.ts`
- `src/server/crypto.ts`
- New API middleware under `src/server/auth/` or `src/server/security/`
- `app/api/v1/audit-events/route.ts`
- `src/types.ts`
- `supabase_schema.sql`

Acceptance:

- UI role checks are not the only security control.
- Every high-risk command has audit evidence.
- Audit update/delete is blocked by repository and database design.

Antigravity prompt:

```text
Implement production-grade authentication, authorization, and immutable audit trail in VN-BECS-V2. Remove hardcoded emergency/demo login paths from production mode, add API-level role and facility checks, and make audit events append-only with hash chaining.
```

## Stage 4 - SOP1 To SOP10 Workflow Hardening

Objective: make every SOP step enforce clinical hard stops and exception handling.

Deliverables:

- SOP1 donor/collection checks.
- SOP2 IDM authorization and reactive quarantine/discard.
- SOP3 component preparation and parent/child traceability.
- SOP4 allocation without synthetic inventory.
- SOP5 cold-chain receipt and excursion workflow.
- SOP6 bedside patient/unit verification and transfusion completion.
- SOP7 crossmatch and specimen validity.
- SOP8 issue/return/waste rules.
- SOP9 haemovigilance, co-component quarantine, and lookback.
- SOP10 hospital ordering, MTP, and emergency release.

Likely files:

- `app/api/v1/lims/**`
- `app/api/v1/orders/**`
- `app/api/v1/crossmatch/route.ts`
- `app/api/v1/issue/**`
- `app/api/v1/bedside-verify/route.ts`
- `app/api/v1/adverse-reactions/route.ts`
- Front-end workflow components that surface new errors/states.

Acceptance:

- Clinical hard stops cannot be bypassed by route-specific status updates.
- Exception flows create audit and alert events.
- All SOP1-10 happy paths and major unsafe paths are tested.

Antigravity prompt:

```text
Harden SOP1-SOP10 workflows in VN-BECS-V2. Enforce clinical hard stops for IDM release, component processing, inventory allocation, cold chain, crossmatch, issue/return, bedside verification, transfusion completion, and adverse reaction lookback.
```

## Stage 5 - Offline Sync And Data Consistency

Objective: make offline emergency workflows safe, limited, idempotent, and reviewable.

Deliverables:

- Server-side idempotency key store.
- Sync event log.
- Facility/device checkpoint model.
- Conflict detection and manual reconciliation queue.
- Emergency-only offline commands.
- Client local storage privacy rules.

Likely files:

- `src/lib/offline/**`
- `src/lib/offlineStore.ts`
- `app/api/v1/sync/**`
- New repository/schema support for sync events and idempotency keys.

Acceptance:

- Replayed events do not duplicate inventory updates.
- Stale base versions go to review, not silent overwrite.
- Offline actions are auditable and reconciled.

Antigravity prompt:

```text
Make VN-BECS-V2 offline sync production-safe. Implement server-side idempotency, conflict detection, reconciliation queue, encrypted local outbox assumptions, retry policy, and emergency-only offline command restrictions.
```

## Stage 6 - Interoperability

Objective: support standard exchange with HIS, LIS, national reporting, and cold-chain devices.

Deliverables:

- ISBT 128 parser and product catalog versioning.
- FHIR R4 mappings and validation.
- LIS/HIS boundary contracts.
- Cold-chain telemetry ingestion contract.
- Haemovigilance export model.

Likely files:

- `src/lib/FhirAdapter.ts`
- `src/lib/validators.ts`
- `src/lib/reportingService.ts`
- `app/api/v1/fhir/route.ts`
- Catalog APIs and docs.

Acceptance:

- Blood product can map to FHIR BiologicallyDerivedProduct.
- Orders, specimens, lab results, procedures, and adverse events have stable mapping contracts.
- Invalid external messages fail safely with audit evidence.

Antigravity prompt:

```text
Expand VN-BECS-V2 interoperability. Implement FHIR R4 mappings for Patient, ServiceRequest, Specimen, DiagnosticReport, BiologicallyDerivedProduct, SupplyDelivery, Procedure, and AdverseEvent. Strengthen ISBT 128 parsing and product catalog versioning.
```

## Stage 7 - Test And Validation Evidence

Objective: create evidence that the system behaves safely and consistently.

Deliverables:

- State transition matrix tests.
- API integration tests.
- RBAC/ABAC tests.
- Audit immutability tests.
- Offline conflict/idempotency tests.
- SOP1-10 E2E tests.
- Validation report / test coverage gap report.

Likely files:

- `src/__tests__/**`
- `*.spec.ts`
- `vitest.config.ts`
- `playwright.config.ts`
- `docs/production/validation_report.md`

Acceptance:

- Critical safety rules have automated tests.
- Known test gaps are documented.
- Pilot UAT scenarios are reproducible.

Antigravity prompt:

```text
Build a production validation test suite for VN-BECS-V2. Add unit, API, state-machine, offline conflict, RBAC, audit immutability, and SOP1-SOP10 end-to-end tests. Produce a test coverage gap report.
```

## Stage 8 - Deployment, Operations, And Pilot Rollout

Objective: prepare the system for controlled pilot operation.

Deliverables:

- Environment separation plan.
- Monitoring and alerting runbook.
- Backup/restore drill.
- Incident response runbook.
- Release control checklist.
- Operator training checklist.
- Pilot acceptance checklist.

Likely files:

- `docs/production/operations_runbook.md`
- `docs/production/pilot_acceptance.md`
- Deployment docs only after explicit approval.

Acceptance:

- Pilot operators know normal and exception workflows.
- Backup/restore and rollback are documented.
- Production deployment settings are not changed without explicit approval.

Antigravity prompt:

```text
Prepare VN-BECS-V2 for pilot deployment operations. Create production readiness runbooks for environments, monitoring, backup/restore, release control, incident response, audit export, training, and pilot acceptance.
```

## Recommended Execution Order

1. Finish Stage 0 documentation and policy backlog.
2. Implement Stage 1 before touching broad UI flows.
3. Implement Stage 2 and Stage 3 together enough to support audit-safe state transitions.
4. Harden SOP workflows in Stage 4.
5. Add offline consistency in Stage 5.
6. Add interoperability in Stage 6.
7. Expand validation in Stage 7 continuously, not only at the end.
8. Prepare Stage 8 before real pilot deployment.
