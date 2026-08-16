# AGENTS.md — AI coding agent 自動注入

> 此檔案由 coding agent (Hermes / Claude Code / OpenCode / Codex) 自動注入,作為本專案的權威指引。

## 1. 規格來源 (Single Source of Truth)

`PRD/SPEC.md` v3.0 — 任何變更先檢視 SPEC §1.5 Non-Goals + §3.1 FR + §3.4 AC + §15 ADR。

**不可做的事** (SPEC §1.5):
- ❌ OCR 作為主功能(本版不實作 OCR UI;若要加 OCR 只能作「可選 preview」)
- ❌ 通用全球名片資料庫
- ❌ CRM pipeline / Salesforce 整合
- ❌ 國際 / 英文介面
- ❌ 名片交換 P2P / LINE 整合

## 2. 開發 SOP

1. 修改前讀 SPEC 對應區塊 + 本檔案 + `SOP.md`。
2. 修改後跑 `npm run typecheck && npm run test && npm run build` 全綠才算完成。
3. Commit message 格式: `<type>(scope): <FR / AC ref> <說明>`。
4. 任何 §3.1 FR 變更需要更新 §3.4 AC 測試。

## 3. 三向對齊 (Hermes Project 層級)

本目錄隸屬 `/Volumes/MyDsik(APFS)/Hermes Agent/Hermes Project/`,遵父層 `AGENTS.md` 三向對齊 SOP:

```
GitHub HEAD = 本地 HEAD = Vercel production SHA = Notion 進度欄位 SHA
```

跑 `bash ../sync-3way.sh business-card-pro --verify` 確認對齊,`--patch` 更新 Notion。

## 4. 資料模式

本版純 localStorage,**不可**:
- 加 server-side API route
- 加資料庫 / Supabase
- 加登入 / auth

除非 §15.13 MV-01 ~ MV-06 全部通過,並 SPEC §3.2 P1 啟動。

## 5. 不要做的事

- ❌ 引入 Tesseract.js / 雲端 OCR(SPEC §1.5 排除)
- ❌ 引入 Stripe / 付費牆(SPEC §3.3 P2 探索階段)
- ❌ 在 `next.config.ts` 加 unoptimized: false(本版是 static export)
- ❌ 改 `STORAGE_KEY = 'business-card-pro-v3'`(會破壞既有使用者資料)

## 6. 主要檔案入口

- `src/app/page.tsx` — 主頁 + 4 個 tab
- `src/lib/types.ts` — Domain models(SPEC §4.3)
- `src/lib/domain.ts` — Core logic(AC 對應)
- `src/lib/export.ts` — vCard / CSV
- `src/lib/store.ts` — Zustand + persist
- `src/test/domain.test.ts` — §3.4 AC 對應 24 條
- `src/test/store.test.ts` — §3.1 FR 整合 7 條

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
