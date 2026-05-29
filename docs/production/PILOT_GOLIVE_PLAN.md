# VN-BECS-V2 試點上線計畫與 TW/VN 佈署方案 (Pilot Go-Live & Deployment Plan)

本文件回答兩個問題：
1. 系統「未完成」是否只是 3 個 Gap？要先上線給使用者用，需要改什麼？
2. 同步 GitHub、佈署 Firebase，讓台灣與越南團隊真實使用的解決方案。

---

## 0. 先正名：兩種「上線」是不同的事

| 等級 | 定義 | 現在可行？ |
| --- | --- | --- |
| **A. 試點上線 (Pilot / UAT / Shadow)** | 真實環境、真實多人帳號、台越同仁實際操作；但**系統不是臨床決策的唯一真相來源**，仍保留免責聲明，與既有流程並行驗證 | ✅ **可以，本計畫即為此** |
| **B. 臨床權威上線 (Authoritative Go-Live)** | 成為正式血品發放/輸血決策的唯一系統 | ❌ 需通過 Gate 1/2/3 + IQ/OQ/PQ + 法規簽核 |

> ⚠️ 安全紅線：血庫系統若直接當唯一臨床真相來源，需完成驗證與法規核可。本計畫讓系統**真實可用（A 級）**，但 UI 必須保留現有臨床免責橫幅，未完成 B 級前不可作為唯一發血/輸血依據。REG-01、VAL-01、COLD-01 可在 A 級「註記未來補充」，但這正是 A 與 B 的分界。

---

## 1. 系統未完成，只是那 3 個 Gap 嗎？— 不是

3 個 🔴（COLD-01 冷鏈硬體、VAL-01 IQ/OQ/PQ、REG-01 越南法規）是**B 級臨床權威上線**的關卡，**A 級試點上線可以先註記延後**。

但要讓使用者「現在真的能用」，真正的阻斷點不在那 3 個 Gap，而在**佈署執行**——這次我已修掉最關鍵的程式阻斷點，其餘是設定：

### 1.1 已修復的程式阻斷點（本次）
- 🔴→✅ **`npm run build` 原本失敗**：`src/server/authPolicy.ts:6` 型別錯誤（`ignoreBuildErrors:false`）導致**完全無法佈署**。已修正，生產編譯現可成功通過。

### 1.2 上線前必須完成的「執行」項目（非寫程式，多為設定）
| # | 項目 | 誰做 | 狀態 |
|---|---|---|---|
| 1 | 建立 Supabase 生產專案（PostgreSQL） | 你/IT | ⬜ |
| 2 | 執行 `supabase_schema.sql` + `seed_data.sql` + `db-migrations/001` | 你/IT | ⬜（SQL 已備） |
| 3 | 跑 `db-migrations/001_tests.sql` 取得 AUTH-03/AUD-01/STATE-04 證據 | 你/IT | ⬜ |
| 4 | 設定生產密鑰（Supabase URL/KEY、`VN_BECS_SESSION_SECRET`） | 你/IT | ⬜（`.env.production.example` 已備） |
| 5 | 建立第一個真實 Admin 帳號（生產已停用 demo 登入） | 你 | ⬜ |
| 6 | Firebase App Hosting 佈署（git 觸發） | 你 | ⬜（`apphosting.yaml` 已備） |
| 7 | 冒煙測試（登入→各角色關鍵流程） | 團隊 | ⬜ |

### 1.3 A 級可「註記未來補充」的項目
REG-01（越南法規簽核）、VAL-01（IQ/OQ/PQ）、COLD-01（冷鏈硬體），以及需連線實庫補證據的 AUTH-03/AUD-01/STATE-04（SQL 已備，跑一次即取得證據）。

**結論**：要讓使用者用，主要是「跑 SQL + 設密鑰 + 佈署」，不是再寫一堆程式。程式面的最後阻斷點（build 失敗）本次已修好。

---

## 2. 佈署方案（GitHub → Firebase，服務台灣+越南）

### 2.1 架構
```
 使用者(TW/VN 瀏覽器, PWA)
        │  HTTPS
        ▼
 Firebase App Hosting  (Next.js SSR + API routes)   ← git push 自動建置
        │  (server-side)
        ▼
 Supabase / PostgreSQL  (臨床系統真相來源, RLS/約束/稽核)
```
- 前端已內建 **zh-TW / en / vi 三語**（`src/lib/i18n.tsx`），台越使用者可各自切換。
- 離線容錯已有 IndexedDB/Dexie（醫院斷網時暫存，連線後同步）。

### 2.2 兩條 Firebase 佈署路徑（建議二）
| | 路徑一：Hosting + Web Frameworks（現況 `firebase.json`） | 路徑二：**App Hosting（建議）** |
|---|---|---|
| 觸發 | `firebase deploy` 手動 | **git push 自動建置**（你已同步 GitHub） |
| 密鑰管理 | 較陽春 | 內建 Secret Manager |
| 設定檔 | `firebase.json` | `apphosting.yaml`（本次已建） |
| 區域 | 目前 `us-central1`（離台越遠、延遲高） | 建立時指定 **asia-southeast1（新加坡）** |

> 建議改用 **App Hosting**，與你「同步 GitHub」的工作流最契合。現況 `firebase.json` 的 `us-central1` 對台越延遲偏高，建議移到亞洲區。

### 2.3 區域與延遲（台越優化）
- App Hosting 後端：**asia-southeast1（新加坡）** 或 asia-east1（台灣）——對越南與台灣都低延遲。
- Supabase 專案區域：**Singapore (ap-southeast-1)**，與後端同區，跨服務延遲最低。

### 2.4 佈署步驟（runbook）
```bash
# 0) 一次性：安裝/登入
npm i -g firebase-tools && firebase login

# 1) 建立 Supabase 生產專案（區域選 Singapore），取得 URL 與 anon key
#    在 Supabase SQL Editor 依序執行：
#      supabase_schema.sql
#      seed_data.sql
#      docs/production/db-migrations/001_facility_scope_and_constraints.sql
#    （測試庫先跑 001_tests.sql 取得安全證據）

# 2) 建立第一個真實 Admin（生產已停用 demo 登入）
#    產生 bcrypt 密碼雜湊：
node -e "console.log(require('bcryptjs').hashSync('YourStrongAdminPassword',10))"
#    在 Supabase SQL Editor：
#      INSERT INTO users (id, username, password, role, "orgId", "isActive", "createdAt")
#      VALUES ('U-ADMIN-1','admin_tw','<上一步的雜湊>','Admin','HUB-DN-03',1, now());

# 3) 建立 App Hosting 後端（連 GitHub repo，指定亞洲區）
firebase apphosting:backends:create --location asia-southeast1

# 4) 設定密鑰（值不進 git）
firebase apphosting:secrets:set NEXT_PUBLIC_SUPABASE_URL
firebase apphosting:secrets:set NEXT_PUBLIC_SUPABASE_ANON_KEY
firebase apphosting:secrets:set VN_BECS_SESSION_SECRET   # >=32 隨機字元

# 5) 佈署：git push 到所連分支即自動建置佈署
git push origin main
```

### 2.5 ⚠️ 安全關鍵（務必處理）
1. **Supabase `service_role` 金鑰會繞過 RLS**。本系統前端用 `anon key`（受 RLS 管控）是對的；**絕不可**把 `service_role` 放進前端或 `NEXT_PUBLIC_*`。若伺服器端需用 service role，facility RLS 將失效——詳見 [`DB_MIGRATION_WORK_PACKAGE.md`](DB_MIGRATION_WORK_PACKAGE.md)。
2. `VN_BECS_SESSION_SECRET` 缺失或 <32 字元 → 生產會 fail-closed（無法簽發登入 token），這是刻意的安全設計。
3. demo 帳號（admin/admin123、a/a）在 `NODE_ENV=production` **自動失效**，必須建真實帳號。
4. 自訂網域 + 強制 HTTPS（App Hosting 預設 HTTPS）。

### 2.6 備份與營運
- Supabase：啟用每日自動備份（PITR）。
- 監控：失敗命令、被拒安全事件、稽核鏈驗證（`/api/v1/audit-events/verify`）、同步積壓。
- 詳見 [`03_deployment_checklist.md`](03_deployment_checklist.md)。

---

## 3. 試點營運約束（A 級必守）
1. **保留** UI 與登入回應的臨床免責橫幅（系統已內建）。
2. 定位為**並行/影子驗證**，不可作為唯一發血/輸血依據，直到 B 級完成。
3. 蒐集 UAT 缺陷與使用者回饋，回填 RTM 與 Gate 2 腳本。
4. REG-01/VAL-01/COLD-01 以「未來補充」明確登錄於 RTM，並排入 B 級時程。

---

## 4. 試點上線檢查表
- [ ] `npm run build` 通過（已修復）
- [ ] `npm test` 220/220 通過
- [ ] Supabase 生產庫已建、schema+seed+001 已執行
- [ ] 001_tests.sql 安全證據已留存（RLS/稽核不可改/多軸回填）
- [ ] 生產密鑰已設（Supabase URL/KEY、SESSION_SECRET ≥32）
- [ ] 第一個真實 Admin 已建、demo 登入確認失效
- [ ] App Hosting 後端建於亞洲區、git 佈署成功
- [ ] 三語（zh-TW/en/vi）切換正常
- [ ] 各角色關鍵流程冒煙測試通過
- [ ] 臨床免責橫幅顯示中
- [ ] 備份與 `/audit-events/verify` 監控就緒
