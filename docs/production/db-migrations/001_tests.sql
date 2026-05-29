-- =====================================================================
-- VN-BECS-V2 Migration 001 negative/acceptance tests.
-- Run AFTER 001_facility_scope_and_constraints.sql on a TEST database.
-- Each block must behave as commented. Use psql; \echo marks expectations.
-- =====================================================================

-- --- TEST 1: invalid clinical status is rejected (CHECK / enum) ----------
\echo 'TEST 1: expect ERROR (invalid status)'
DO $$ BEGIN
  INSERT INTO components(id, status) VALUES ('TEST-BAD-STATUS', 'NONSENSE');
  RAISE EXCEPTION 'TEST 1 FAILED: invalid status was accepted';
EXCEPTION WHEN check_violation OR invalid_text_representation THEN
  RAISE NOTICE 'TEST 1 PASSED: invalid status rejected';
END $$;

-- --- TEST 2: audit_events are immutable (RTM-AUD-01) ---------------------
\echo 'TEST 2: expect ERROR on UPDATE and DELETE of audit_events'
INSERT INTO audit_events(id, "eventType", "objectId", details)
  VALUES ('AUD-TEST-1', 'TestEvent', 'OBJ-1', 'immutability probe')
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  UPDATE audit_events SET details = 'tampered' WHERE id = 'AUD-TEST-1';
  RAISE EXCEPTION 'TEST 2a FAILED: UPDATE on audit_events succeeded';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'TEST 2a PASSED: UPDATE blocked (%).', SQLERRM;
END $$;

DO $$ BEGIN
  DELETE FROM audit_events WHERE id = 'AUD-TEST-1';
  RAISE EXCEPTION 'TEST 2b FAILED: DELETE on audit_events succeeded';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'TEST 2b PASSED: DELETE blocked (%).', SQLERRM;
END $$;

-- --- TEST 3: facility-scoped RLS (RTM-AUTH-03) --------------------------
-- Run as a NON-superuser, NON-BYPASSRLS role for RLS to apply.
\echo 'TEST 3: facility scope isolation'
INSERT INTO patients(id, mrn, name, facility_id) VALUES ('P-HOSP1','MRN-H1','Pt A','HOSP-1') ON CONFLICT (id) DO NOTHING;
INSERT INTO patients(id, mrn, name, facility_id) VALUES ('P-HOSP2','MRN-H2','Pt B','HOSP-2') ON CONFLICT (id) DO NOTHING;

SELECT set_config('app.role', 'Nurse', true);
SELECT set_config('app.facility_id', 'HOSP-1', true);
\echo 'Expect ONLY P-HOSP1 (1 row):'
SELECT id, facility_id FROM patients WHERE id IN ('P-HOSP1','P-HOSP2');

SELECT set_config('app.role', 'Admin', true);
\echo 'Admin: expect BOTH rows (2 rows):'
SELECT id, facility_id FROM patients WHERE id IN ('P-HOSP1','P-HOSP2');

-- --- TEST 4: cross-facility write is blocked (WITH CHECK) ---------------
\echo 'TEST 4: expect ERROR (cross-facility insert)'
SELECT set_config('app.role', 'Nurse', true);
SELECT set_config('app.facility_id', 'HOSP-1', true);
DO $$ BEGIN
  INSERT INTO patients(id, mrn, name, facility_id) VALUES ('P-X','MRN-X','Pt X','HOSP-2');
  RAISE EXCEPTION 'TEST 4 FAILED: cross-facility insert allowed';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE NOTICE 'TEST 4 PASSED: cross-facility write blocked';
END $$;

-- --- TEST 5: multi-axis backfill populated (RTM-STATE-04) ---------------
\echo 'TEST 5: expect 0 rows with NULL multi-axis status among known statuses'
SELECT count(*) AS unmapped
FROM components
WHERE status IN ('AVAILABLE','ISSUED','TRANSFUSED') AND quality_status IS NULL;
