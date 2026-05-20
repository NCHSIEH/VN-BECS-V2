# 技術棧、Repo 結構與後續行動 (v2.0 Phase 2)

## 1. 推薦技術棧 (Tech Stack)
- **語言**: TypeScript
- **前端**: React 19, Vite, Tailwind CSS v4, shadcn/ui, motion.
- **後端**: Node.js (Express), `tsx` (於此單一專案庫整合).
- **資料庫**: PostgreSQL (目前於 POC 階段暫用 In-memory 或 SQLite，後續再切成 Postgres).
- **部署架構**: 將 Vite Middleware 掛入 Express，支援單一 3000 port (符合 AI Studio 環境限制).

## 2. Repo 結構 (Fullstack Monorepo)
```text
/
├── src/
│   ├── main.tsx           # React SPA Entry
│   ├── App.tsx
│   ├── index.css          # Tailwind
│   ├── components/        # Frontend UI Components
│   │   ├── hospital/
│   │   ├── dispatch/
│   │   └── ui/            # shadcn components
│   ├── server/            # Backend API
│   │   ├── server.ts      # Express Entry
│   │   ├── routes/
│   │   ├── services/
│   │   └── db/
│   └── types/             # Shared TypeScript models
├── package.json
└── vite.config.ts
```

## 3. MVP 第一個 Sprint (Sprint 1) 目標
1. Auth Mock: 在 Header 加入一個「角色切換器」以無縫展示不同視角 (Hospital vs Dispatcher)。
2. Hospital Dashboard Mock: 展示 DOS 數據、Bento Grid UI 與 Order Form。
3. Dispatch Hub Queue & Review Mock: 佇列、HICI 建議卡與審批介面。
4. Audit Log 簡易展示區。

## 4. 第一階段 Mock 策略
- **接真系統?** NO。第一階段皆以假資料 (Mock Data) 驗證流程 (如 Order array in memory, ISBT 128 代碼字典用假資料檔)。
- **Offline?** NO。Sprint 1 先做連線版核心流程。

## 5. 醫療政策先期業主確認
1. ISBT 128 所需欄位能否精簡，對應既有醫院舊系統用什麼關聯？
2. 跨院調撥是否需要第三方物流廠商權限？
3. Override HICI AI 時需必填哪些 Reason codes?

## 6. Sprint 1 完成定義 (DoD)
- Frontend/Backend 無編譯錯誤。
- 在單一頁面上能切換角色 (Role Switcher)。
- 醫院送出申請後，Dispatch Hub 能立刻看見。
- 點擊 Approve 後，狀態即時變動。
