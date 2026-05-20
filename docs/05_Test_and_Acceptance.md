# 測試與驗收計畫 (Prompt 5)

## 驗收情境 (Gherkin Format)

### 1. Routine 訂單驗收 (MVP 必測)
**Given** 醫院血庫操作員已登入
**When** 使用者建立 Routine 補庫訂單，選擇血品與數量送出
**Then** 系統驗證 Product Catalog 與配額，轉為 SUBMITTED
**And** 留下 AuditEvent，並出現在 Dispatch Hub 佇列

### 2. MTP 緊急呼叫驗收 (Phase 2 必測)
**Given** 醫院端啟動 MTP
**When** 使用者完成二次確認並輸入臨床情境送出
**Then** 系統建立 MTP Case ID，全域紅色警告，並使後續訂單綁定此 ID

### 3. AI / HITL 人工配血驗收 (MVP 必測)
**Given** Dispatch Hub 收到新訂單且 HICI Engine 產出建議
**When** Dispatcher 查閱後點擊 Approve
**Then** 狀態方能轉為 APPROVED
*(確保 AI 不會自動出庫)*

### 4. Barcode Mismatch 驗收 (上線前必測)
**Given** 訂單要求 A 型 RBC
**When** 出庫人員掃描 B 型 RBC 血袋
**Then** 系統顯示警示 BARCODE_MISMATCH 並且阻擋出庫
**And** 要求主管 Dual Review

### 5. Offline Fallback 驗收 (Phase 2 必測)
**Given** 醫院網路斷線超過 30 秒
**Then** 系統進入 OFFLINE FALLBACK MODE
**And** 禁用 Routine 訂單，允許 緊急發血 (加密暫存)
**When** 網路恢復，自動將 LocalEventId 同步至伺服器並更新雲端庫存

## 醫療政策需人工確認項目
- 離線時，是否允許血型未知直接釋出 O RhD negative？(系統僅實作機制，決定參數依院方設定)。
