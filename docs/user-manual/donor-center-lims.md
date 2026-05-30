# 捐血中心 LIMS 使用手冊

**文件編號：** UM-LIMS-01  
**版本：** 1.0  
**更新日期：** 2026-05-30  
**系統版本：** VN-BECS V2  
**對應元件：** `src/components/DonorCenterSimulatorView.tsx`

---

## 1. 子系統概述

捐血中心 LIMS（Laboratory Information Management System）模擬 eProgesa 平台，負責管理捐血者從報到到血液成分發送至 Hub 的完整臨床流程。

本系統遵循：
- **VN26**（越南衛生部血液安全規範）
- **AABB** 技術手冊（捐血間隔、採血量標準）

### 工作流程架構

```
[DONOR 登記] → [LAB 檢測] → [PROCESS 製備] → [RELEASE 發血]
```

| 段落 | 頁籤 | 功能 |
|------|------|------|
| **DONOR** | 登記管理 | 捐血者登記、健康問卷篩檢、靜脈穿刺排隊派送 |
| **LAB** | 臨床診斷 | IDM 血清學檢測（CLEARED / REACTIVE / PENDING） |
| **PROCESS** | 成分製備 | 離心製備 RBC / FFP / PLT，triage 座椅管理 |
| **RELEASE** | 監管鏈 | 血液成分發送至 Hub，監管鏈交接驗證 |

---

## 2. 功能清單

| 功能 | 狀態 | 說明 |
|------|------|------|
| 捐血者登記（新增） | ✅ | POST `/api/v1/lims/donors` |
| 捐血者資料編輯 | ✅ | PUT `/api/v1/lims/donors/[id]`（2026-05-30 新增） |
| 捐血者列表查詢 | ✅ | GET `/api/v1/lims/donors` |
| 健康問卷篩檢 | ✅ | 隨登記表單送出，儲存至 questionnaires 資料表 |
| 派送至靜脈穿刺椅 | ✅ | Auto / Shared / Direct 三種模式 |
| 排隊管理（等候池） | ✅ | PUT/DELETE `/api/v1/lims/queues/[id]` |
| IDM 血清學送檢 | ✅ | POST `/api/v1/lims/lab-tests/[id]/run` |
| 成分製備（離心） | ✅ | POST `/api/v1/lims/process-component/[id]` |
| Hub 成分發血 | ✅ | POST `/api/v1/lims/components/[id]/release` |
| 吞吐量就緒指標 | ✅ | 即時 KPI 儀表板（右上角百分比） |

---

## 3. 操作流程

### 流程 1：捐血者登記

1. 點選頁籤 **DONOR**
2. 點選右上角 **Register Donor（登記捐血者）** 按鈕
3. 填寫或掃描以下欄位（見 §4 欄位規格）
4. 系統會即時驗證 CCCD、年齡、體重
5. 完成健康問卷（勾選暫緩條件）
6. 若有暫緩項目，畫面即時顯示紅色警示
7. 點選 **Initialize Record（建立紀錄）**
8. 若未暫緩：自動跳出派送對話框 → 選擇派送模式 → 確認
9. 若已暫緩：顯示已登記通知，禁止採血

### 流程 2：派送至靜脈穿刺椅

派送模式有三種：

| 模式 | 說明 |
|------|------|
| **Auto** | 系統自動選擇最短佇列的椅子（負載均衡） |
| **Shared** | 捐血者加入共用等候池，等待護士呼叫 |
| **Direct** | 直接指定特定椅子編號 |

在 **PROCESS** 頁籤，每張椅子顯示目前分配的捐血者。空椅子可點選「呼叫下一位」從等候池取下一位。

### 流程 3：IDM 血清學檢測

1. 點選頁籤 **LAB**
2. 找到狀態為 **PENDING** 的捐血記錄
3. 點選 **Process Diagnostics（送檢）**
4. 系統會：
   - 檢查試劑是否過期（過期則觸發安全閘門）
   - 檢查分析儀維護狀態（需維護則觸發安全閘門）
   - 送出樣本至參考實驗室（IDM Testing 模組完成後回寫）
5. IDM 狀態：`PENDING` → `CLEARED`（安全）或 `REACTIVE`（生物風險）

> **注意：** REACTIVE 的捐血記錄在 PROCESS 頁籤會標示「QUARANTINE RESTRICTED」，無法進行成分製備。

### 流程 4：成分製備

1. 點選頁籤 **PROCESS** → 向下滾動至「成分製備」表格
2. 找到 IDM 狀態為 **CLEARED** 的捐血記錄
3. 點選 **Fabricate Components（製備成分）**
4. 系統製備 RBC / FFP / PLT（依捐血類型）
5. 成功後提示前往 RELEASE 頁籤

### 流程 5：Hub 發血移交

1. 點選頁籤 **RELEASE**
2. 找到狀態 **READY（待發）** 的血液成分
3. 點選 **RELEASE TO HUB（發送至 Hub）**
4. 系統：
   - 驗證成分未過期（已過期則回傳 400 TRANSITION_BLOCKED）
   - 將狀態更新為 `HUB IN-TRANSIT`
   - 寫入稽核記錄

---

## 4. 介面欄位規格

### 4.1 捐血者登記表單

| 畫面/區塊 | 欄位名稱 | 欄位型態 | 必填 | 預設值 | 驗證規則 | 備註 |
| :--- | :--- | :--- | :- | :-- | :--- | :--- |
| 捐血者登記 | 姓名 | 文字 | ✅ | — | 越南姓名格式；不得含數字或特殊符號 | 自動轉大寫 |
| 捐血者登記 | CCCD 身分證號 | 數字（12碼） | ✅ | — | 越南 CCCD 省碼驗證；需為 12 位數 | 可掃描晶片卡或手動輸入 |
| 捐血者登記 | 出生日期 | 文字（YYYY/MM/DD） | ✅ | — | 年齡須介於 18–65 歲（VN26） | 自動格式化分隔符 |
| 捐血者登記 | 性別 | 下拉選單 | ✅ | Male | Male / Female | 影響懷孕問卷顯示 |
| 捐血者登記 | 體重（KG） | 數字 | ✅ | — | 男性 ≥50 kg；女性 ≥45 kg | 影響採血量上限 |
| 捐血者登記 | 血型 | 下拉選單 | ✅ | O | O / A / B / AB | — |
| 捐血者登記 | RhD | 下拉選單 | ✅ | Positive | Positive / Negative | — |
| 健康問卷 | 近期刺青 | 勾選框 | — | 未勾 | 勾選 → 12 週暫緩 | — |
| 健康問卷 | 前往瘧疾區域 | 勾選框 | — | 未勾 | 勾選 → 12 週暫緩 | — |
| 健康問卷 | 身體不適 | 勾選框 | — | 未勾 | 勾選 → 臨時暫緩 | — |
| 健康問卷 | 高風險行為 | 勾選框 | — | 未勾 | 勾選 → 永久暫緩 | — |
| 健康問卷 | 近期疫苗 | 勾選框 | — | 未勾 | 勾選 → 4 週暫緩 | — |
| 健康問卷 | 近期牙科手術 | 勾選框 | — | 未勾 | 勾選 → 1 週暫緩 | — |
| 健康問卷 | 懷孕或哺乳 | 勾選框 | — | 未勾 | 勾選 → 永久暫緩 | 僅女性顯示 |

### 4.2 採血表單（靜脈穿刺）

| 畫面/區塊 | 欄位名稱 | 欄位型態 | 必填 | 預設值 | 驗證規則 | 備註 |
| :--- | :--- | :--- | :- | :-- | :--- | :--- |
| 採血 | 捐血袋編號 (DIN) | 文字 | — | — | ISBT-128 格式（如 =W0000 24 000000） | 可隨機產生 |
| 採血 | 採血量（mL） | 數字 | ✅ | 500 | 依體重：45–50 kg→250 mL；50–65 kg→350 mL；≥65 kg→450 mL（VN26） | 超出範圍時按鈕禁用 |
| 採血 | 採血方式 | 下拉選單 | ✅ | WholeBlood | WholeBlood / Apheresis | — |

### 4.3 派送對話框

| 畫面/區塊 | 欄位名稱 | 欄位型態 | 必填 | 預設值 | 驗證規則 | 備註 |
| :--- | :--- | :--- | :- | :-- | :--- | :--- |
| 派送 | 派送模式 | 選擇卡片 | ✅ | Shared | Auto / Shared / Direct | — |
| 派送 | 目標椅子 | 下拉選單 | 僅 Direct 必填 | Chair 1 | 依機構椅子數量動態產生 | — |

---

## 5. 臨床驗證規則

| 規則 | 標準 | 系統行為 |
|------|------|----------|
| CCCD 格式 | 12 碼，省碼有效（越南身分證標準） | 即時顯示錯誤，禁止送出 |
| 捐血者年齡 | 18–65 歲（VN26） | 即時顯示錯誤，禁止送出 |
| 捐血間隔 | ≥12 週（AABB） | 在 CCCD 輸入時即時檢查；送出時再次確認 |
| 採血量（WholeBlood） | 依體重分級（見 §4.2）（VN26） | 即時顯示錯誤，按鈕禁用 |
| IDM 封鎖 | 成分製備前 IDM 必須 = CLEARED | 前端禁用按鈕；後端回傳 403 IDM_NOT_CLEARED |
| 過期封鎖 | 已過期成分不得發血至 Hub | 後端回傳 400 TRANSITION_BLOCKED |
| 試劑過期閘門 | 試劑狀態 = Expired 時禁止 IDM 送檢 | 顯示紅色安全閘門警示 |
| 設備維護閘門 | 分析儀/離心機 = MaintenanceRequired 時禁止操作 | 顯示紅色安全閘門警示 |

---

## 6. 系統訊息與錯誤處理

| 情境 | 訊息類型 | 處理方式 |
|------|----------|----------|
| 捐血者登記成功（非暫緩） | 自動開啟派送對話框 | — |
| 捐血者登記成功（暫緩） | Toast 通知（黃色警示） | 禁止採血按鈕（灰色）|
| CCCD 格式錯誤 | 表單內紅色錯誤訊息 | 禁止送出 |
| 年齡不符 | 表單內紅色錯誤訊息 | 禁止送出 |
| 捐血間隔未滿 12 週 | 表單內紅色錯誤訊息 | 禁止送出 |
| 採血量超出範圍 | 表單內紅色錯誤訊息 | 採血按鈕禁用 |
| 安全閘門觸發（試劑/設備） | 全幅紅色警示框 | 必須點選「確認知悉」關閉 |
| IDM 未通過封鎖 | 紅色安全閘門警示 | — |
| Hub 發血成功 | 綠色 Toast | 狀態更新為 HUB IN-TRANSIT |
| API 錯誤（網路中斷） | 紅色訊息框 | 顯示 "Network error" |
| 等候池為空時呼叫下一位 | 紅色訊息框 | 顯示等候池為空提示 |

---

## 7. 權限與角色

| 角色 | LIMS 讀取 | 捐血者登記 / 編輯 | IDM 送檢 | 成分製備 | Hub 發血 |
|------|-----------|------------------|----------|----------|----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| LIMS_Simulator | ✅ | ✅ | ✅ | ✅ | ✅ |
| DonorScreener | ✅ | ✅ | — | — | — |
| Manager | ✅ | — | — | — | — |
| QA_Officer | ✅ | — | — | — | — |

> 測試帳號：`admin` / `123`（開發環境）

---

## 8. i18n 語系檢查（2026-05-30）

| 鍵前綴 | 三語覆蓋 | 備註 |
|--------|----------|------|
| `lims_err_*` | ✅ EN / zh-TW / vi | 驗證錯誤訊息 |
| `lims_form_*` | ✅ EN / zh-TW / vi | 表單標籤 |
| `lims_col_*` | ✅ EN / zh-TW / vi | 表格欄位標題 |
| `lims_btn_*` | ✅ EN / zh-TW / vi | 按鈕文字 |
| `lims_toast_*` | ✅ EN / zh-TW / vi | 通知訊息 |
| `lims_triage_*` | ✅ EN / zh-TW / vi | 靜脈穿刺 triage 介面 |
| `lims_gate_*` | ✅ EN / zh-TW / vi | 安全閘門警示 |
| `lims_status_*` | ✅ EN / zh-TW / vi | 狀態標籤 |
| `qst_*` | ✅ EN / zh-TW / vi | 健康問卷標題/選項 |

殘留硬編碼英文（2026-05-30 本次修正後）：

| 位置 | 內容 | 說明 |
|------|------|------|
| 任務橫幅（第 649 行） | "Site A Registration Overflow" | 模擬任務名稱，屬示範性內容，待確認是否需 i18n |
| 表格欄位 | "Abo/Rh" | 國際通用臨床術語，維持英文一致 |

---

## 9. 測試紀錄（2026-05-30）

| 測試項目 | 測試方式 | 測試結果 | 發現問題 | 修正狀態 |
| :--- | :--- | :--- | :--- | :--- |
| 捐血者登記（正常流程） | 程式碼檢查 + tsc | ✅ 通過 | — | — |
| 捐血者登記（重複 CCCD） | 程式碼檢查 | ✅ 自動載入現有資料 | — | — |
| 捐血者資料編輯 | 程式碼檢查 | ❌ 404 — PUT 路由不存在 | `PUT /lims/donors/[id]` 缺漏 | ✅ 已修正（新增路由） |
| CCCD 即時驗證 | 程式碼檢查 | ✅ 即時反饋 | — | — |
| 年齡驗證 | 程式碼檢查 | ✅ 即時反饋 | — | — |
| 捐血間隔 12 週封鎖 | 程式碼檢查 | ✅ 雙重驗證（輸入+送出） | — | — |
| 採血量驗證（VN26） | 程式碼檢查 | ✅ 即時禁用按鈕 | — | — |
| 暫緩規則（7 項） | 程式碼檢查 | ✅ 即時預覽 + 送出封鎖 | — | — |
| IDM 封鎖成分製備 | 程式碼檢查 | ✅ 前後端雙層封鎖 | — | — |
| Hub 發血（過期封鎖） | 程式碼檢查 | ✅ 後端 400 TRANSITION_BLOCKED | — | — |
| 安全閘門（試劑/設備） | 程式碼檢查 | ✅ 即時觸發警示 | — | — |
| i18n 語系切換 | 程式碼檢查 | ⚠️ 部分硬編碼英文 | 5 處硬編碼字串 | ✅ 已修正（10 個新鍵） |
| 派送成功訊息 | 程式碼檢查 | ⚠️ 硬編碼英文 | dispatch msg 硬編碼 | ✅ 已修正 |
| 暫緩 Toast 訊息 | 程式碼檢查 | ⚠️ 硬編碼英文 | 3 個 Toast 字串 | ✅ 已修正 |
| 安全閘門標題/按鈕 | 程式碼檢查 | ⚠️ 硬編碼英文 | Safety Gate Violation / Acknowledge | ✅ 已修正 |
| 空資料狀態 | 程式碼檢查 | ✅ 有空狀態提示 | — | — |
| API 錯誤處理 | 程式碼檢查 | ✅ catch 顯示錯誤訊息 | — | — |
| 問卷儲存靜默失敗 | 程式碼檢查 | ⚠️ catch 僅 console.error | 問卷失敗捐血者仍被建立 | 待確認 |

---

## 10. 已修正問題（2026-05-30）

| # | 問題 | 嚴重性 | 修正檔案 | 說明 |
|---|------|--------|----------|------|
| 1 | `PUT /api/v1/lims/donors/[id]` 路由缺漏 | 🔴 高 | `app/api/v1/lims/donors/[id]/route.ts`（新增） | 編輯捐血者資料時 404 |
| 2 | 捐血者資料編輯亦新增問卷歷史記錄 | 🔴 高 | 同上 | PUT 路由同時建立新問卷記錄 |
| 3 | 派送成功訊息硬編碼英文 | 🟡 中 | `DonorCenterSimulatorView.tsx:402` | → `t('lims_msg_dispatch_success')` |
| 4 | 暫緩 Toast 訊息硬編碼英文 | 🟡 中 | `DonorCenterSimulatorView.tsx:350-356` | → `t('lims_toast_deferred_*')` |
| 5 | 登記按鈕硬編碼英文 | 🟡 中 | `DonorCenterSimulatorView.tsx:686` | → `t('lims_btn_register_donor')` |
| 6 | 安全閘門標題 / 確認按鈕硬編碼 | 🟡 中 | `DonorCenterSimulatorView.tsx:695,698` | → `t('lims_safety_gate_title/acknowledge')` |
| 7 | 派送模式副標題硬編碼 | 🟡 中 | `DonorCenterSimulatorView.tsx:1487,1497,1507` | → `t('lims_triage_mode_*_sub')` |
| 8 | i18n 補鍵（10 個新鍵） | 🟡 中 | `src/lib/i18nSupplement.ts` | EN / zh-TW / vi 三語 |

---

## 11. 尚待確認事項

| # | 事項 | 說明 |
|---|------|------|
| 1 | 問卷儲存失敗靜默處理 | POST `/lims/donors` 第 109 行：問卷建立失敗時 catch 只記錄 console.error，捐血者記錄仍成功建立。需確認此行為是否符合 SOP（問卷為必要記錄或僅附加記錄？） |
| 2 | 任務橫幅「Site A Registration Overflow」 | 硬編碼示範任務名稱，是否需改為動態載入或 i18n？ |
| 3 | 採血量上限對 Apheresis 的規則 | 現有驗證邏輯針對 WholeBlood，Apheresis 上限規則待確認（待查 VN26 對應條款） |
| 4 | 問卷更新策略（PUT 路由） | PUT 路由目前新增一筆問卷記錄（保留歷史），而非覆蓋舊記錄。需確認是否符合稽核需求 |
| 5 | COLD-01 冷鏈 E2E 測試 | Gate 2 最後障礙，與本 LIMS 子系統的冷鏈部分相關，需實機環境驗證 |

---

## 附錄：相關 API 端點

| 方法 | 路徑 | 說明 | RBAC 角色 |
|------|------|------|-----------|
| GET | `/api/v1/lims/donors` | 捐血者列表 | Admin, Manager, QA_Officer, LIMS_Simulator, DonorScreener |
| POST | `/api/v1/lims/donors` | 新增捐血者 | Admin, LIMS_Simulator, DonorScreener |
| GET | `/api/v1/lims/donors/[id]` | 查詢單一捐血者 | Admin, Manager, QA_Officer, LIMS_Simulator, DonorScreener |
| PUT | `/api/v1/lims/donors/[id]` | 編輯捐血者資料 | Admin, LIMS_Simulator, DonorScreener |
| GET | `/api/v1/lims/queues` | 等候佇列列表 | — |
| POST | `/api/v1/lims/queues` | 新增至佇列 | — |
| PUT | `/api/v1/lims/queues/[id]` | 更新佇列狀態 | — |
| DELETE | `/api/v1/lims/queues/[id]` | 移除佇列項目 | — |
| POST | `/api/v1/lims/collect` | 記錄採血 | — |
| GET | `/api/v1/lims/donations` | 捐血記錄列表 | — |
| GET | `/api/v1/lims/components` | 血液成分列表 | — |
| POST | `/api/v1/lims/process-component/[id]` | 成分製備 | — |
| POST | `/api/v1/lims/components/[id]/release` | Hub 發血移交 | — |
| GET | `/api/v1/lims/questionnaires` | 問卷列表 | — |
| POST | `/api/v1/lims/lab-tests/[id]/run` | IDM 送檢 | — |

---

> **PDF 轉換說明：** 本文件為 Markdown 格式。如需 PDF 版本，請執行：
> ```bash
> npx markdown-pdf docs/user-manual/donor-center-lims.md
> # 或
> pandoc docs/user-manual/donor-center-lims.md -o docs/user-manual/donor-center-lims.pdf
> ```
