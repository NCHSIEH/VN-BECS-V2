# SOP10 System Scope & PRD Analysis (Prompt 0)

## 1. 系統範圍確認
本案為「越南智慧血液供應鏈數位轉型先導計畫」之核心模組：**SOP10 醫院專屬 B2B 網際網路用血訂購與調度平台**。
定位為 **Overlay Middleware / Dispatch Hub**，不汰換現有 HIS/LIS，而是補足醫院與血液中心資訊斷層，支援線上訂購、調度、電子揀貨、追蹤及離線發血等。

## 2. 核心模組拆解
- 醫院端 (Hospital Demand Portal): 儀表板、Routine/ASAP/STAT/MTP訂購、到貨驗收、離線模式。
- 血液中樞端 (Dispatch Hub): 訂單佇列、HICI 配血建議(AI 輔助)、HITL 人工審批、電子揀貨、出庫與物流。
- 共用基礎: Product Catalog (ISBT 128), Audit Trail, 報表與權限管理。

## 3. 使用者角色與權限矩陣
**醫院端:**
- 操作員: 查詢、訂購、驗收、離線建立。
- 主管: 覆核 STAT/MTP、異常驗收。
- 醫師: 發起/授權 MTP。
**中心端:**
- 接單員: 初審 Routine/ASAP。
- 調度員: AI建議查看、Approve、Override、調撥。
- 醫療主管: 覆核高風險與異常 (MTP, 大量 O RhD-, Override)。
- 倉管/出庫員: 電子揀貨、掃描出庫。
- QA/稽核員: 查詢 Audit trail、異常報表。

## 4. 主要資料流
`醫院訂購` -> `中心接單與 HICI AI 計算建議` -> `調度員 HITL 人工審核 (高風險進 Dual Review)` -> `倉儲出庫/電子揀貨與條碼比對` -> `物流追蹤` -> `醫院到貨掃描驗收`。另含網路中斷時之 `離線發血與後續同步 (Reconciliation)`。

## 5. 必須先確認的醫療政策與法規問題
- 離線緊急發血政策 (例如針對未知血型患者優先給予 O RhD- 或 O RhD+ 的醫院預設政策)。
- 冷鏈異常標準與報廢/審核規範。
- AI Override 的差異閾值 (何時需 escalated 到醫療主管)。
- 罕見血型分配與替代血品優先級政策。

## 6. MVP 開發優先順序
1. 基礎權限管理與 Product Catalog (ISBT 128)。
2. Hospital Dashboard 與 Routine/STAT 訂購單。
3. Dispatch Hub 基本佇列與 HITL 審批。
4. Barcode Scan Mock (出庫與到貨核心流程)。
5. AuditEvent Mock 與不可刪除機制。

## 7. 規格不清楚或有風險之處
- API 串接現有醫院系統之具體網路授權問題。
- 離線模式 Offline Fallback 以 Browser 為主還是需打包為原生 App (PWA)。
- 針對不同廠牌冷鏈 IoT 溫度回傳資料格式的整合方式。

---
**紅線檢查：**
- [x] AI 不可自動核准發血。
- [x] MTP/離線/Override 需保留人工審批與 audit trail。
- [x] ISBT 128 代碼不可硬編。
- [x] 需標示高風險臨床規則以供院方確認。
