# 名片王 Pro Business Card Manager

> 以台灣 B2B 業務的小型回訪 queue 切入: 交換名片只是入口, 產品交付會議備註、下一步、提醒與 vCard/CSV 互通。

對齊規格: [`PRD/SPEC.md`](./PRD/SPEC.md) v3.0

## 🌐 Demo

- **Production**: https://business-card-pro.vercel.app
- **Local dev**: `npm run dev` → http://localhost:3000

## 🛠 技術棧

| 層 | 技術 | 來源 |
|---|---|---|
| 前端 | Next.js 16 (App Router) + React 19 | SPEC §4.1 |
| 樣式 | Tailwind CSS 3 | SPEC §4.1 |
| 狀態 | Zustand (localStorage 持久化) | SPEC §4.1 (本地資料模式 §3.1 FR-008) |
| 測試 | Vitest + Testing Library | SPEC §6.1 |
| 部署 | Vercel (static export) | SPEC §4.1 |

> **不放 OCR / Tesseract**: SPEC §1.5 Non-Goals 明確排除 OCR 主功能;OCR 只作可選 preview(本版未實作 preview UI,MVP 階段以手動輸入為主)

## 🚀 開發

```bash
npm install --legacy-peer-deps
npm run dev        # localhost:3000
npm run build      # production build (靜態匯出到 ./out)
npm run typecheck  # tsc --noEmit
npm run test       # Vitest 31 條測試 (§3.4 全部 AC)
npm run lint       # ESLint
```

## 📁 結構

```
business-card-pro/
├── PRD/SPEC.md              ← 完整產品規格 (v3.0, 從 GitHub upstream 同步)
├── src/
│   ├── app/
│   │   ├── page.tsx         ← 主頁 (4 個 tab: 今日 / 全部 / 聯絡人 / 時間線 / 設定)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── types.ts         ← Domain models (SPEC §4.3)
│   │   ├── domain.ts        ← Core logic (validateContactPayload, getTodayQueue, getTimeline, cascadeDeleteContact)
│   │   ├── export.ts        ← vCard 3.0 / CSV 匯出 + CSV 匯入 (SPEC §3.1 FR-004)
│   │   └── store.ts         ← Zustand store + localStorage 持久化
│   └── test/
│       ├── domain.test.ts   ← §3.4 AC-001 ~ AC-010 對應 24 條
│       └── store.test.ts    ← §3.1 FR-001 ~ FR-010 整合測試 7 條
├── public/
│   └── manifest.webmanifest
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── eslint.config.mjs
```

## ✅ 已實作 SPEC §3.1 P0

| FR | 對應 AC | 實作位置 |
|---|---|---|
| FR-001 手動建立聯絡人 | AC-001 | `lib/domain.ts:validateContactPayload`, `store.addContact` |
| FR-002 來源 / 交換情境 / 下一步 / 日期 | AC-002 | `lib/domain.ts:followupFromExchange`, `store.addContact` opts |
| FR-003 今日 / 逾期回訪 queue + 一鍵完成 | AC-003, AC-004 | `lib/domain.ts:getTodayQueue`, `store.completeFollowup` |
| FR-004 vCard/CSV 匯出 | AC-006, AC-007, AC-010 | `lib/export.ts` |
| FR-005 OCR preview | AC-005 | 未實作(Non-Goals 對齊,MVP 階段以手動輸入為主) |
| FR-006 搜尋姓名 / 公司 / 標籤 | AC-008 | `lib/domain.ts:matchesSearch`, `listContacts` |
| FR-007 互動時間線 + 下次承諾 | AC-004 | `lib/domain.ts:getTimeline`, `isFollowupDoneEntry` |
| FR-008 本地資料模式 | — | `AppState.plan.cloudSync: false`, Zustand persist localStorage |
| FR-009 刪除 + 匯出 + 個資最小化 | AC-009 | `lib/domain.ts:cascadeDeleteContact` |
| FR-010 20 張 pilot 容量 | AC-010 | `store.addContact` 檢查 `plan.maxContacts` |

> **AC-005 (OCR preview)** 未在本版實作 UI — SPEC §1.5 Non-Goals 明確把 OCR 降級為「可選 preview」,本版聚焦手動輸入閉環。

## 🚫 跳過功能 (SPEC §1.5 / §3.2 / §3.3 排除項)

- ❌ 通用全球名片資料庫
- ❌ 中英文 OCR / 雲端 Vision API
- ❌ CRM pipeline / Salesforce 整合
- ❌ 原生 App / iOS / Android
- ❌ 多語系 (i18n)
- ❌ 註冊 / 登入 / 雲端同步 (本版純 localStorage)
- ❌ 付費訂閱 / Stripe
- ❌ 名片交換 P2P / LINE / WhatsApp 整合

## 🚢 部署

```bash
vercel --prod
```

Vercel 透過 GitHub integration auto-deploy; production alias = `business-card-pro.vercel.app`。

## 🔁 三向對齊 (3-Way Sync)

本專案遵循 Hermes Project AGENTS.md 三向對齊 SOP:

```bash
bash sync-3way.sh business-card-pro --verify   # 確認 Notion / GitHub / Vercel HEAD 一致
bash sync-3way.sh business-card-pro --patch    # 更新 Notion 進度欄位
```

## 📜 License

MIT