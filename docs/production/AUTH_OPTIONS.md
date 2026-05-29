# 身分驗證方案評估：自製會話 vs Firebase Auth

## 摘要建議
- **試點（A 級）：維持目前的自製簽章會話（`src/server/session.ts`）。** 已可用、已測試、零外部相依，不阻擋上線。
- **臨床權威（B 級）：建議遷移到受管理的身分提供者（Firebase Auth 或 Supabase Auth）。** 屆時可取得 MFA、密碼政策、帳號鎖定、稽核登入事件等企業級控制。

## 比較

| 面向 | 自製會話 (session.ts，現況) | Firebase Auth | Supabase Auth |
| --- | --- | --- | --- |
| 上線即可用 | ✅ 已完成 | ⚠️ 需整合 | ⚠️ 需整合 |
| 每請求伺服器驗證 | ✅ HMAC 簽章 token | ✅ JWT (Google 公鑰) | ✅ JWT |
| MFA / 密碼政策 / 帳號鎖定 | ❌ 需自建 | ✅ 內建 | ✅ 部分內建 |
| 與 DB RLS 整合 | 需自設 GUC（見遷移包） | 需把 facility 放進 claim | ✅ **原生**（`auth.uid()` 直接用於 RLS） |
| 與本系統 DB（Supabase）契合度 | 中 | 中 | **高** | 

## 重要取捨
本系統的臨床真相來源是 **Supabase/PostgreSQL**。若未來要讓 **DB 層 facility RLS** 真正生效（RTM-AUTH-03），**Supabase Auth 其實比 Firebase Auth 更契合**，因為 Supabase 的 RLS 政策可直接引用 `auth.uid()` / JWT claim，不需自行設定 `app.facility_id` GUC。

因此：
- 若你重視「與現有 Supabase DB + RLS 的整合度」→ **B 級優先評估 Supabase Auth**。
- 若你重視「與 Firebase 生態（Hosting/FCM/Analytics）整合」→ Firebase Auth 亦可，但需把使用者的 facility 寫入自訂 claim 並在 RLS 政策對應。

## 為何試點不現在換
- 換身分系統是跨前後端的大改動（登入流程、token 驗證、所有路由的身分來源、使用者遷移），會延後上線且需重新測試。
- 目前自製會話已關閉「用戶端自填角色」的根本漏洞（RTM-AUTH-01/02 ✅），對 A 級試點已足夠。
- 把身分系統遷移排入 **B 級（臨床權威上線）** 的工作項，與 IQ/OQ/PQ、法規簽核一起做，較合理。

## 行動建議
1. 試點：沿用 `session.ts`，務必在生產設好 `VN_BECS_SESSION_SECRET`（≥32 字元）。
2. B 級規劃：開一個 spike 評估 **Supabase Auth**（與 RLS 原生整合）作為首選，Firebase Auth 為次選。
