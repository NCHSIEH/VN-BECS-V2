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

## 5. 一句話現況

捐血系統（LIMS 四分頁）UI/UX + 三語 + 合規優化完成並上線；程式碼「乾淨優化」大致到頂；剩餘主要為其他子系統在地化、效能（實庫）、與 Tier B 上線正確性工作（RLS/交易/多軸，需實庫）。
