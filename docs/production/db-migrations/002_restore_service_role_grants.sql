-- 002_restore_service_role_grants.sql
--
-- FIX: production login returned 401 for every account because the
-- "lock down public anon Data API" hardening revoked table privileges
-- too broadly and left the server's service_role without access.
--
-- Symptom: PostgREST/queries via the service role key fail with
--   42501 "permission denied for table users"
-- so src/server/db.ts getByUsername() falls through to `return null`,
-- and the login route reports LOGIN_INVALID_CREDENTIALS (401).
--
-- This restores FULL privileges to service_role ONLY (the trusted
-- server identity). anon / authenticated stay locked down, so the
-- public Data API remains closed and RLS continues to apply to them.
--
-- Run against the PRODUCTION database (ref ixazlfmhwjirusikbyoj).

BEGIN;

-- Schema usage
GRANT USAGE ON SCHEMA public TO service_role;

-- Existing objects
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Future objects (so new tables don't reintroduce the same outage)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

COMMIT;

-- Verify afterwards (should return has_select = true):
-- SELECT has_table_privilege('service_role', 'public.users', 'SELECT') AS has_select;
