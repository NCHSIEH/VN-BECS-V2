# VN-BECS-V2 部署前檢核清單與臨床營運手冊 (SOP 10/12 Deployment Checklist & Operations Manual)

本文件為 VN-BECS-V2 系統上線部署前之標準操作程序（SOP）檢核指引，用以指導系統管理員與臨床營運團隊在越南各捐血中心（LIMS）、物流調度中心（HUB）及醫療機構（Hospital）之正式部署與上線驗證。

---

## 📋 1. 部署前系統配置檢核表 (Pre-deployment Configuration)

在將代碼推送至正式生產環境前，必須確認以下環境變數與安全政策配置正確：

| 項目 | 檢查要點 | 推薦生產配置 | 狀態 |
| :--- | :--- | :--- | :--- |
| **RBAC 強制開關** | 確認高風險 API 是否啟用 Role-Based Access Control 強制阻擋。 | `VN_BECS_ENFORCE_API_RBAC=true` | 🟢 檢查通過 |
| **Supabase 連線** | 確認 PostgreSQL / Supabase 生產庫連線憑證。 | `NEXT_PUBLIC_SUPABASE_URL` 與安全密鑰已正確填寫 | 🟢 檢查通過 |
| **離線同步模式** | 確認醫院端之 PWA/離線暫存與衝突合併機制已啟用。 | 本地儲存 `localStorage` 及 `IndexedDB` 快取政策就緒 | 🟢 檢查通過 |
| **冷鏈 IoT 監控** | 確認運送模組之溫度違規上限警報閾值設定。 | 嚴格執行 `4.0°C - 6.0°C` 區間監控與 `30分鐘冷鏈法則` | 🟢 檢查通過 |

---

## 🗄️ 2. 資料庫遷移與初始化指引 (Database Migration & Seeding)

### 2.1 執行 DDL 結構初始化
正式環境資料庫必須依序執行以下結構化 DDL 檔案：
1. [supabase_schema.sql](file:///c:/Users/nchsi/Documents/GitHub/VN-BECS-V2/supabase_schema.sql) ：建立核心實體表（`inventory`, `components`, `reconciliation_reports`, `audit_events`, `patients`, `crossmatch`, `issue_records`, `adverse_reactions` 等）。
2. `seed_data.sql` ：載入基礎越南行政區劃與醫療機構主數據（Master Data）。

### 2.2 生產環境帳戶角色矩陣（MSD Role Mapping）
在 `mdm_users` 中應預先配置越南血委會標準帳戶：
* **`Admin` (系統管理員)**：具備全模組存取與 RBAC 規則配置權限。
* **`Nurse` / `DonorScreener` (採血護理師)**：限制僅能存取 LIMS 登記、Phlebotomy 與採血介面。
* **`LIMS_Simulator` / `QA_Officer` (檢驗與 QA 官員)**：具備 IDM 檢驗批准、Lookback 啟動與 QA 釋放權限。
* **`WarehouseIssuer` / `Dispatcher` (庫管與調度員)**：負責 HUB 庫存 FEFO 揀貨與運輸派單。
* **`HospitalOperator` / `Nurse_Bedside` (臨床醫護人員)**：負責發血確認、床邊 barcode 掃描二重驗證及嚴重不良反應通報。

---

## 🔬 3. 臨床上線驗證方案 (Clinical Validation Protocols)

部署完畢後，臨床驗證小組須手動或自動執行以下四大黃金流程測試（Happy Paths）：

### 🧪 3.1 LIMS 採血至 QA 釋放測試 (SOP 1 - SOP 3)
1. 註冊新捐血人，填寫健康篩檢問卷。
2. 模擬採血，確認 DIN (Donation Identification Number) 自動依 ISBT-128 標準產生。
3. 進入 **LAB Testing**，運行 IDM 測試。確認在狀態為 `PENDING` 時，前端「Fabricate Components」按鈕**確實鎖定無法點擊**。
4. 將 IDM 狀態設為 `CLEARED`，確認該按鈕解鎖，並能順利分離出紅血球（RBC）、血漿（FFP）等組件。
5. 進行 QA Release，驗證 HL7 FHIR 格式封包成功同步至 Central HUB。

### 🚚 3.2 HUB FEFO 智能分流與冷鏈物流 (SOP 3 - SOP 5)
1. 模擬醫院端提交血品申請訂單。
2. 進入 HUB 分流管理，啟用 FEFO 算法，確認系統**自動優先配給效期最接近的血袋**。
3. 模擬車隊出發，驗證運輸過程中 IoT 溫度感測器日誌寫入，並確認若溫度超出 `6.0°C` 會觸發 `ColdChain Violation` 告警。

### 🏥 3.3 臨床床邊二重驗證與輸血安全 (SOP 6 - SOP 8)
1. 執行發血（Issue Blood Unit），確認觸發 `baseVersion` 版本鎖。
2. 使用模擬器進行床邊雙人核對（Double-Nurse Verification）：
   - 掃描 Patient Wristband (病人手環) 及 Unit Barcode (血袋條碼)。
   - 確認系統精準檢查 **ABO/Rh 交叉配血相容性**，非相容血型嚴格阻斷。
   - 確認發血紀錄中 `ISSUED -> TRANSFUSED` 的狀態轉換在狀態機中順利完成。

### 🚨 3.4 Adverse Reaction & Lookback 阻斷測試 (SOP 7 - SOP 9)
1. 在醫院端通報一筆疑似 Acute Hemolytic (急性溶血反應) 的嚴重不良反應。
2. 驗證後端是否**自動啟動 Lookback 調查**，並自動向該捐血者下達 **6 個月 Deferral 限制**。
3. 檢查 LIMS 及 HUB 庫存，確認與該捐血人關聯的所有其他血袋皆被**自動隔離（Status: QUARANTINE）**，且無法再被釋放或發血。

---

## 💾 4. 資料備份、恢復與緊急回滾方案 (Backup & Rollback Playbook)

### 4.1 每日自動化對帳與稽核（SOP 10 Daily Reconciliation）
* **自動對帳作業**：系統於每日清晨 `06:00` 自動運行對帳 Job。
* **數據自我修復（Auto-Correct）**：
  - 經理人員可點擊 **"Auto-Correct Data"**，一鍵自動排解過期血袋報廢、無效狀態重置、版本鎖缺失修復及位置修正。
  - 對帳修復操作會完整記錄於 `DAILY_RECONCILIATION_RESOLVED` 審計鏈中。

### 4.2 災難備份與緊急恢復
* **備份頻率**：生產庫每日進行增量備份（WAL-G / Pgbackrest），每週進行全量冷備份。
* **PWA 離線容災**：當醫院網絡中斷時，系統自動切換至離線模式，允許手動登記緊急發血，並在網絡恢復後，透過 `push-events` API 合併數據，自動處理 terminal state 衝突。

### 4.3 緊急回滾步驟（Emergency Rollback）
若正式上線時發生嚴重崩潰或不相容錯誤，請執行以下回滾程序：
1. **關閉流量**：將負載均衡器（LB）或 Nginx 指向維護靜態頁。
2. **倒回代碼**：回滾 Git 分支至最近的穩定 Release Tag (例如 `v1.9.0-stable`) 並重新構建部署：
   ```bash
   git checkout v1.9.0-stable
   npm install
   npm run build
   ```
3. **還原資料庫**：使用備份檔案還原 PostgreSQL 資料庫至上線前狀態：
   ```bash
   pg_restore -h localhost -U postgres -d vn_becs_prod -v "/backups/db_backup_pre_deploy.dump"
   ```
4. **重新啟用服務**：重啟 LB 並驗證 `/api/health` 端點，確保服務完全恢復正常。
