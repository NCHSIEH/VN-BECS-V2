# 關聯式資料庫設計 (PostgreSQL) (Prompt 2)

## 核心設計原則
- `audit_events` 必須 Append-only (系統不提供 DELETE 與 UPDATE)。
- 高風險表單（如 orders, blood_units）使用 soft delete 或 tracking updates (status driven)。

## 1. Schema Overview
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hospitals
CREATE TABLE hospitals (
    hospital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50),
    region VARCHAR(50),
    active BOOLEAN DEFAULT true
);

-- Users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(hospital_id),
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true
);

-- Product Catalog (ISBT 128)
CREATE TABLE product_catalog (
    product_code VARCHAR(20) PRIMARY KEY,
    alias VARCHAR(255),
    component_class VARCHAR(50) NOT NULL,
    abo_required BOOLEAN DEFAULT true,
    rhd_required BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true
);

-- Blood Units
CREATE TABLE blood_units (
    unit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    din VARCHAR(20) NOT NULL, -- Donation ID
    product_code VARCHAR(20) REFERENCES product_catalog(product_code),
    abo VARCHAR(10),
    rhd VARCHAR(10),
    expiration_date TIMESTAMP,
    release_status VARCHAR(50) DEFAULT 'AVAILABLE',
    reserved_order_id UUID,
    quarantine_flag BOOLEAN DEFAULT false,
    -- [高風險欄位]
    current_location VARCHAR(100)
);

-- Order Headers
CREATE TABLE order_headers (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(hospital_id),
    priority VARCHAR(20) NOT NULL, -- Routine, ASAP, STAT, MTP
    order_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    mtp_case_id VARCHAR(50),
    -- [高風險欄位]
    patient_ref VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP
);

-- Order Lines
CREATE TABLE order_lines (
    line_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES order_headers(order_id),
    product_code VARCHAR(20) REFERENCES product_catalog(product_code),
    abo VARCHAR(10),
    rhd VARCHAR(10),
    requested_qty INT NOT NULL,
    approved_qty INT,
    status VARCHAR(50) DEFAULT 'PENDING'
);

-- Allocation Proposals
CREATE TABLE allocation_proposals (
    proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES order_headers(order_id),
    hici_score NUMERIC,
    proposed_qty INT,
    rationale JSONB
);

-- Audit Events
CREATE TABLE audit_events (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(user_id),
    object_type VARCHAR(50),
    object_id VARCHAR(255),
    before_hash TEXT,
    after_hash TEXT,
    reason_code VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## 不可刪除資料設計建議
- 使用 PostgreSQL `REVOKE DELETE, UPDATE ON audit_events FROM "app_user";` 等權限控制設計，確保前端無從透過後端刪除稽核軌跡。
