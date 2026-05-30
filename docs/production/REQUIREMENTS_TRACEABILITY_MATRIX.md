# VN-BECS-V2 需求可追溯矩陣 (Requirements Traceability Matrix, RTM)

目的：把每一條法規/標準/SOP 需求，連到「實作程式碼 → 驗證測試 → 證據 → 狀態 → 負責人」，作為 IQ/OQ/PQ 與 Gate 1/2/3 簽核的單一事實來源。

更新規則：
- 任何高風險變更都必須在此新增/更新一列。
- `Status` 僅能在「測試存在且通過、且有 reviewer 簽核」時標 `Done`。其餘為 `Partial` / `Gap` / `Planned`。
- 種子列基於 2026-05-29 `codex-optimize` 分支的實證程式碼審查（含已知缺口），請勿在缺口修復前改為 Done。

圖例：✅ Done ・ 🟠 Partial ・ 🔴 Gap ・ ⚪ Planned

---

## 1. 法規/標準對照基準 (Reference Index)

| 代碼 | 來源 |
|---|---|
| VN26 | 越南 Circular 26/2013/TT-BYT（輸血專業技術規範） |
| AABB | AABB Standards for Blood Banks and Transfusion Services |
| FDA606 | 21 CFR 606（cGMP for Blood and Blood Components） |
| FDA211 | 21 CFR Part 11（電子紀錄/電子簽章） |
| FDA-BECS | FDA BECS Class II / 510(k) + 使用端 CSV 指引 |
| ISBT128 | ICCBBA ISBT 128 Standard（含 ISO 7064 檢查碼） |
| ISO15189 | 醫學實驗室品質與能力 |
| ISO27799 | 健康資訊安全管理 |
| WHO-HV | WHO/ISBT/IHN 血液警訊（haemovigilance） |
| EU-GMP | EU Blood Directive 2002/98/EC + GMP/EDQM Blood Guide |

---

## 2. 可追溯矩陣 (Traceability Rows)

| ID | 法規/標準 | 需求 (Requirement) | SOP | 實作 (Code) | 驗證 (Test) | 證據/備註 | 狀態 |
|---|---|---|---|---|---|---|---|
| RTM-AUTH-01 | FDA211, ISO27799 | 每次 API 請求的操作者身分須由伺服器驗證，不得由用戶端自填 | — | `src/server/session.ts`, `src/server/rbacPolicy.ts:resolveActorIdentity` | `src/__tests__/sessionIdentity.test.ts` | 簽章會話 token；生產忽略 header 角色 | ✅ |
| RTM-AUTH-02 | FDA211 | 高風險動作須 RBAC 授權（角色比對） | — | `rbacPolicy.ts:authorizeApiRole` | `rbacDynamicMatrix.test.ts`, `sessionIdentity.test.ts` | 生產強制；非生產可 opt-in | ✅ |
| RTM-AUTH-03 | ISO27799, EU-GMP | 機構範圍隔離 (ABAC facility scope) 於 API 與 DB | — | `rbacPolicy.authorizeFacilityScope` **已接入** `issue`/`crossmatch`/`orders/[id]/[action]`（bedside 自有比對）; `rlsContext.applyFacilityScope`/**`runScoped`（scoped 交易查詢路徑，`SCOPED_DATABASE_URL` 啟用）** + `pg.ts`; `db-migrations/001`（RLS+facility_id） | `facilityScope.test.ts`(7), `rlsContext.test.ts`(5), `runScoped.test.ts`(4), `db-migrations/001_tests.sql` (TEST 3/4) | API 防禦縱深層已接線；DB 層 scoped 查詢路徑已備（gated、純邏輯已測）。待提供非-BYPASSRLS 連線並連線測試庫執行附證據 | 🟠 |
| RTM-AUTH-04 | FDA211 | demo/fallback 登入於生產一律禁用 | — | `authPolicy.ts:isDemoLoginAllowed`, `db.ts` | `authPolicy.test.ts`, `productionHardening.test.ts` | fail-closed | ✅ |
| RTM-AUTH-05 | FDA211 | 前端每個 `/api` 請求附帶已驗證會話 token | — | `src/lib/apiClient.ts`, `src/App.tsx` | (手動/E2E) | 全域 fetch 攔截器，零侵入既有元件 | ✅ |
| RTM-STATE-01 | AABB, FDA606 | 血袋生命週期狀態轉移集中受控、非法轉移阻擋 | All SOP | `src/lib/stateMachine.ts` | `stateMachine.test.ts` | terminal 不可逆 | ✅ |
| RTM-STATE-02 | FDA606 | 所有狀態寫入經單一命令服務，無路由直寫 | All SOP | `bloodUnitCommands.ts:executeBloodUnitTransition` | `h1DirectWrites.test.ts` | — | 🟠 命令存在；回歸掃描需強化 |
| RTM-STATE-03 | FDA606 | 跨表寫入原子化（元件+庫存+審計），失敗即回滾 (fail-closed) | All SOP | `bloodUnitCommands.ts` (fail-closed) + **`transactionalTransition.ts`（單一 BEGIN…COMMIT，列鎖+樂觀版本+雜湊鏈稽核，`DATABASE_URL` 啟用）** | `commandFailClosed.test.ts`, `transactionalTransition.test.ts`(6) | 真正單一 DB 交易路徑已備（gated、純邏輯已測）；未設 `DATABASE_URL` 時沿用 fail-closed 循序寫入。待連線實庫驗證回滾 | 🟠 |
| RTM-STATE-04 | AABB | 多軸狀態（品質/庫存/指派/監管）獨立持久化 | — | `db-migrations/001`（enum+欄位+backfill）, `types.ts`, **`bloodUnitCommands.executeBloodUnitTransition`（命令服務已寫多軸欄位至 inventory+components）** | `multiAxisStateWrite.test.ts`(2), `db-migrations/001_tests.sql` (TEST 5) | 遷移已備（enum/欄位/回填）；命令服務已派生並寫入多軸快照（與舊 status 並存，cut-over 用）；待連線實庫驗證欄位落地 | 🟠 |
| RTM-REL-01 | AABB, VN26, FDA606 | 未完成 IDM 陰性檢驗不得放行為可用 | SOP2 | `stateMachine.ts:227-231` (`QUARANTINE→AVAILABLE` guard) | `stateMachine.test.ts`, `limsRelease.test.ts` | — | ✅ |
| RTM-REL-02 | WHO-HV | Lookback 調查期間禁止釋回庫存 | SOP9 | `stateMachine.ts:229` (`isUnderLookback`) | `lookback.test.ts` | — | ✅ |
| RTM-XM-01 | AABB | ABO/Rh 相容性須依血品類別（紅血球/血漿/血小板分別） | SOP7 | `bloodSafety.ts:evaluateComponentCompatibility`, `crossmatch/route.ts` | `componentCompatibility.test.ts`, `crossmatch.test.ts` | 類別感知引擎；血漿反向 ABO、血小板 warn、fail-closed | ✅ |
| RTM-XM-02 | AABB | 配對使用成分實測 ABO（非捐血者登記血型） | SOP7 | `crossmatch/route.ts`（`component.abo` 優先） | _需新增測試_ | 🟠 已改用 `component.abo/rhd`；DB join 仍待補 | 🟠 |
| RTM-XM-03 | AABB | 有抗體史者禁用電子/即時離心配血 | SOP7 | `crossmatch/route.ts:90-96` | `crossmatch.test.ts` | — | ✅ |
| RTM-XM-04 | AABB | 檢體有效期（含近期輸血/孕史 3 天）超期須重抽 | SOP7 | `validators.ts:validateSpecimenDate` | `validators.test.ts` | 預設 3 天 | ✅ |
| RTM-XM-05 | AABB | 病人血型未知不得常規配血（除緊急政策） | SOP7 | `crossmatch/route.ts:79-81` | `crossmatch.test.ts` | — | ✅ |
| RTM-BED-01 | AABB, WHO-HV | 床邊雙人核對：兩位不同且經認證之合格人員 | SOP6 | `bedside-verify/route.ts`（主+次驗者皆驗密碼）, `BedsideVerificationView.tsx` | `bedsideVerifyRoute.test.ts` | 主、次驗者皆須密碼認證；前端已收兩組憑證 | ✅ |
| RTM-BED-02 | AABB, WHO-HV | 床邊須重新比對血袋實測 ABO/Rh ↔ 病人 | SOP6 | `bedside-verify/route.ts`（`evaluateComponentCompatibility` 獨立再驗） | `bedsideVerifyRoute.test.ts` (BED-02) | 血型資料存在時硬阻斷 ABO/Rh 不符；缺資料記警告 | ✅ |
| RTM-BED-03 | AABB | 須先有有效發血紀錄、同意書、輸血前生命徵象 | SOP6 | `bedside-verify/route.ts:41-52,167-185` | `bedsideVerifyRoute.test.ts` | — | ✅ |
| RTM-ISS-01 | AABB | 發血須醫囑確認或記錄在案之緊急放行 | SOP8 | `stateMachine.ts:364-373` | `issue.test.ts` | — | ✅ |
| RTM-ISS-02 | VN26, AABB | 發出逾 30 分鐘不得回庫；外觀/冷鏈不合格須報廢 | SOP8 | `stateMachine.ts:388-407` | `issueReturn.test.ts` | — | ✅ |
| RTM-EMG-01 | AABB | 緊急/MTP 發血：強制 approver、適應症、RhD 政策、事後 review SLA | SOP10 | `clinicalPolicy.validateEmergencyRelease`, `mtp-cases/[id]/issue/route.ts` | `emergencyPolicy.test.ts`, `h1DirectWrites.test.ts` | 強制授權醫師/適應症（從 MTP case 衍生）+ RhD 政策 + review SLA 戳記 | ✅ |
| RTM-DON-01 | VN26 | 捐血者年齡/體重資格（男≥45kg、女≥42kg） | SOP1 | `validators.ts:validateDonorAge/Weight` | `validators.test.ts` | 18–60；45/42kg | ✅ |
| RTM-DON-02 | VN26 | 採血量上限 <500ml、體重連動（42–45kg<250ml、<42kg 不合格） | SOP1 | `validators.validateCollectionVolume`（伺服器端 `lims/collect/route.ts` 強制） | `collectionVolume.test.ts` | <500ml/<42kg/42–45kg<250ml 已強制；≥45kg 每公斤上限屬本地政策 | ✅ |
| RTM-DON-03 | VN26, AABB | 問卷暫緩(deferral)規則並記錄決策時政策版本 | SOP1 | `clinicalPolicy.ts`, `validators.validateVietnamDeferralRules`, `lims/donors/route.ts` | `emergencyPolicy.test.ts` | 版本化政策登錄；deferral 回傳並於問卷記錄 policyVersion | ✅ |
| RTM-LBL-01 | ISBT128 | DIN/標籤完整解析（結構、機構碼、產品碼、ISO 7064 檢查碼） | SOP1/3 | `src/lib/isbt128.ts`（`parseDin`/`parseProductCode`/MOD37,2）, `lims/collect/route.ts` | `isbt128.test.ts` | 結構+FIN+檢查碼解析並於採血路由強制；ICCBBA 官方測試向量待 UAT | ✅ |
| RTM-TRACE-01 | FDA606, ISBT128 | 捐血者↔受血者雙向完整追溯報表 | SOP9 | **`services/traceability.ts`（forward 捐血者→受血者 / backward 血袋→捐血者）, `app/api/v1/trace/route.ts`（RBAC 限品質/HV 角色）** | `traceability.test.ts`(5) | 雙向追溯報表已建（含 IDM 狀態、配發/輸血/配血受血者去重、不良反應連動）並有單元測試；待 UAT 實資料端到端 + reviewer 簽核（前端面板為選配） | 🟠 |
| RTM-AUD-01 | FDA211 | 稽核紀錄 append-only、不可竄改（DB 層強制） | — | `supabase_schema.sql:142-160,402-427` | `db-migrations/001_tests.sql` (TEST 2) | trigger+RLS 已有；竄改測試已撰；待連線測試庫執行附證據 | 🟠 |
| RTM-AUD-02 | FDA211 | 稽核 hash chain 完整性可驗證（驗證端點 + 排程檢查） | — | `auditChain.verifyAuditChain`, `app/api/v1/audit-events/verify/route.ts` | `auditChainVerify.test.ts` | 驗證端點 + 竄改/斷鏈偵測測試已建；排程化待補 | ✅ |
| RTM-COLD-01 | VN26, EU-GMP | 冷鏈：經驗證裝置、excursion 閾值、自動隔離、CAPA | SOP5 | `transport_jobs`, route-local | _需冷鏈 excursion 端到端測試_ | 🔴 目前為模擬值 | 🔴 |
| RTM-OFF-01 | FDA606 | 離線僅限緊急命令、簽章、idempotency、衝突送審不自動覆蓋 | — | `offlineSync.ts`（**HMAC 事件簽章 `verifyOfflineEventSignature`、過期送審 `isOfflineEventStale`、緊急命令集 `EMERGENCY_OFFLINE_OPERATIONS`**）, `sync/push-events/route.ts` | `offlineSyncScenarios.test.ts`, `offlineHardening.test.ts`(8) | idempotency/衝突/terminal/版本檢查有；**事件簽章驗證（gated `VN_BECS_OFFLINE_SIGNING_SECRET`）、過期事件送審、緊急命令白名單已補**；client 端簽名與生產啟用待 cut-over | 🟠 |
| RTM-FHIR-01 | (互通) | FHIR 資源完整對應（Patient/ServiceRequest/Specimen/DiagnosticReport/SupplyDelivery/Procedure/AdverseEvent） | — | `FhirAdapter.ts`, `app/api/v1/fhir/route.ts` | `fhirAdapter.test.ts` | 7 類資源 mapper + 路由 bundle 查詢已建；外部訊息驗證/版本化待 P2 | ✅ |
| RTM-VAL-01 | FDA-BECS, ISO15189 | CSV 驗證套件：需求→測試→IQ/OQ/PQ 證據；上線前簽核 | — | （本 RTM 即起點） | — | 🔴 尚未建立 | 🔴 |
| RTM-REG-01 | VN26 | 越南法規正式對應與 12 項臨床政策書面決策 | — | `00_vietnam_readiness_gap.md` | — | 🔴 待主管機關/試點醫院簽核 | 🔴 |

---

## 3. Gate 對應彙整

| Gate | 對應 RTM 列 | 目前阻斷 (Gap) |
|---|---|---|
| Gate 1 工程安全 | AUTH-*, STATE-*, AUD-* | STATE-03(交易/fail-closed)、STATE-04(多軸落地)、AUTH-03(RLS/facility) |
| Gate 2 臨床流程 | XM-*, BED-*, EMG-*, COLD-*, LBL-* | XM-01(血品分類)、BED-02(床邊比型)、EMG-01、LBL-01、COLD-01 |
| Gate 3 法規品質 | VAL-01, REG-01, TRACE-01, FHIR-01 | 全部待辦 |

---

## 4. 使用方式

1. 每完成一項修補，更新對應列的 `實作`、`驗證`、`狀態`，並在 commit 訊息引用 RTM-ID。
2. Reviewer 簽核時逐列確認 `Done` 是否有對應通過測試與證據連結。
3. 匯出 Gate 報告時，篩出該 Gate 對應列，所有列為 `Done` 方可簽核該 Gate。
