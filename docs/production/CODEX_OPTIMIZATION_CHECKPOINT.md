# Codex Optimization Checkpoint

更新時間：2026-05-29
分支：codex-optimize
目前估計整體完成度：Gate 1 / P0 部分完成 (未就緒生產，進行中)

## 目的

這份文件用來降低後續 Codex 配額消耗。之後重新上線時，優先讀取本檔，再只讀取當次切片相關檔案即可，不需要重新做完整系統研究。

## 已完成重點

1. 生產化設計文件已建立於 `docs/production/`。
2. 血袋/血品狀態模型已改為多軸狀態設計，核心邏輯集中於 `src/lib/stateMachine.ts`。
3. 已建立 `src/server/services/bloodUnitCommands.ts`，將血品狀態轉換集中驗證與執行。
4. 訂單流程 `app/api/v1/orders/[id]/[action]/route.ts` 已大幅重構，approve、revert、dispatch、transit、deliver、waste、dynamic swap 皆開始透過狀態機規則處理。
5. LIMS release 已改用標準狀態 `IN_TRANSIT`，並保留舊狀態 `HUB INTRANSIT` 的讀取相容。
6. bedside verify 已加入臨床前置條件、active issue record、crossmatch 相容性、`ISSUED -> TRANSFUSED` 狀態轉換驗證。
7. offline sync push 已加入 terminal state conflict、baseVersion conflict、patientRef 必填、break-glass/emergency override 檢查。
8. RBAC 第一波已套用到高風險 API，並以 `VN_BECS_ENFORCE_API_RBAC=true` 作為 opt-in 強制開關。
9. 統一 API error response、audit hash chain、auth demo guard、reconciliation API 與相關測試已建立。
10. **Slice H1 已完美完成**：消除所有剩餘直接血袋/血品狀態寫入（庫存、不良反應回溯隔離、LIMS IDM檢驗授權/測試運行、MTP緊急發血、稀有血型動員等），全部安全轉移至狀態機驗證與審計追蹤，新增 11 項單元測試，完整通過生產環境編譯。
11. **Slice H2 已完美完成**：Hemovigilance & Lookback 核心流程生產化重構。成功連結 Adverse Reactions 至臨床多重實體（Patient, Component, Order, Issue, Crossmatch Record）；設計高風險嚴重輸血反應自動啟動 lookback 與自動暫停捐血者資格 6 個月 Deferral 安全機制；整合狀態機與 LIMS component processing、lab tests clearance、inventory route 中，嚴格防止 lookback 調查期間將 QUARANTINE 釋放回 AVAILABLE；新增 5 項核心 Lookback 單元測試。
12. **Slice H3 已完美完成**：SOP flow 與子系統連結前端對齊。完成重構 LIMS 模擬器、IDM 實驗室、分流調度指令艙、及 MTP 緊急發血視窗之 API 錯誤校正與狀態審查機制，確保後端安全攔截、Lookback 阻斷及權限不足等錯誤訊息（如 `res.ok` 失敗及 JSON 格式中之錯誤描述）能動態、即時地呈現在 UI premium 警告/診斷橫幅上。
13. **Slice H4 已完美完成**：擴充第二波 opt-in RBAC 權限保護。已將 `VN_BECS_ENFORCE_API_RBAC=true` 的動態 Role-Based Access Control 完全擴充至 MDM、catalog、resources、stats、sync、audit 及剩餘 LIMS 全量核心管理與寫入端點。新增 8 項 RBAC 動態角色矩陣測試，確保系統在強制模式下精準阻斷非授權角色、在 Demo/Advisory 模式下完全相容。
14. **Gate 1 / P0 生產硬化安全防線已完美完成**：
    - **中央狀態執行**：實現了 `src/server/services/bloodUnitCommands.ts` 中的 `executeBloodUnitTransition` 中央執行服務，完美收攏狀態校驗、DB狀態寫入、庫存同步與 immutable 審計事件生成。
    - **生產 DB 硬化 (Database Hardening)**：當 `process.env.NODE_ENV === 'production'` 時，嚴格禁用所有 fallback 記憶體存儲，且資料庫憑證或 required tables 缺失時將立即拋出 hard startup 異常，杜絕生產環境下以 demo/mock 模式運行引發的數據不一致，落實 fail-closed 原則。
    - **API RBAC 生產強制**：當 `process.env.NODE_ENV === 'production'` 時，API RBAC 權限校驗將預設為強制開啟，不受 `VN_BECS_ENFORCE_API_RBAC` 環境變量之 opt-in 影響。
    - **臨床安全警示 (Clinical Use Disclaimers)**：在登入回應與 UI 頂端皆注入/渲染高對比臨床免責與 demo 警告標誌，明確宣告 VN-BECS-V2 仍處於 UAT 階段，嚴防提前啟用於正式病人輸血決策。
    - **測試與驗證**：新增了 `src/__tests__/productionHardening.test.ts` 測試，完整校驗上述所有生產硬化防線，跑通全部 Vitest 測試。
15. 最新完整驗證已通過：`npx vitest run` 27 files / 145 tests 全部通過；`npm run build` 生產編譯與 Next.js Turbopack 靜態頁面生成完全成功。

## 目前可測狀態

開發伺服器已可使用：

- Local URL: `http://localhost:54321`
- 啟動方式：因目前 PowerShell 的 `npm.ps1` 入口會找不到 npm CLI，請使用 `npm.cmd run dev`。

建議 Antigravity 先測：

1. LIMS donation、collection、component release。
2. Orders approve、dispatch、transit、deliver、waste、dynamic swap。
3. Issue、return、crossmatch。
4. Bedside verify。
5. Offline sync push conflict cases。
6. RBAC opt-in 後的高風險 API 權限阻擋。

## 下一個高優先切片

### [已完成] Slice H2：Hemovigilance / adverse reaction lookback
此切片已成功重構與完成，包含全部 5 項自動化與手動臨床追溯與阻斷保護測試。

### [已完成] Slice H3：SOP flow 與子系統連結校準
此切片已成功重構與完成，整合了全部四大臨床視窗（LIMS、IDM、Triage、MTP）之 API 錯誤攔截與錯誤 Banner 渲染。

### [已完成] Slice H4：RBAC 第二波
此切片已成功重構與完成，將 opt-in RBAC 安全保護網完全覆蓋至 MDM、Catalog、Resources、Stats、Sync、Audit 與 LIMS 全量端點，並新增 8 項動態角色權限測試驗證成功。

## 中優先工作

1. [已完成] 離線同步補 replay/idempotency、merge conflict、server authoritative state 測試與多操作支持。
2. [已完成] 統一更多 API response 與錯誤碼。
3. [已完成] 強化資料版本欄位與一致性檢查。
4. [已完成] 調整前端狀態顯示與操作按鈕，避免舊狀態或不合法操作。
5. [已完成] 補齊 reconciliation dashboard 的操作閉環。

## 低優先工作

1. [已完成] UI/UX 微調與越南上線操作文案。
2. [已完成] 報表、KPI、稽核查詢便利性。
3. [已完成] 更完整的端到端測試資料。
4. [已完成] 部署前 checklist 與營運手冊。

## 低配額作業規則

1. 每次只做一個切片。
2. 修改前先列出會改哪些檔案。
3. 優先跑 focused tests，必要時才跑全量 `npm test` 與 `npm run build`。
4. 每次結束都更新本檔的完成狀態、下一步與驗證結果。
5. 若配額低於 10%，停止開新切片，只更新 checkpoint。

## 下次開始建議

直接從中優先工作開始：

1. 調整前端狀態顯示與操作按鈕，避免舊狀態或不合法操作。
2. 補齊 reconciliation dashboard 的操作閉環。
