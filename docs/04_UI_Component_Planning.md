# 前端 UI Component 規劃 (Prompt 4)

## 技術疊代
React, Tailwind CSS, shadcn/ui. 支援 PWA。

## 主要頁面佈局 (Bento Grid)

### 1. Hospital Portal
- **Header:** 醫院名稱, 連線狀態 (Online/Offline), 使用者名稱.
- **DOS Dashboard (左側):** 顯示綠/黃/紅燈之庫存天數 (DOS), 緊急缺血類別, Quick Restock 按鈕.
- **Order Form (中下):** Routine / ASAP / STAT 分頁, Product Catalog 下拉選單.
- **MTP Panel (右上):** **[ACTIVATE MTP]** 紅色大按鈕 (二次確認), Active Case 卡片.
- **Tracking Timeline (下方):** 訂單狀態時間軸 (Submitted -> AI Proposed -> Dispatching -> Arrived).

### 2. Dispatch Hub
- **Global Header:** Active MTP Alerts (跑馬燈/醒目標示), FHIR/API Status.
- **Order Queue (左側):** 訂單卡片依 HICI 排序.
- **Review Workspace (中央核心):**
  - AI 配給建議 vs Quota Slider (人力微調).
  - **Buttons:** `APPROVE`, `PARTIAL`, `OVERRIDE` (需要填寫理由), `ESCALATE`.
- **Regional Heatmap (右側):** 各醫院庫存，以地圖/表格呈現紅黃綠燈.
- **Audit Exceptions (下方):** Exception list (例如：Barcode mismatch).

### 3. Offline Fallback Panel
- **Offline Warn:** 斷線 30 秒自動觸發，覆蓋畫面並轉為暗紅主題。
- **Emergency Release Workflow:** 允許單機輸入條碼、身分證，存入 LocalStorage。

## 狀態與防呆 (Accessibility & UX Notes)
- 醫療高壓環境：**字體偏大**，高對比。
- 不要過度動畫，保留清晰的操作回饋。
- 掃描介面：全畫面接管輸入，避免游標跑掉。
