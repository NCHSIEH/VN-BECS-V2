# VN-BECS V2 — 存取資訊 (Access Info)

> 更新：2026-05-29　環境：Firebase App Hosting (asia-east1)　部署分支：`main`（git push 自動部署）

## 1. 網站網址 (Website)

**https://vn-becs-prod--becs-v1.asia-east1.hosted.app**

- 後端資料庫：Supabase / PostgreSQL（專案 ref `ixazlfmhwjirusikbyoj`）
- 自動部署：push 到 `main` → App Hosting 自動建置並 rollout

## 2. 技術文件 (Technical Document)

| 管道 | 位置 |
|------|------|
| 正式站直連 | https://vn-becs-prod--becs-v1.asia-east1.hosted.app/vn-becs-technical-review.html |
| App 內入口 | 登入頁／Portal →「閱讀操作手冊」→ **① VN-BECS Technical Review** |
| 原系統文件 | 同上 →「閱讀操作手冊」→ **② Document Portal** |
| 原始檔 | `docs/presentation/VN-BECS_Technical_Overview.html`、`.pptx` |

- 支援三語切換：繁體中文／English／Tiếng Việt
- 內容：專案目的、系統範圍、合規檢核 (RTM)、系統關聯圖、彩色作業流程圖、各子系統功能、血袋狀態機、角色權限與資安稽核、技術架構與部署、互通性/離線、V&V 與 Roadmap、名詞表

## 3. 主要測試帳號／密碼 (Test Accounts)

> 種子資料，密碼皆為 `123`。一般測試建議用 `admin`（權限最完整）。

| 帳號 | 密碼 | 角色 | 可用子系統 |
|------|------|------|-----------|
| `admin` | `123` | Admin（系統管理員）| LIMS / HUB / MDM / HOSPITAL / NATIONAL |
| `manager` | `123` | Manager | HUB |
| `dispatcher_hn` | `123` | HubDispatcher（河內調度）| HUB |
| `dispatcher_hcm` | `123` | HubDispatcher（胡志明調度）| HUB |
| `doctor_hosp_1` | `123` | Doctor（醫師）| HOSPITAL / HUB |
| `nurse_hosp_1` | `123` | Nurse（護理）| HOSPITAL / HUB |
| `warehouse_hosp_1` | `123` | WarehouseIssuer（發血）| HUB |

## ⚠️ 安全提醒 (Security Notice)

以上為**試點/驗證用**種子帳號，密碼皆 `123` 且正式站可登入。**正式收真實病人資料前務必：**

1. 建立強密碼管理員帳號（`node scripts/create-admin.cjs --apply` 或 Supabase SQL Editor），並停用/刪除種子帳號。
2. 重設 Supabase DB 密碼（曾於協作過程外洩）。
3. 清除 `scratch/deploy_to_firebase.ps1` 內的明碼 session secret 與連線資訊。

> 系統目前為 **PILOT / VALIDATION** 模式，尚未授權用於真實臨床/輸血決策。
