# 敏捷開發任務清單 (Prompt 6)

## MVP Phase Tasks

### TASK-101: 系統底層建置與 DB Schema (Size: M)
- **Story:** 作為架構師，需先設定 Node.js / PostgreSQL 專案基礎。
- **Scope:** 建立專案、DB Schema 宣告（含 audit_events 表）。
- **AC:** 可利用 Docker compose 啟動平台並提供 healthcheck API。

### TASK-102: Auth & Role Management Mock (Size: S)
- **Story:** 開發 Auth Token 機制或模擬系統，支援 ABAC。
- **Scope:** 登入、Role 判定、Middleware。

### TASK-103: Hospital Dashboard & Orders (Size: L)
- **Story:** 作為醫院，能看庫存並建立 Routine/STAT 訂單。
- **Scope:** UI Bento Grid (Dashboard), Order API POST.
- **AC:** 能送出訂單，狀態機轉為 SUBMITTED。

### TASK-104: Dispatch Hub Triage UI (Size: L)
- **Story:** 作為調度員，需能看 Order queue 並處理。
- **Scope:** Order list, HICI Sorting (basic), Review Workspace, Approve/Reject.

### TASK-105: Barcode Simulation API (Size: M)
- **Story:** 作為出庫員，需驗證 ISBT 128。
- **Scope:** POST `/scan`, Validation logic for mismatch.

### TASK-106: Global Audit Trail Hook (Size: M)
- **Story:** 作為稽核員，系統需 100% 留存操作軌跡。
- **Scope:** DB layer trigger/interceptor to log every state change.

## Phase 2 & 3
- TASK-201: Offline Fallback PWA & LocalStorage
- TASK-202: HICI Advanced ML Rules
- TASK-203: MTP Workflow & Tracker
