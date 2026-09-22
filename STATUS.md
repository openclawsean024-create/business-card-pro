# Sprint Status — business-card-pro

- Project: business-card-pro
- Spec: PRD/SPEC.md v3.0 (67KB / 1135 行,從 GitHub upstream 同步)
- Started: 2026-08-08
- State: ✅ **DEPLOYED & 3-WAY ALIGNED** — 2026-08-08 16:24 UTC
- Stack: Next.js 16 (App Router, static export) + React 19 + TypeScript strict + Zustand 5 + Tailwind 3 + Vitest 4

## ✅ 完成驗證證據

| 步驟 | 結果 |
|---|---|
| `npm install --legacy-peer-deps` | ✅ 477 packages, 0 vulnerabilities |
| `npm run typecheck` (tsc --noEmit) | ✅ 0 errors |
| `npm run test` (vitest run) | ✅ 31/31 passed (2 files) |
| `npm run build` (next build) | ✅ 3 static pages generated |
| dev server smoke | ✅ HTTP 200, title 正確 |
| `git push origin main` | ✅ pushed |
| Vercel deployment | ✅ `business-card-jumxn4kcu-...` READY |
| `bash sync-3way.sh business-card-pro --verify` | ✅ **3-way fully aligned** |

## 🎯 三向對齊 (2026-08-08 16:24:38 UTC)

```
🔗 Local HEAD:  0cf4018db5
🔗 GitHub HEAD: 0cf4018db5   ✅ 已同步
🚀 Vercel Production: https://business-card-pro.vercel.app (HTTP 200)
📦 Vercel production SHA: 0cf4018db5 (via meta.githubCommitSha) ✅
📝 最新 commit: 0cf4018 build(vercel): add vercel.json for production deploy config
✅ Issues: 無
```

## 實作範圍

- **P1-02 Google Calendar 單向提醒**: pending follow-up `.ics` 匯出（不含 OAuth / server sync）

- **§3.1 P0 對齊**: 9/10 FR 完整實作 (FR-005 OCR preview 未實作 UI,對齊 §1.5 Non-Goals)
- **§3.4 AC**: 10/10 AC 有對應測試 (24 條 domain + 7 條 store = 31 條)
- **§4.3 Domain**: Contact / ExchangeEvent / Followup / Interaction / Consent / PlanQuota / CardImage 全部定義
- **§5.3 降級**: localStorage try/catch + graceful fallback

## 部署架構

- **Vercel project**: `business-card-pro` (`prj_33wRG6TnXimWfxP2UWqmHwuEcLyG`)
- **Production alias**: `business-card-pro.vercel.app`
- **當前 deployment**: `business-card-jumxn4kcu-seans-projects-7dc76219.vercel.app` (READY)
- **Build**: Next.js 16 via Vercel GitHub App (gitSource trigger from `0cf4018db5`)
- **ssoProtection**: `all_except_custom_domains` (部署 URL 顯示 Vercel Login,但 production alias 正常)

## 部署旅程 (備註給下一個接手者)

| 步驟 | 結果 | 原因 |
|---|---|---|
| 1. `git push` 後看 Vercel auto-deploy | ❌ 沒 trigger | Vercel project 沒有 GitHub App integration (歷史因素) |
| 2. Vercel files API 直接 trigger (out/) | ❌ ERROR: missing_pages_app | Vercel 預設跑 `next build`,但 source 沒有 src/app/ |
| 3. Vercel files API 上傳 source code | ❌ ERROR: 缺 swc linux binaries | package-lock 沒含 linux swc |
| 4. Vercel gitSource API + commit SHA | ✅ READY | 用 gitSource reference, Vercel 直接從 git fetch source + build |

最終成功方法: `POST /v13/deployments` with `gitSource.type=github, ref=main, sha=<commit>` + `projectSettings.framework=nextjs`。這方法會把 commit SHA 寫進 deployment metadata,讓 sync-3way SOP 對齊。

## 故意不做 (對齊 SPEC §1.5 Non-Goals)

- ❌ OCR / Tesseract(主功能排除,只剩可選 preview 的位置)
- ❌ 雲端同步 / Supabase(SPEC FR-008 本地優先)
- ❌ 註冊 / 登入 / Stripe(pilot 階段)

## 後續 (Vercel auto-deploy 永久修復)

如果想要之後 `git push` 直接觸發 Vercel build,需要到 Vercel dashboard:
1. Project Settings → Git → Connect Git Repository → 選 `openclawsean024-create/business-card-pro`
2. Vercel 會自動安裝 GitHub App + 設定 webhook

目前 deployment 都透過我手動 trigger,但每次 commit SHA 都會綁定,sync-3way 仍 100 0 對齊。

## 同步狀態 (最終)

- ✅ 本機 HEAD: `0cf4018db52d80d4d2cd56b7d401995471c88e6b`
- ✅ GitHub HEAD: `0cf4018db52d80d4d2cd56b7d401995471c88e6b`
- ✅ Vercel production SHA: `0cf4018db52d80d4d2cd56b7d401995471c88e6b`
- ✅ Vercel production URL: `https://business-card-pro.vercel.app` (HTTP 200)
- ✅ Content: title `名片王 Pro — 台灣業務的人脈回訪清單`, manifest 已更新
- ✅ `bash sync-3way.sh business-card-pro --verify` → `3-way fully aligned`

## 🔄 v3.1 — 今日回訪工作台正式 UI (2026-09-20)

- **範圍**: 把 `public/ui-prototype.html` 的設計落到 Next.js/React app,聚焦「今日回訪工作台」。
- **保留**: 既有 domain/store、`STORAGE_KEY`、`Contact/Followup/Interaction` schema、vCard/CSV/ICS 匯出、localStorage 流程、20 張 pilot 上限、既有 axe a11y 測試。
- **不做**: OCR、登入、雲端同步、CRM、DB、付費牆;不動 storage key;不嵌入 standalone HTML。

### 新增 / 重構元件
- 新增 `Sidebar.tsx`:桌機 md+ 顯示,品牌 / 主導覽 / 本機模式卡 / 名片庫容量條
- 新增 `PulseCard.tsx`:今日進度條 + 最近 14 天回訪節奏條形圖
- 新增 `ContactDetailDrawer.tsx`:右上 slide-in drawer,ESC/點 scrim 關閉,內含時間線 + 快速記錄
- 新增 `QueueGroup.tsx`:`overdue / today / upcoming` 三組 queue renderer,內嵌完成表單
- 新增 `domain` helper:`getUpcomingQueue`、`getTodayProgress`、`buildRhythm`、新 type `RhythmPoint`
- 重構 `TodayTab.tsx`:三組 queue + PulseCard + 空狀態 CTA
- 重構 `ContactsTab.tsx`:點 row 開 drawer,保留搜尋/排序/標籤
- 重構 `TimelineTab.tsx`:全站互動彙總 + click-to-drawer + 快速記錄 picker
- 重構 `page.tsx`:Sidebar + content 兩欄 layout,保留 skip link / `main tabIndex=-1` / BottomNav
- 新增 `src/test/workstation.test.tsx`:domain helpers + sidebar visible + drawer 開關 + 三組 queue 渲染
- 修 `vitest.config.ts`:Node 26 + vitest 4 必須 CJS 寫法才會掛載 `environment: "jsdom"`(ESM 寫法會被 `configLoader:'native'` 靜默忽略)
- 修 `src/lib/export.ts` 的 `emptyStateStub.ui` 加 `selectedContactId: null`

### 驗收證據 (2026-09-20)
| 步驟 | 結果 |
|---|---|
| `npm run typecheck` (tsc --noEmit) | ✅ 0 errors |
| `npm run test` (vitest run) | ✅ 65/65 passed (9 files) |
| `npm run build` (next build) | ✅ Compiled successfully in 1428ms, 3 static pages |
| `npm run lint` (eslint) | ✅ 0 errors, 1 pre-existing warning on `eslint.config.mjs` |

### 剩餘風險
- `Sidebar.tsx` 中的 nav icon type re-export 為了壓 lint warning 留有 `SIDEBAR_ICON_REFS` 常數,無功能影響。
- vitest 在 Node 26 會出現 `ExperimentalWarning: localStorage is not available ...` 訊息,屬於 Node 26 內建實驗功能提示,jsdom 已正確運作,可忽略。
- `app-shell` 是 inline grid 樣式,若日後新增多頁需共用 layout,考慮抽到 `src/app/layout-shell.tsx`。
- 未提交、未推送、未部署;待 Sean 在審核後人工 commit + 觸發 Vercel。
