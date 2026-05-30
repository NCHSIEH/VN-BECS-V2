# Session Checkpoint — 2026-05-29 (resume tomorrow)

目的：記錄今日工作狀態與下一步，明天可直接接續，不需重新研究整個系統。
先讀本檔，再讀 `CODEX_OPTIMIZATION_CHECKPOINT.md`、`REQUIREMENTS_TRACEABILITY_MATRIX.md`、`PILOT_GOLIVE_PLAN.md`。

## 1. Git / 部署狀態

- 分支：`main`（HEAD = `c9f7f28`），與 `origin/main` **完全同步且已推送**。
- 功能分支 `optimize/maintainability-security-pass` 仍在遠端（內容已併入 main，可保留作審閱）。
- **已部署**：push `main` 觸發 Firebase App Hosting 自動建置（專案 `becs-v1` / 後端 `vn-becs-prod` / asia-east1）。
  - 線上 URL：https://vn-becs-prod--becs-v1.asia-east1.hosted.app
  - 最後確認 `/api/health` = healthy（database/api/storage operational）。
  - ⚠️ 明天先到 Firebase Console → App Hosting → vn-becs-prod 確認**最後一次 rollout（c9f7f28）建置綠燈成功**（此 CLI 版本無 `rollouts:list`）。
- 驗證基線：`npm test` = **238/238 通過（38 檔）**；`npm run build` = 生產編譯成功。

## 2. 今日完成（已 commit 並上線）

| commit | 內容 |
|---|---|
| `5f13cf5` | repo 衛生：gitignore + 取消追蹤 test-results/playwright-report/scratch |
| `275ccdc` | **安全 AUTH-03**：`authorizeFacilityScope` 接入 issue/crossmatch/orders 路由（防禦縱深層）；新增 `facilityIdOf`/`facilityScopeErrorBody`；`rlsContext.ts`（DB RLS GUC 原語，fail-closed）；migration 001 backfill 補舊狀態別名；`verifyPassword` 生產拒絕明文；+12 測試 |
| `7af8fd1` | **去重重構**：db.ts 抽 `readWithFallback`/`writeWithFallback`（1864→1413 行，~14 store）；inventoryRepo `getByUnitId`；push-events 表驅動（487→272）；i18n.tsx 拆 `i18nFallbackDict.ts`（2568→177）；SuperuserDBConsole 抽 `.data.ts`（1253→878） |
| `53dbf41` | **捐血登錄 UX/合規**：12 週捐血間隔送出時強制（新 `validateDonationInterval`+6 測試）；採血量×體重 VN26 即時驗證+鈕停用；`generateValidCCCD`；註冊/採血表單三語化 |
| `c9f7f28` | **LAB/PROCESS/RELEASE 在地化+修復**：三分頁所有硬編碼英文三語化（含 SAFETY INTERLOCK 安全互鎖訊息，合規關鍵，42 鍵×3）；修 `throughputReadiness` 用錯欄位（`maintenanceStatus`→`status`）的 bug |

捐血系統四分頁（DONOR/LAB/PROCESS/RELEASE）現已**全面三語化**（EN/zh-TW/vi）。

### 後續續作（同日 session，已 commit；`9e30204` 之後）

| commit | 內容 |
|---|---|
| `9e30204` | 本檢查點文件（docs） |
| `0bce44a` | **臨床安全 i18n**：BedsideVerificationView（t()=0→全三語，含雙人核對/臨床前置安全阻斷訊息）、CrossmatchView（補 useI18n、全三語、方法說明/gating 錯誤）；**bug 修正**：crossmatch 病人清單原抓不存在的 `/api/v1/mdm/patients`→改 `/api/v1/patients` |
| `4acb564` | **HemovigilanceView 全三語**（不良反應通報/嚴重度/lookback/預防性隔離 confirm+success/監測日誌） |

臨床安全三元件（床邊驗證、配血、血液警訊）現已**全面三語化**。
⚠️ 注意：`0bce44a`、`4acb564` 等「續作」commit **尚未推送/部署**（origin/main 仍在 `c9f7f28`）。明天可一併 push 觸發 App Hosting 建置。

### 各子系統 i18n 覆蓋現況
**✅ 全部臨床操作子系統已三語化完成**（EN / zh-TW / vi）：
DonorCenterSimulator（LIMS 四分頁）、Bedside、Crossmatch、Hemovigilance、Reconciliation、HospitalInventory、HospitalOperator、MtpEmergency、IssueReturn、RareDonor、Dispatcher、Warehouse。

i18n 續作 commit（`14bcaa9` 之後，皆已推送上線）：
- `0e3...`（reconciliation + hospital inventory）、`20e816b`（hospital operator）、`4d65798`（MTP 全套含 CDSS 攔截覆蓋層）。
- E2E 對齊：`cdss-alert.spec.ts`、`lims-happy-path.spec.ts` 加入 `addInitScript` 強制英文語系，並修 `HUB INTRANSIT`→`HUB IN-TRANSIT` 斷言（兩 spec 原本就紅、需執行中 server+DB 才能跑）。

### i18n 慣例備忘（重要）
- 新 UI 文案一律 `t('key', { var })` + 在 `src/lib/i18nFallbackDict.ts` 三語補鍵（用小腳本在三個語言區塊開頭插入，避免逐一手改）。
- 子元件（module-level function，無法用 useI18n hook）→ 將 `t` 當 prop 傳入（見 MtpCaseCard、GuidelineItem）。
- 元件單元測試 mock `t:(k)=>k`，斷言要對「鍵名」；E2E 則用 `addInitScript` 設 `becs_lang='en'` 後對英文值斷言。

## 3. 下一步候選（明天可挑）

依先前分析的優先序：

1. **其他子系統 UI/UX/合規優化**（同捐血系統作法）：HUB 調度（DispatcherView/WarehouseView）、醫院端（HospitalOperatorView/HospitalInventoryView）、床邊驗證（BedsideVerificationView）、MTP（MtpEmergencyView）、Hemovigilance、Crossmatch。多數同樣有硬編碼英文 + 可補的即時驗證。
2. **效能（規模化前）**：API 路由仍有 127 處 `getAll().find()` 全表掃描（如 crossmatch 單請求 5 次全表）。為熱路徑加 `getByX`，僅對實庫有感。
3. **Tier B 上線阻斷點（需實庫，非純優化）**：
   - **AUTH-03 DB 層 RLS 真正生效**：目前 service_role 繞過 RLS；`rlsContext.applyFacilityScope` 原語已備，待提供非-BYPASSRLS 連線 + 路由接線 + 跑 `db-migrations/001_tests.sql` 取證。
   - **STATE-03 真多表交易原子性**、**STATE-04 多軸欄位寫入**（`executeBloodUnitTransition` 仍寫單一 status 欄）。
4. **型別安全**：434 處 `: any`/`as any`，建議漸進補。
5. **DonorCenterSimulatorView 結構拆分**（1500+ 行單一元件）：需先補元件測試再拆，否則回歸風險高。

## 4. 重要註記 / 雷區

- **i18n 測試慣例**：元件測試 mock `t: (key) => key`，所以斷言要對「翻譯鍵」而非英文字面（見 `frontendComponentValidation.test.tsx`）。新增 UI 文案一律走 `t()` + 在 `src/lib/i18nFallbackDict.ts` 三語補鍵。
- **db.ts 刻意保留手寫的 store**（含特殊邏輯，勿硬套 helper）：users（缺欄重試）、auditEvents（雜湊鏈）、donations（豐富化）、components.getAll（abo/rhd 映射）、transportJobs（溫度合併）、reconciliationReports（JSON）、offlineEvents（舊 schema）、orderRepo/patientRepo（多表）。
- **部署 = push main**（App Hosting 自動建置）。純 docs 變更不必每次 push 觸發建置。
- 生產 fail-closed：`NODE_ENV=production` 停用 demo 登入與記憶體 fallback，強制 RBAC，缺 `VN_BECS_SESSION_SECRET`(≥32) 無法簽 token。
- 本機跑 dev：`npm.cmd run dev`（PowerShell 的 npm.ps1 入口問題），port 54321。

## 4b. 效能 / Tier B / 型別（續作，已推送 ≤ `4dbdfdb`）

- **效能**：熱路徑全表掃描收斂。新增 `queryHelpers.ts`（`resolveOne`/`byIdIfAvailable`），改寫 crossmatch（5 次全表→目標查詢）、issue、bedside-verify、orders action。新增 repo 目標查詢：`patientRepo.getById`、`donations.getById`、`donors.getById`、`orderRepo.getById`。**僅對實庫有感**。
- **Tier B / STATE-04**：`executeBloodUnitTransition` 現會派生多軸快照（quality/inventory/assignment）並與舊 `status` 並存寫入 inventory（+best-effort components）。RTM-STATE-04 仍 🟠（待實庫驗證欄位落地）。
- **型別**：`resolveOne` 泛型化、命令服務 `extraInventoryFields` 收緊。廣泛 `any`（db.ts 101 個多屬動態 DAO）屬漸進大工程，未動。
- **Tier B 骨架已寫好（gated，預設不啟用，零風險）**：
  - `src/server/pg.ts`：延遲建立的 `DATABASE_URL`（直連）/`SCOPED_DATABASE_URL`（非-BYPASSRLS）連線池，未設定回 null。
  - `transactionalTransition.ts`：STATE-03 單一 `BEGIN…COMMIT` 原子交易（列鎖+樂觀版本+雜湊鏈稽核），接入 `executeBloodUnitTransition`（回 null 則沿用現狀）。
  - `rlsContext.runScoped`：AUTH-03 scoped 交易查詢路徑（設 GUC）。
  - 純邏輯測試：`transactionalTransition.test.ts`(6)、`runScoped.test.ts`(4)。
  - **啟用/驗證**：設 `DATABASE_URL`/`SCOPED_DATABASE_URL`（見 `.env.production.example` 與 `DB_MIGRATION_WORK_PACKAGE.md`「如何在測試 DB 驗證」），需先跑 migration 001。
  - **仍待實庫**：跑驗證取證（跨機構 SELECT 回 0 列、稽核不可改、強制中途失敗驗回滾），把 STATE-03/AUTH-03 由 🟠 改 ✅。

## 4c. 下午延伸 session（已全部推送上線，HEAD `4597569`）

順序：型別/效能/Tier B → security+code review → TRACE-01 → OFF-01 → STATE-02。

| commit | 內容 | RTM |
|---|---|---|
| `4dbdfdb` | orders.getById（效能）+ STATE-04 多軸寫入器接入命令服務（+2 測試） | STATE-04 🟠 |
| `7c483b8` | **Tier B 骨架（gated、零風險）**：`pg.ts` 延遲連線池、`transactionalTransition.ts` 單一 `BEGIN…COMMIT` 原子交易、`rlsContext.runScoped`；+10 測試 | STATE-03/AUTH-03 🟠 |
| `0a693c7` | **security review 發現並修復**：`patients.getById` PostgREST `.or()` 過濾注入（可解析到錯誤病人）→ 加字元集限制 + 回歸測試 | — |
| `f5bb976` | **TRACE-01 後端**：`services/traceability.ts` 雙向追溯（forward/backward）+ `GET /api/v1/trace`（RBAC）+5 測試 | TRACE-01 🟠 |
| `a58da05` | **TRACE-01 前端**：`TraceabilityPanel` 嵌入 HemovigilanceView（三語） | TRACE-01 🟠 |
| `dcc150f` | **OFF-01 離線硬化**：HMAC 事件簽章（gated）、過期送審、緊急命令白名單；+8 測試 | OFF-01 🟠 |
| `4597569` | **STATE-02 直寫回歸防線**：靜態掃描路由 vs allowlist 棘輪；+2 測試 | STATE-02 ✅ |

**驗證基線**：`npm test` = **267/267**；`npm run build` 綠燈；線上 healthy。

### 新增環境變數（皆 OPTIONAL，未設 = 維持現狀；見 `.env.production.example`）
- `DATABASE_URL`（STATE-03 原子交易）、`SCOPED_DATABASE_URL`（AUTH-03 RLS，非-BYPASSRLS 角色）
- `VN_BECS_OFFLINE_SIGNING_SECRET`、`VN_BECS_OFFLINE_MAX_AGE_HOURS`（OFF-01）

### 下午 session 下一步候選（純程式、可在此驗證）
1. **TRACE-01 端到端測試 / reviewer 簽核**（讓它 🟠→✅）
2. **XM-02**：配血改 join 成分實測 ABO（DB 層）
3. **型別安全分批清理**（FhirAdapter 11、orderRepo 30 個 `any` 等，一次一模組）
4. **VAL-01 起點**：建「需求→測試→IQ/OQ/PQ 證據」報表骨架
5. 仍需實庫：跑 `001_tests.sql` + 新 Tier B env 取證（STATE-03/04、AUTH-03、AUD-01）

## 4d. Chrome 實測發現的關鍵問題（已修，HEAD `f847ee1`）

用 Chrome 模擬使用者實測，抓到兩個自動測試無法發現的線上問題：

### ⚠️ i18n CRLF bug（最重要）— 已修
- **根因**：`src/lib/i18nFallbackDict.ts` 是 **CRLF 行尾**，所有補鍵腳本（匹配 `'  en: {\n'`）**靜默失敗**（回報成功但沒寫入）。結果本/前 session 加的 ~298 個臨床子系統 i18n 鍵**從未進字典**，線上全顯示原始鍵名（如 `lims_hdr_registry_control`、`bv_title`）。
- **為何沒被發現**：`t()` 缺鍵回傳鍵名（不報錯）、單元測試 mock 也回傳鍵名、build 不檢查字典完整性 → **只有 Chrome 實測抓得到**。
- **修法**：新增 `src/lib/i18nSupplement.ts`（**317 鍵 × EN/繁中/越南文**，獨立檔避開 CRLF），在 `i18n.tsx` 的 `t()` 合併查找。缺失鍵 298→~11（剩餘為動態 `t(變數)`/誤判）。瀏覽器驗證 0 原始鍵。
- **⚠️ 教訓**：日後補 i18n 鍵**改用 `i18nSupplement.ts`**（直接編輯該檔的物件），**不要**再對 CRLF 的 `i18nFallbackDict.ts` 跑 `\n` 字串替換腳本。

### ⚠️ 正式環境登入失敗 — 已備修法
- **根因**：生產 `NODE_ENV=production` 下 (1) demo 登入（admin/admin123）停用、(2) 我加的安全硬化拒絕**明文密碼**；但 `seed_data.sql` 帳號密碼是明文 `123` → 全部 401。
- **修法**：`seed_data.sql` 已改存 bcrypt('123')（commit `c3121c6`，`ON CONFLICT DO UPDATE` 可修既有列）。**線上庫需手動跑一次** Supabase SQL：
  `UPDATE users SET password = '$2b$10$PiZhGQIUqvOwDR/3fsPG2.Mj/llp4UwUndKeTpkSMJ.ROZFO3zKPS' WHERE password = '123';`
  之後發布的帳密（admin/123、manager/123…）即可登入（密碼不變，只是改存雜湊）。

### i18n 覆蓋現況
✅ 臨床操作子系統 + Portal 指示/任務佇列已三語化（透過 supplement）。
🔶 **仍混雜英文（外觀，不影響功能）**：Portal 系統卡片狀態徽章（High Volume/Live Sync…）、抬頭（HOSPITAL NODE COMMAND/CLINICAL FLOW/LIMS STAGES）、角色名（Hospital Operator…）約 30+ 字串 → 下次補（加到 `i18nSupplement.ts` + 元件接 `t()`）。

## 5. 一句話現況

捐血系統（LIMS 四分頁）UI/UX + 三語 + 合規優化完成並上線；程式碼「乾淨優化」大致到頂；剩餘主要為其他子系統在地化、效能（實庫）、與 Tier B 上線正確性工作（RLS/交易/多軸，需實庫）。
