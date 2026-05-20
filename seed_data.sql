-- VN-BBMS V2 Supabase Seed Data
-- Run this AFTER supabase_schema.sql to populate the system with demo data.

-- 1. Organizations
INSERT INTO organizations (id, name, type, location, "createdAt") VALUES
('ORG-HUB-01', 'Vietnam National Blood Hub', 'Hub', 'Hanoi HQ', NOW()),
('ORG-BC-01', 'Hanoi Regional Blood Center', 'BloodCenter', 'Hanoi North', NOW()),
('ORG-BC-02', 'HCM City Blood Center', 'BloodCenter', 'HCM South', NOW()),
('ORG-BC-03', 'Da Nang Blood Service', 'BloodCenter', 'Da Nang Central', NOW()),
('ORG-HOSP-01', 'Cho Ray General Hospital', 'Hospital', 'HCM District 5', NOW()),
('ORG-HOSP-02', 'Bach Mai Hospital', 'Hospital', 'Hanoi Dong Da', NOW()),
('ORG-HOSP-03', 'Viet Duc University Hospital', 'Hospital', 'Hanoi Hoan Kiem', NOW()),
('ORG-HOSP-04', 'Hue Central Hospital', 'Hospital', 'Hue City', NOW()),
('ORG-HOSP-05', 'Can Tho General Hospital', 'Hospital', 'Can Tho Delta', NOW()),
('ORG-HOSP-06', 'Military Hospital 108', 'Hospital', 'Hanoi Central', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Users
INSERT INTO users (id, username, password, role, "orgId", permitted_systems, "isActive", "createdAt") VALUES
('USR-ADMIN', 'admin', '123', 'Admin', 'ORG-HUB-01', 'LIMS,HUB,MDM,HOSPITAL,NATIONAL', 1, NOW()),
('USR-MGR', 'manager', '123', 'Manager', 'ORG-HUB-01', 'HUB', 1, NOW()),
('USR-DISP-1', 'dispatcher_hn', '123', 'HubDispatcher', 'ORG-HUB-01', 'HUB', 1, NOW()),
('USR-DISP-2', 'dispatcher_hcm', '123', 'HubDispatcher', 'ORG-HUB-01', 'HUB', 1, NOW()),
('USR-DR-1', 'doctor_hosp_1', '123', 'Doctor', 'ORG-HOSP-01', 'HUB', 1, NOW()),
('USR-NS-1', 'nurse_hosp_1', '123', 'Nurse', 'ORG-HOSP-01', 'HUB', 1, NOW()),
('USR-WH-1', 'warehouse_hosp_1', '123', 'WarehouseIssuer', 'ORG-HOSP-01', 'HUB', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Product Catalog
INSERT INTO product_catalog ("productCode", alias, "componentClass", "aboRequired", "rhdRequired") VALUES
('E7010', 'Red Blood Cells (Leukoreduced)', 'RBC', 1, 1),
('E7011', 'Red Blood Cells (Irradiated)', 'RBC', 1, 1),
('E7020', 'Platelets (Apheresis)', 'PLT', 1, 0),
('E7030', 'Fresh Frozen Plasma', 'FFP', 1, 0),
('E7040', 'Cryoprecipitate', 'CRYO', 0, 0),
('E7050', 'Whole Blood', 'WB', 1, 1)
ON CONFLICT ("productCode") DO NOTHING;

-- 4. Sample Donors
INSERT INTO donors (id, name, "nationalId", dob, "bloodType", rhd, "registeredAt") VALUES
('D-1001', 'Nguyen Van Minh', '100000000001', '1985-05-15', 'O', 'Positive', NOW()),
('D-1002', 'Tran Thi Lan', '100000000002', '1992-08-22', 'A', 'Positive', NOW()),
('D-1003', 'Le Van Nam', '100000000003', '1978-11-03', 'B', 'Negative', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Sample Inventory
INSERT INTO inventory ("unitId", "productCode", abo, rhd, "expiryDate", status, location, "isIrradiated", "isCmvNegative") VALUES
('=W0000 24 100001', 'E7010', 'O', 'Positive', '2026-06-15T00:00:00Z', 'AVAILABLE', 'Hub Central', true, false),
('=W0000 24 100002', 'E7010', 'A', 'Positive', '2026-06-20T00:00:00Z', 'AVAILABLE', 'Hanoi Regional BC', false, true),
('=W0000 24 100003', 'E7020', 'B', 'Negative', '2026-05-25T00:00:00Z', 'AVAILABLE', 'HCM City BC', true, true)
ON CONFLICT ("unitId") DO NOTHING;
-- 6. Resources (Reagents & Equipment)
INSERT INTO resources (id, name, type, "lotNumber", "expiryDate", "lastMaintenance", "nextMaintenance", status, "stockLevel", "minStockLevel", "orgId") VALUES
('R-HIV-001', 'HIV Ag/Ab Combo Test Kit', 'Reagent', 'LOT240105', '2026-12-31', NULL, NULL, 'Active', 450, 100, 'ORG-BC-01'),
('R-HBV-002', 'HBV Surface Antigen Kit', 'Reagent', 'LOT240212', '2023-06-15', NULL, NULL, 'Expired', 25, 50, 'ORG-BC-01'),
('E-NAT-01', 'Cobas NAT Analyzer', 'Equipment', NULL, NULL, '2024-01-10', '2024-07-10', 'Active', NULL, NULL, 'ORG-BC-01'),
('E-CEN-04', 'High-Speed Centrifuge', 'Equipment', NULL, NULL, '2023-05-20', '2023-11-20', 'MaintenanceRequired', NULL, NULL, 'ORG-BC-01'),
('C-BAG-TRP', 'Triple Blood Bag (450ml)', 'Consumable', NULL, NULL, NULL, NULL, 'Active', 1200, 500, 'ORG-BC-01')
ON CONFLICT (id) DO NOTHING;

-- 7. Rare Donors
INSERT INTO rare_donors (id, name, "nationalId", "bloodType", rhd, phenotype, "hlaTyping", "hpaTyping", location, contact, status) VALUES
('RD-001', 'Nguyen Van A', '123456789', 'O', 'Positive', 'Rh null', '{"A":"02,03","B":"07,08"}', '{"1a":"pos"}', 'Hanoi', '+84 123 456 789', 'Available'),
('RD-002', 'Tran Thi B', '987654321', 'A', 'Negative', 'p phenotype', '{"A":"01,24","B":"08,44"}', '{"1a":"neg"}', 'Ho Chi Minh City', '+84 987 654 321', 'Available'),
('RD-003', 'Le Van C', '456789123', 'B', 'Negative', 'Bombay O', '{"A":"11,03","B":"35,51"}', '{"1a":"pos"}', 'Da Nang', '+84 456 789 123', 'Available')
ON CONFLICT (id) DO NOTHING;
