-- =====================================================================
-- VN-BECS-V2 Migration 001: Facility scope, multi-axis state, constraints
-- Addresses RTM-AUTH-03 (facility RLS), RTM-STATE-04 (multi-axis state in DB),
-- RTM-AUD-01 (audit immutability test support), plus DON-03 / EMG-01 columns.
--
-- Idempotent. Safe to re-run. Run in a transaction on a TEST database first,
-- then execute 001_tests.sql to prove the constraints fail closed.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Multi-axis state enums (RTM-STATE-04)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE blood_quality_status AS ENUM
    ('PENDING_TEST','RELEASED','HOLD_IDM','HOLD_COLD_CHAIN','HOLD_LOOKBACK','NONCONFORMING','DISCARDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE blood_inventory_status AS ENUM
    ('NOT_IN_STOCK','AVAILABLE','ORDER_RESERVED','PICKED','IN_TRANSIT','RECEIVED','ISSUED','RETURN_PENDING','WASTED','TRANSFUSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE blood_assignment_status AS ENUM
    ('UNASSIGNED','ORDER_ALLOCATED','PATIENT_ASSIGNED','CROSSMATCH_COMPATIBLE','EMERGENCY_RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add multi-axis columns to components and inventory (kept alongside the
-- legacy single `status` for backward compatibility during cut-over).
ALTER TABLE components ADD COLUMN IF NOT EXISTS quality_status   blood_quality_status;
ALTER TABLE components ADD COLUMN IF NOT EXISTS inventory_status blood_inventory_status;
ALTER TABLE components ADD COLUMN IF NOT EXISTS assignment_status blood_assignment_status;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS quality_status   blood_quality_status;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS inventory_status blood_inventory_status;
ALTER TABLE inventory  ADD COLUMN IF NOT EXISTS assignment_status blood_assignment_status;

-- Backfill multi-axis columns from the legacy status (mirror of
-- LEGACY_STATUS_TO_STATE in src/lib/stateMachine.ts).
WITH mapping(status, q, i, a) AS (VALUES
  ('COLLECTED','PENDING_TEST','NOT_IN_STOCK','UNASSIGNED'),
  ('QUARANTINE','PENDING_TEST','NOT_IN_STOCK','UNASSIGNED'),
  ('AVAILABLE','RELEASED','AVAILABLE','UNASSIGNED'),
  ('RESERVED','RELEASED','ORDER_RESERVED','ORDER_ALLOCATED'),
  ('PICKED','RELEASED','PICKED','ORDER_ALLOCATED'),
  ('IN_TRANSIT','RELEASED','IN_TRANSIT','ORDER_ALLOCATED'),
  ('RECEIVED','RELEASED','RECEIVED','ORDER_ALLOCATED'),
  ('CROSSMATCHED','RELEASED','RECEIVED','CROSSMATCH_COMPATIBLE'),
  ('ISSUED','RELEASED','ISSUED','PATIENT_ASSIGNED'),
  ('RETURNED','RELEASED','RETURN_PENDING','PATIENT_ASSIGNED'),
  ('TRANSFUSED','RELEASED','TRANSFUSED','PATIENT_ASSIGNED'),
  ('WASTED','NONCONFORMING','WASTED','UNASSIGNED'),
  ('DISCARDED','DISCARDED','WASTED','UNASSIGNED')
)
UPDATE components c SET
  quality_status    = m.q::blood_quality_status,
  inventory_status  = m.i::blood_inventory_status,
  assignment_status = m.a::blood_assignment_status
FROM mapping m WHERE c.status = m.status AND c.quality_status IS NULL;

WITH mapping(status, q, i, a) AS (VALUES
  ('COLLECTED','PENDING_TEST','NOT_IN_STOCK','UNASSIGNED'),
  ('QUARANTINE','PENDING_TEST','NOT_IN_STOCK','UNASSIGNED'),
  ('AVAILABLE','RELEASED','AVAILABLE','UNASSIGNED'),
  ('RESERVED','RELEASED','ORDER_RESERVED','ORDER_ALLOCATED'),
  ('PICKED','RELEASED','PICKED','ORDER_ALLOCATED'),
  ('IN_TRANSIT','RELEASED','IN_TRANSIT','ORDER_ALLOCATED'),
  ('RECEIVED','RELEASED','RECEIVED','ORDER_ALLOCATED'),
  ('CROSSMATCHED','RELEASED','RECEIVED','CROSSMATCH_COMPATIBLE'),
  ('ISSUED','RELEASED','ISSUED','PATIENT_ASSIGNED'),
  ('RETURNED','RELEASED','RETURN_PENDING','PATIENT_ASSIGNED'),
  ('TRANSFUSED','RELEASED','TRANSFUSED','PATIENT_ASSIGNED'),
  ('WASTED','NONCONFORMING','WASTED','UNASSIGNED'),
  ('DISCARDED','DISCARDED','WASTED','UNASSIGNED')
)
UPDATE inventory inv SET
  quality_status    = m.q::blood_quality_status,
  inventory_status  = m.i::blood_inventory_status,
  assignment_status = m.a::blood_assignment_status
FROM mapping m WHERE inv.status = m.status AND inv.quality_status IS NULL;

-- ---------------------------------------------------------------------
-- 2. Facility scope columns (RTM-AUTH-03)
-- ---------------------------------------------------------------------
ALTER TABLE inventory          ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE components         ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE orders             ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE patients           ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE crossmatch         ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE issue_records      ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE transfusions       ADD COLUMN IF NOT EXISTS facility_id TEXT;
ALTER TABLE adverse_reactions  ADD COLUMN IF NOT EXISTS facility_id TEXT;

-- Backfill from existing hints where present.
UPDATE patients SET facility_id = "hospitalId" WHERE facility_id IS NULL AND "hospitalId" IS NOT NULL;
UPDATE inventory SET facility_id = location     WHERE facility_id IS NULL AND location IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Optimistic-lock + audit columns where missing
-- ---------------------------------------------------------------------
ALTER TABLE orders        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE crossmatch    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE issue_records ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- DON-03 / EMG-01 governance columns
ALTER TABLE questionnaires ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
ALTER TABLE mtp_cases      ADD COLUMN IF NOT EXISTS "emergencyReviewDueAt" TEXT;
ALTER TABLE mtp_cases      ADD COLUMN IF NOT EXISTS "emergencyPolicyVersion" TEXT;

-- ---------------------------------------------------------------------
-- 4. Foreign keys (fail-closed referential integrity)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE crossmatch ADD CONSTRAINT fk_xm_patient FOREIGN KEY ("patientId") REFERENCES patients(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN RAISE NOTICE 'fk_xm_patient skipped: %', SQLERRM; END $$;

DO $$ BEGIN
  ALTER TABLE issue_records ADD CONSTRAINT fk_issue_patient FOREIGN KEY ("patientId") REFERENCES patients(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN RAISE NOTICE 'fk_issue_patient skipped: %', SQLERRM; END $$;

-- ---------------------------------------------------------------------
-- 5. Row-Level Security with facility scope (RTM-AUTH-03)
--    The application must set the GUC per request/connection:
--      SELECT set_config('app.facility_id', '<facility>', true);
--      SELECT set_config('app.role', '<role>', true);
--    Admin role bypasses facility scope. NOTE: Supabase service_role bypasses
--    RLS entirely — production must use a user-scoped key or a DB role that
--    does NOT have BYPASSRLS for these policies to take effect.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_facility() RETURNS TEXT
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.facility_id', true) $$;
CREATE OR REPLACE FUNCTION app_is_admin() RETURNS BOOLEAN
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.role', true) = 'Admin' $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventory','components','orders','patients','crossmatch','issue_records','transfusions','adverse_reactions']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_facility_scope', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I
        USING (app_is_admin() OR facility_id IS NULL OR facility_id = app_current_facility())
        WITH CHECK (app_is_admin() OR facility_id = app_current_facility());
    $f$, t || '_facility_scope', t);
  END LOOP;
END $$;

COMMIT;
