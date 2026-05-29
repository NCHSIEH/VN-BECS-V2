# Antigravity Review Feedback: Implementation Plan Not Complete

Date: 2026-05-29
Reviewer: Codex
Subject: Review of `docs/production/CODEX_HANDOFF.md` against `docs/production/04_system_modification_implementation_plan.md`

## Executive Correction

`docs/production/CODEX_HANDOFF.md` claims that all core workstreams from `04_system_modification_implementation_plan.md` are fully completed and that Gate 1 / P0 safety work is complete.

That claim is not supported by the codebase.

What is true:

- `npm test` passes: 27 files, 145 tests.
- `npm run build` passes.
- RBAC is forced on when `NODE_ENV === 'production'`.
- Some production fallback and disclaimer tests were added.

What is not true:

- Gate 1 is not complete.
- P0 production hardening is not complete.
- The system is not production-ready for live clinical blood bank use.
- The implementation plan has not been fully completed.

Do not repeat or preserve the "fully completed" / "production-ready clinical system" claim until the release gates in `04_system_modification_implementation_plan.md` are actually satisfied.

## Blocking Findings

### 1. Database production hardening is incomplete

Evidence:

- `supabase_schema.sql` still contains multiple `status TEXT` columns.
- `supabase_schema.sql` still disables RLS on core clinical tables.
- No complete enum/check-constraint/RLS policy migration was implemented.

Relevant examples:

- `supabase_schema.sql`: `components.status TEXT`
- `supabase_schema.sql`: `inventory.status TEXT`
- `supabase_schema.sql`: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`

Required fix:

1. Add production migrations for canonical status constraints.
2. Enable RLS for production tables.
3. Add facility-scoped RLS policies.
4. Add DB tests proving invalid status, orphan data, and cross-facility access fail closed.

### 2. Production fallback/demo overrides still exist

Evidence:

- `src/server/authPolicy.ts` still allows `VN_BECS_ALLOW_DEMO_LOGIN=true`.
- `src/server/db.ts` still allows `VN_BECS_ALLOW_FALLBACK=true`.

Required fix:

1. Remove production override paths or make them impossible when `NODE_ENV === 'production'`.
2. Add tests proving production mode rejects demo login and fallback even when override env vars are set.

### 3. High-risk state changes still bypass centralized command execution

Evidence:

`executeBloodUnitTransition` exists, but many API routes still call direct persistence methods after only evaluating the transition.

Examples include:

- `app/api/v1/lims/components/[id]/release/route.ts`
- `app/api/v1/crossmatch/route.ts`
- `app/api/v1/issue/route.ts`
- `app/api/v1/issue/[id]/return/route.ts`
- `app/api/v1/bedside-verify/route.ts`
- `app/api/v1/adverse-reactions/route.ts`
- `app/api/v1/mtp-cases/[id]/issue/route.ts`
- `app/api/v1/orders/[id]/[action]/route.ts`
- `app/api/v1/inventory/route.ts`
- `app/api/v1/sync/push-events/route.ts`

Required fix:

1. Route every high-risk blood unit state mutation through a single command execution path.
2. Make the command path responsible for validation, component update, inventory update, optimistic locking, audit evidence, and error handling.
3. Strengthen `h1DirectWrites` or add a new regression test so route-level `db.components.updateStatus` and clinical `db.inventory.create` status writes are rejected outside approved command/data-layer files.

### 4. Dual bedside verification is still weak

Evidence:

`app/api/v1/bedside-verify/route.ts` treats dual verification as true when `verifier1` and `verifier2Pin` are present.

Required fix:

1. Require two distinct authenticated users.
2. Verify both users have allowed roles and facility/custody scope.
3. Store both verifier ids in audit evidence.
4. Add negative tests for same-user verification, missing second authenticated actor, and unauthorized verifier role.

### 5. Audit is not yet DB-immutable

Evidence:

- Application-level hash-chain code exists.
- The schema does not yet enforce append-only audit behavior with DB policies/triggers.
- RLS is disabled for `audit_events`.

Required fix:

1. Add DB-level append-only restrictions.
2. Enable RLS or equivalent access control for audit events.
3. Add tamper tests proving update/delete fail.

### 6. FHIR and ISBT 128 workstreams are not complete

Evidence:

- `src/lib/FhirAdapter.ts` still maps only `Patient` and `BiologicallyDerivedProduct`.
- Full ServiceRequest, Specimen, DiagnosticReport, SupplyDelivery, Procedure, and AdverseEvent mapping is not implemented.
- ISBT 128 validation remains basic and is not a complete parser/label workflow.

Required fix:

These are P1/P2 after Gate 1, but they must not be described as complete.

## Required Next Work Order

Start with Gate 1 / P0 again. Do not move to P1/P2 until Gate 1 is genuinely complete.

1. Correct the handoff claim.
   - Update `docs/production/CODEX_HANDOFF.md` to say Gate 1 is partially complete, not fully complete.

2. Close production override gaps.
   - Production must reject demo login and fallback stores even if override env vars are set.

3. Eliminate route-level high-risk direct status writes.
   - Use `executeBloodUnitTransition` or a stronger replacement command service.
   - Add regression tests that scan for forbidden direct writes in API routes.

4. Start DB hardening for real.
   - Add migrations/constraints/RLS policies.
   - Stop relying only on TypeScript-level checks.

5. Strengthen bedside dual verification.
   - Require two distinct authenticated and authorized users.

6. Update tests and documentation.
   - Run focused tests first.
   - Run full `npm test`.
   - Run `npm run build`.
   - Update `CODEX_OPTIMIZATION_CHECKPOINT.md`.

## Acceptance Criteria For The Next Handoff

The next handoff may claim Gate 1 complete only if all of these are true:

1. No production demo login or fallback override remains.
2. API RBAC/ABAC is enforced with role and facility/custody scope for high-risk actions.
3. All high-risk blood unit state writes go through the command service.
4. DB schema no longer uses unconstrained clinical `status TEXT` for core lifecycle state.
5. RLS or equivalent facility-scoped data protection is enabled for production tables.
6. Audit events are append-only at the database/policy level.
7. Bedside dual verification requires two distinct authenticated authorized actors.
8. Focused negative tests and full test/build pass.

Until those are proven, the correct status is:

`Gate 1 / P0: partially complete, not production-ready, demo/UAT/shadow-pilot only.`

## Prompt For Antigravity

Use this prompt:

```text
Your previous CODEX_HANDOFF.md overclaimed completion. Read docs/production/ANTIGRAVITY_REVIEW_FEEDBACK.md and docs/production/04_system_modification_implementation_plan.md first. Treat Gate 1 / P0 as partially complete, not done. Start by correcting CODEX_HANDOFF.md, then close the P0 gaps: remove production demo/fallback overrides, eliminate direct route-level blood unit status writes by routing mutations through the command service, add regression tests for forbidden direct writes, strengthen bedside dual verification to require two distinct authenticated authorized users, and begin real DB hardening with constraints/RLS/migration evidence. Do not claim production-ready status. Run focused tests, then npm test and npm run build, and update CODEX_OPTIMIZATION_CHECKPOINT.md with exact completed items and remaining blockers.
```
