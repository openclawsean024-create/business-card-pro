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