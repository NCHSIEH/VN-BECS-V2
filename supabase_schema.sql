-- VN-BBMS V2 Supabase Schema (PostgreSQL)
-- Copy and paste this into the Supabase SQL Editor

-- ===================================================================
-- ENUMS & TYPES
-- ===================================================================

-- Blood unit clinical status enum (single source of truth for allowed values)
DO $$ BEGIN
  CREATE TYPE blood_unit_status AS ENUM (
    'COLLECTED', 'QUARANTINE', 'AVAILABLE', 'RESERVED', 'PICKED',
    'IN_TRANSIT', 'RECEIVED', 'CROSSMATCHED', 'ISSUED', 'RETURNED',
    'TRANSFUSED', 'WASTED', 'DISCARDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- 1. Organizations
-- ===================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    location TEXT,
    "createdAt" TEXT
);

-- ===================================================================
-- 2. Users
-- ===================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    "orgId" TEXT REFERENCES organizations(id),
    permitted_systems TEXT,
    photo_url TEXT,
    details TEXT, -- JSON string
    "isActive" INTEGER DEFAULT 1,
    "createdAt" TEXT
);

-- ===================================================================
-- 3. Donors
-- ===================================================================
CREATE TABLE IF NOT EXISTS donors (
    id TEXT PRIMARY KEY,
    name TEXT,
    "nationalId" TEXT UNIQUE,
    dob TEXT,
    gender TEXT,
    weight INTEGER,
    "bloodType" TEXT,
    rhd TEXT,
    "registeredAt" TEXT,
    "deferralStatus" TEXT,
    "deferralReason" TEXT,
    "deferralUntil" TEXT
);

-- ===================================================================
-- 4. Questionnaires
-- ===================================================================
CREATE TABLE IF NOT EXISTS questionnaires (
    id TEXT PRIMARY KEY,
    "donorId" TEXT REFERENCES donors(id),
    "answersJson" TEXT,
    "isPassed" INTEGER,
    "createdAt" TEXT,
    "deferralReason" TEXT,
    "deferralUntil" TEXT
);

-- ===================================================================
-- 5. Donations
-- ===================================================================
CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    "donorId" TEXT REFERENCES donors(id),
    "questionnaireId" TEXT REFERENCES questionnaires(id),
    "collectedAt" TEXT,
    volume INTEGER,
    "donationType" TEXT
);

-- ===================================================================
-- 6. Lab Tests
-- ===================================================================
CREATE TABLE IF NOT EXISTS lab_tests (
    id TEXT PRIMARY KEY,
    "donationId" TEXT REFERENCES donations(id),
    abo TEXT,
    rhd TEXT,
    "idmStatus" TEXT,
    "testedAt" TEXT
);

-- ===================================================================
-- 7. Components (with status CHECK constraint + optimistic lock version)
-- ===================================================================
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    "donationId" TEXT REFERENCES donations(id),
    "productCode" TEXT,
    type TEXT,
    status TEXT NOT NULL DEFAULT 'COLLECTED'
        CHECK (status IN (
            'COLLECTED', 'QUARANTINE', 'AVAILABLE', 'RESERVED', 'PICKED',
            'IN_TRANSIT', 'RECEIVED', 'CROSSMATCHED', 'ISSUED', 'RETURNED',
            'TRANSFUSED', 'WASTED', 'DISCARDED'
        )),
    abo TEXT,
    rhd TEXT,
    "expiryDate" TEXT,
    "createdAt" TEXT,
    version INTEGER NOT NULL DEFAULT 1
);

-- ===================================================================
-- 8. Audit Events (append-only — updates and deletes are BLOCKED)
-- ===================================================================
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT,
    "eventType" TEXT NOT NULL,
    "objectType" TEXT,
    "objectId" TEXT,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    details TEXT,
    "requestId" TEXT,
    "deviceId" TEXT,
    "reasonCode" TEXT,
    "previousHash" TEXT,
    "eventHash" TEXT,
    "schemaVersion" TEXT,
    timestamp TEXT NOT NULL DEFAULT (to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Append-only enforcement: block UPDATE and DELETE on audit_events at DB level
CREATE OR REPLACE FUNCTION fn_audit_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events rows are immutable: % on row id=% is not allowed.',
    TG_OP, COALESCE(OLD.id, 'unknown');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_events_no_update ON audit_events;
CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION fn_audit_events_immutable();

DROP TRIGGER IF EXISTS trg_audit_events_no_delete ON audit_events;
CREATE TRIGGER trg_audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION fn_audit_events_immutable();

-- ===================================================================
-- 9. Orders
-- ===================================================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    hospital TEXT,
    priority TEXT,
    status TEXT,
    "hiciScore" REAL,
    type TEXT,
    items TEXT, -- JSON string
    "patientId" TEXT,
    "clinicalIndication" TEXT,
    "specialRequirements" TEXT,
    "allocatedUnits" TEXT, -- JSON string
    "escalationReason" TEXT,
    "submittedAt" TEXT
);

-- ===================================================================
-- 10. MTP Cases
-- ===================================================================
CREATE TABLE IF NOT EXISTS mtp_cases (
    id TEXT PRIMARY KEY,
    "patientIdentifier" TEXT,
    "authorizedClinician" TEXT,
    "clinicalScenario" TEXT,
    status TEXT,
    "activatedAt" TEXT
);

-- ===================================================================
-- 11. Product Catalog
-- ===================================================================
CREATE TABLE IF NOT EXISTS product_catalog (
    "productCode" TEXT PRIMARY KEY,
    alias TEXT,
    "componentClass" TEXT,
    "aboRequired" INTEGER,
    "rhdRequired" INTEGER
);

-- ===================================================================
-- 12. Inventory (with status CHECK constraint + optimistic lock version)
-- ===================================================================
CREATE TABLE IF NOT EXISTS inventory (
    "unitId" TEXT PRIMARY KEY,
    "productCode" TEXT,
    abo TEXT,
    rhd TEXT,
    "expiryDate" TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN (
            'COLLECTED', 'QUARANTINE', 'AVAILABLE', 'RESERVED', 'PICKED',
            'IN_TRANSIT', 'RECEIVED', 'CROSSMATCHED', 'ISSUED', 'RETURNED',
            'TRANSFUSED', 'WASTED', 'DISCARDED'
        )),
    location TEXT,
    "isIrradiated" BOOLEAN DEFAULT FALSE,
    "isCmvNegative" BOOLEAN DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1
);

-- ===================================================================
-- 13. Transport Jobs
-- ===================================================================
CREATE TABLE IF NOT EXISTS transport_jobs (
    "orderId" TEXT PRIMARY KEY REFERENCES orders(id),
    "sensorId" TEXT,
    readings TEXT, -- JSON string
    "coldChainViolation" INTEGER DEFAULT 0,
    "updatedAt" TEXT
);

-- ===================================================================
-- 14. Crossmatch
-- ===================================================================
CREATE TABLE IF NOT EXISTS crossmatch (
    id TEXT PRIMARY KEY,
    "componentId" TEXT,
    "patientId" TEXT,
    method TEXT,
    result TEXT,
    "testedBy" TEXT,
    "specimenDate" TEXT,
    "createdAt" TEXT
);

-- ===================================================================
-- 15. Issue Records
-- ===================================================================
CREATE TABLE IF NOT EXISTS issue_records (
    id TEXT PRIMARY KEY,
    "componentId" TEXT,
    "patientId" TEXT,
    "issuedTo" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TEXT,
    "returnedAt" TEXT,
    "returnStatus" TEXT
);

-- ===================================================================
-- 16. Adverse Reactions
-- ===================================================================
CREATE TABLE IF NOT EXISTS adverse_reactions (
    id TEXT PRIMARY KEY,
    "transfusionId" TEXT,
    "patientId" TEXT,
    "reactionType" TEXT,
    severity TEXT,
    description TEXT,
    "actionsTaken" TEXT,
    "lookbackTriggered" INTEGER DEFAULT 0,
    "allTransfusionsPaused" INTEGER DEFAULT 0,
    "reportedBy" TEXT,
    "reportedAt" TEXT
);

-- ===================================================================
-- 17. Patients
-- ===================================================================
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    mrn TEXT UNIQUE,
    name TEXT,
    abo TEXT,
    rhd TEXT,
    "bloodType" TEXT,
    "hospitalId" TEXT,
    "hasAntibody" BOOLEAN DEFAULT FALSE,
    "antibodyType" TEXT,
    "specimenExpired" BOOLEAN DEFAULT FALSE,
    "specimenHours" INTEGER DEFAULT 0,
    "antibodyHistory" TEXT -- JSON string
);

-- ===================================================================
-- 18. Transfusions
-- ===================================================================
CREATE TABLE IF NOT EXISTS transfusions (
    id TEXT PRIMARY KEY,
    "componentId" TEXT,
    "patientId" TEXT,
    verifier1 TEXT,
    "verifier2Pin" TEXT,
    "consentVerified" INTEGER,
    "preVitalsChecked" INTEGER,
    status TEXT,
    "startedAt" TEXT,
    "completedAt" TEXT
);

-- ===================================================================
-- 19. Offline Events
-- ===================================================================
CREATE TABLE IF NOT EXISTS offline_events (
    "localEventId" TEXT PRIMARY KEY,
    "idempotencyKey" TEXT,
    "tenantId" TEXT,
    "facilityId" TEXT,
    "deviceId" TEXT,
    "operationType" TEXT,
    din TEXT,
    "bagUid" TEXT,
    "patientRef" TEXT,
    payload TEXT,
    "baseVersion" INTEGER,
    "clientTimestamp" TEXT,
    "serverTimestamp" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "serverVersion" INTEGER,
    "currentStatus" TEXT,
    "requestId" TEXT,
    "unitBarcodeRaw" TEXT,
    "patientTempId" TEXT,
    "authorizationDoctorId" TEXT,
    timestamp TEXT,
    "syncStatus" TEXT,
    "hospitalId" TEXT
);

-- ===================================================================
-- 20. Reconciliation Reports
-- ===================================================================
CREATE TABLE IF NOT EXISTS reconciliation_reports (
    id TEXT PRIMARY KEY,
    date TEXT,
    "hospitalId" TEXT,
    "borrowedUnits" TEXT, -- JSON string
    conflicts TEXT, -- JSON string
    "resolvedBy" TEXT,
    "resolvedAt" TEXT
);

-- ===================================================================
-- 21. Resources (Reagents, Equipment, Consumables)
-- ===================================================================
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT, -- Reagent, Equipment, Consumable
    "lotNumber" TEXT,
    "expiryDate" TEXT,
    "lastMaintenance" TEXT,
    "nextMaintenance" TEXT,
    status TEXT, -- Active, Expired, MaintenanceRequired, OutofStock
    "stockLevel" INTEGER,
    "minStockLevel" INTEGER,
    "orgId" TEXT REFERENCES organizations(id)
);

-- ===================================================================
-- RLS CONFIGURATION
-- Demo/Pilot tables: DISABLE RLS (simplified for Taiwan/Vietnam teams)
-- audit_events: ENABLE RLS with strict append-only policies
-- ===================================================================

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE donors DISABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires DISABLE ROW LEVEL SECURITY;
ALTER TABLE donations DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE components DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE mtp_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE transport_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE crossmatch DISABLE ROW LEVEL SECURITY;
ALTER TABLE issue_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE adverse_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfusions DISABLE ROW LEVEL SECURITY;
ALTER TABLE offline_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;

-- audit_events: ENABLE RLS — only INSERT (append) and SELECT are allowed
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Allow service role and authenticated users to insert audit events
DROP POLICY IF EXISTS audit_events_insert_policy ON audit_events;
CREATE POLICY audit_events_insert_policy ON audit_events
  FOR INSERT TO service_role, authenticated
  WITH CHECK (TRUE);

-- Allow authenticated users to read audit events
DROP POLICY IF EXISTS audit_events_select_policy ON audit_events;
CREATE POLICY audit_events_select_policy ON audit_events
  FOR SELECT TO authenticated
  USING (TRUE);

-- Explicitly DENY UPDATE (belt-and-suspenders with trigger above)
DROP POLICY IF EXISTS audit_events_no_update_policy ON audit_events;
CREATE POLICY audit_events_no_update_policy ON audit_events
  FOR UPDATE TO authenticated, anon
  USING (FALSE);

-- Explicitly DENY DELETE (belt-and-suspenders with trigger above)
DROP POLICY IF EXISTS audit_events_no_delete_policy ON audit_events;
CREATE POLICY audit_events_no_delete_policy ON audit_events
  FOR DELETE TO authenticated, anon
  USING (FALSE);

-- ===================================================================
-- 22. Rare Donors (SOP 11)
-- ===================================================================
CREATE TABLE IF NOT EXISTS rare_donors (
    id TEXT PRIMARY KEY,
    name TEXT,
    "nationalId" TEXT,
    "bloodType" TEXT,
    rhd TEXT,
    phenotype TEXT, -- e.g., Bombay O, Rh null
    "hlaTyping" TEXT, -- JSON string
    "hpaTyping" TEXT, -- JSON string
    location TEXT,
    contact TEXT,
    status TEXT, -- Available, Mobilized, Unavailable
    "lastDonationDate" TEXT,
    "orgId" TEXT REFERENCES organizations(id)
);

-- ===================================================================
-- MTP Cases: Add round tracking columns (migration safety)
-- ===================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mtp_cases' AND column_name='currentRound') THEN
        ALTER TABLE mtp_cases ADD COLUMN "currentRound" INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mtp_cases' AND column_name='unitsTarget') THEN
        ALTER TABLE mtp_cases ADD COLUMN "unitsTarget" INTEGER DEFAULT 18;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mtp_cases' AND column_name='unitsIssued') THEN
        ALTER TABLE mtp_cases ADD COLUMN "unitsIssued" INTEGER DEFAULT 0;
    END IF;

    -- Add version column to components if missing (migration safety)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='components' AND column_name='version') THEN
        ALTER TABLE components ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Add version column to inventory if missing (migration safety)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='version') THEN
        ALTER TABLE inventory ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Disable RLS for new non-clinical support tables
ALTER TABLE rare_donors DISABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 23. Translations (Dynamic Multi-language)
-- ===================================================================
CREATE TABLE IF NOT EXISTS translations (
    key TEXT,
    lang TEXT,
    value TEXT,
    PRIMARY KEY (key, lang)
);
ALTER TABLE translations DISABLE ROW LEVEL SECURITY;
