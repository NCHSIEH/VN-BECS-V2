# NBMS (National Blood Management System) Developer Guide

本系統為專為越南國家血液中心 (Central Hub) 與旗下各醫院網絡設計的現代化血液追蹤、庫存調度與臨床決策輔助平台。

## 1. 系統架構概覽 (Architecture Overview)

系統採前、後端分離架構，但為便於部署與 PWA (Progressive Web App) 離線體驗，目前封裝為單一的 Node.js/Express + React (Vite) 應用程式。

*   **前端 (Frontend)**: React 18, TypeScript, TailwindCSS, Lucide Icons, Vite
*   **後端 (Backend)**: Express.js (RESTful API), TypeScript
*   **資料庫 (Database)**: 
    *   *目前階段*: `better-sqlite3` (本地端開發與展示)
    *   *目標階段*: Firebase Firestore (雲端無伺服器架構)
*   **離線存儲 (Offline Storage)**: IndexedDB (用於 SOP 10 離線應急借血)
*   **狀態機 (State Machine)**: 核心 `BloodUnitStateMachine` 確保所有實體血袋在「可分配 (AVAILABLE)」、「已發行 (ISSUED)」、「已報廢 (WASTED)」等狀態間的轉移合規。

## 2. 目錄結構 (Directory Structure)

```text
vietnambloodmanagement-sop-10-v2.0/
├── docs/                      # 系統架構與操作手冊
├── src/
│   ├── components/            # React UI 元件 (包含所有 SOP 互動模組)
│   ├── lib/                   # 核心邏輯層
│   │   ├── alertService.ts    # 告警推播引擎
│   │   ├── alertThresholds.ts # KPI/庫存顏色判讀引擎
│   │   ├── fsm.ts             # 血液狀態機引擎 (BloodUnitStateMachine)
│   │   ├── i18n.ts            # 多國語系 (EN/VI/ZH) 支援
│   │   ├── offlineStore.ts    # PWA IndexedDB 離線儲存封裝
│   │   └── validators/        # 共用輸入驗證 (CCCD 等)
│   ├── server/                # Express 後端 API
│   │   ├── db.ts              # SQLite CRUD 封裝與 Schema
│   │   ├── server.ts          # Express API 端點 (包含 RBAC 與 Audit Log)
│   │   └── reconciliationEngine.ts # (規劃中) 離線對帳引擎
│   ├── types.ts               # 全域 TypeScript 型別定義 (Collections, Enums)
│   ├── App.tsx                # 應用程式入口點與路由邏輯
│   └── main.tsx               # React DOM 渲染
├── public/                    # 靜態資源
└── firestore.rules            # Firebase 安全規則配置檔 (Immutable Audit Logs)
```

## 3. 開發環境設定 (Development Setup)

### 前置需求
*   Node.js v18+
*   npm v9+

### 安裝步驟
1.  **安裝相依套件**:
    ```bash
    npm install
    ```
2.  **啟動開發伺服器**:
    本專案使用 `concurrently` 同時啟動 Vite (前端) 與 `tsx` (後端)。
    ```bash
    npm run dev
    ```
    *   前端伺服器：`http://localhost:5173`
    *   後端 API：`http://localhost:3000` (前端透過 vite proxy 將 `/api` 導向後端)

## 4. 關鍵模組實作指南

### 4.1 狀態機 (BloodUnitStateMachine)
修改血袋狀態的 API **絕對不可** 直接呼叫 `UPDATE inventory SET status = ?`，必須透過狀態機處理：
```typescript
const result = BloodUnitStateMachine.transition(unit, 'ISSUE', { role: 'WarehouseIssuer' });
if (!result.success) throw new Error(result.error);
```

### 4.2 權限與攔截器 (RBAC Middleware)
在 `server.ts` 中，所有修改狀態的 API 都有預設的稽核與權限檢核。新增 API 路由時，務必確保：
1. 傳入 `actorRole` (或從 session 讀取)。
2. 針對核心操作，使用 `await logAudit(...)` 強制寫入稽核軌跡。

### 4.3 告警系統 (AlertService)
在業務邏輯觸發異常時 (如冷鏈超溫、配血不合)，呼叫 `AlertService`：
```typescript
AlertService.create('CROSSMATCH_INCOMPATIBLE', patientId, 'Incompatible blood detected!');
```
UI 端的 `ManagerKPIView` 與 `PortalView` 將自動獲取並顯示此告警。

## 5. 部署流程 (Deployment - Firebase)

目前專案正在進行 Firebase 遷移準備。

1. **建置前端與後端**:
   ```bash
   npm run build
   ```
2. **初始化 Firebase**:
   ```bash
   firebase init
   ```
   * 選擇 Hosting (發布前端 `/dist`)
   * 選擇 Functions (發布後端 API)
   * 選擇 Firestore (部署 `firestore.rules`)
3. **部署**:
   ```bash
   firebase deploy
   ```
