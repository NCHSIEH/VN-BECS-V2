# DB Migration Work Package — Facility Scope, Multi-Axis State, Audit Immutability

Closes the database-dependent RTM gaps that cannot be satisfied by application
code alone: **RTM-AUTH-03** (facility-scoped RLS), **RTM-STATE-04** (multi-axis
state persisted in DB), and **RTM-AUD-01** (DB-enforced audit immutability with
a proving test). Also persists the DON-03 / EMG-01 governance columns.

> Status: migration + negative tests authored. **Requires a reachable Postgres
> test database to execute and attach evidence.** Until executed and signed off,
> the three RTM items remain 🔴/🟠.

## Artifacts

| File | Purpose |
| --- | --- |
| [`db-migrations/001_facility_scope_and_constraints.sql`](db-migrations/001_facility_scope_and_constraints.sql) | The migration (idempotent, transactional) |
| [`db-migrations/001_tests.sql`](db-migrations/001_tests.sql) | Negative/acceptance SQL tests (fail-closed proof) |

## What the migration does

1. **Multi-axis state (STATE-04)** — adds `blood_quality_status`,
   `blood_inventory_status`, `blood_assignment_status` enums and columns to
   `components` and `inventory`, and backfills them from the legacy `status`
   using the same map as `src/lib/stateMachine.ts` (`LEGACY_STATUS_TO_STATE`).
2. **Facility scope (AUTH-03)** — adds `facility_id` to all clinical tables,
   backfills from existing hints (`patients.hospitalId`, `inventory.location`).
3. **Optimistic-lock / governance columns** — `version` on orders/crossmatch/
   issue_records; `questionnaires.policyVersion`; `mtp_cases.emergencyReviewDueAt`
   and `emergencyPolicyVersion`.
4. **Foreign keys** — crossmatch/issue → patients referential integrity.
5. **RLS facility policies (AUTH-03)** — enables RLS on the 8 clinical tables
   with a `facility_scope` policy keyed off two GUCs the app must set per
   request: `app.facility_id` and `app.role` (Admin bypasses).

## How to run (test DB)

```bash
# 1. Apply base schema then this migration to a TEST database
psql "$TEST_DATABASE_URL" -f supabase_schema.sql
psql "$TEST_DATABASE_URL" -f docs/production/db-migrations/001_facility_scope_and_constraints.sql

# 2. Run the negative/acceptance tests as a NON-BYPASSRLS role
psql "$TEST_DATABASE_URL" -f docs/production/db-migrations/001_tests.sql
```

All five test blocks must print their `PASSED` / expected-row notices.

## CRITICAL deployment note (Supabase)

Supabase's `service_role` key **bypasses RLS**. The Next API currently uses a
single Supabase client. For facility RLS to actually take effect in production
you must do ONE of:

- switch high-risk reads/writes to a **user-scoped JWT** (anon key + signed-in
  user) so RLS applies, and map the user's facility into a JWT claim; or
- run those queries through a **dedicated DB role without `BYPASSRLS`** and set
  `app.facility_id` / `app.role` via `set_config(...)` at the start of each
  request (wire into `src/server/db.ts`).

The application-level `authorizeFacilityScope()` (already shipped in
`src/server/rbacPolicy.ts`) is the defence-in-depth layer; this migration adds
the database-enforced layer. Both should be on for production.

## Acceptance evidence to capture (for Gate 1 sign-off)

- [ ] `001_tests.sql` output showing TEST 1–5 all PASSED.
- [ ] Screenshot/log of an `UPDATE audit_events` failing (AUD-01).
- [ ] Cross-facility `SELECT` returning 0 rows under a scoped GUC (AUTH-03).
- [ ] `components` multi-axis backfill query returning 0 unmapped rows (STATE-04).
- [ ] Reconciliation report clean after migration on the UAT dataset.

## Follow-up (not in this package)

- Switch `executeBloodUnitTransition` to write the multi-axis columns directly
  and wrap component+inventory+audit in a single SQL transaction (completes
  RTM-STATE-03 true atomicity).
- Replace the legacy single `status` column once all readers use multi-axis.
- Set `app.facility_id` / `app.role` GUCs in the DB access layer.
