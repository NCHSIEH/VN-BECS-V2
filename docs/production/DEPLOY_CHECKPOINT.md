# 佈署進度暫存 (Deploy Checkpoint)

更新：2026-05-29　分支：`codex-optimize`　目標：台越團隊試點上線 (A 級)

## 一句話現況
資料庫已就緒；**下一步是 Phase 3 建 Admin → Phase 4 設密鑰 → Phase 5 建 App Hosting 後端佈署**。

## 環境事實（接手必讀）
- Supabase 專案：`vn-becs-prod`，ref `ixazlfmhwjirusikbyoj`，region Asia-Pacific (Singapore)，FREE 方案。
- Firebase 專案：`becs-v1`，佈署方式採 **App Hosting**（git 觸發），區域選亞洲。
- App 程式：`npm run build` ✅、`npm test` ✅ 220/220。
- 沒有本機 `psql`；改用 `node scripts/run-sql.cjs <檔>`（需 `npm i pg` + `$env:DATABASE_URL`）。
- 種子真實機構 id：`ORG-HUB-01`(Hub)、`ORG-BC-01/02/03`、`ORG-HOSP-01..04`（**不是** HUB-DN-03）。

## 已完成 ✅
- Phase 1 建 Supabase 專案。
- Phase 2 跑完 `supabase_schema.sql`、`seed_data.sql`、`db-migrations/001_facility_scope_and_constraints.sql`。
- 驗證：donations=6, components=6, lab_tests=6, translations=2112。
- seed FK bug 已修（補 donations + lab_tests）。
- 安全：伺服器改用 `SUPABASE_SERVICE_ROLE_KEY`、公開 anon API 鎖定（已 commit/push）。
- `npm run build` 阻斷點修復（authPolicy 型別）、firebase.json 區域 → asia-east1。

## 下一步指令（依序）

### Phase 3 — 建 Admin（同一 PowerShell；DATABASE_URL 需仍有效）
```powershell
$env:DATABASE_URL = "<你的 Supabase 連線字串>"   # 換新視窗才需重設
node scripts/create-admin.cjs --username admin_tw --password '你的登入密碼' --role Admin --org ORG-HUB-01 --apply
```

### Phase 4 — 設 App Hosting 4 個密鑰
```powershell
firebase login
firebase use becs-v1
firebase apphosting:secrets:set NEXT_PUBLIC_SUPABASE_URL        # Supabase Project URL
firebase apphosting:secrets:set NEXT_PUBLIC_SUPABASE_ANON_KEY   # Settings → API Keys → anon
firebase apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY       # Settings → API Keys → service_role（機密）
firebase apphosting:secrets:set VN_BECS_SESSION_SECRET          # 用下行產生
# 產生 session secret：
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Phase 5 — 建後端並佈署
```powershell
firebase apphosting:backends:create --project becs-v1
# 互動選：Region=亞洲(asia-east1/southeast1)、連 GitHub repo NCHSIEH/VN-BECS-V2、分支 codex-optimize
git push origin codex-optimize   # push 即自動建置佈署
```

### Phase 6 — 冒煙測試
- 登入 admin_tw（你的登入密碼）→ 成功。
- admin/admin123 → 應被拒（證明生產硬化）。
- 切換 繁中/EN/VI。
- Admin 開 `/api/v1/audit-events/verify` → `valid:true`。

## ⚠️ 待辦安全
- **重設 Supabase DB 密碼**：對話中曾貼出，正式收真實病人資料前務必重設（Settings → Database → Reset password），之後用 `$env:PGPASSWORD` 或環境變數帶入、勿再貼出。

## 關鍵文件
- 計畫/runbook：`docs/production/PILOT_GOLIVE_PLAN.md`
- DB 遷移與測試：`docs/production/db-migrations/`、`DB_MIGRATION_WORK_PACKAGE.md`
- RTM 現況：`docs/production/REQUIREMENTS_TRACEABILITY_MATRIX.(md|xlsx)`（Done 23 / Partial 8 / Gap 3）
- 身分方案：`docs/production/AUTH_OPTIONS.md`
- 輔助腳本：`scripts/run-sql.cjs`（跑 .sql）、`scripts/create-admin.cjs`（建帳號，支援 --apply）
