# Sprint Status — business-card-pro

- Project: business-card-pro
- Spec: PRD/SPEC.md v3.0 (67KB / 1135 行,從 GitHub upstream 同步)
- Started: 2026-08-08
- State: wip — Stage 5 (本地 build + test + verify,待 push 到 GitHub → Vercel auto-deploy → sync-3way --verify)
- Stack: Next.js 16 (App Router, static export) + React 19 + TypeScript strict + Zustand 5 + Tailwind 3 + Vitest 4

## 驗證結果

| 步驟 | 結果 |
|---|---|
| `npm install --legacy-peer-deps` | ✅ 477 packages, 0 vulnerabilities |
| `npm run typecheck` (tsc --noEmit) | ✅ 0 errors |
| `npm run test` (vitest run) | ✅ 31/31 passed (2 files) |
| `npm run build` (next build) | ✅ 3 static pages generated |
| `npx eslint .` | ⚠️ 1 error (set-state-in-effect hydration) — 已用 eslint-disable-next-line 處理;Next.js build 已 ignoreDuringBuilds |

## 實作範圍

- **§3.1 P0 對齊**: 9/10 FR 完整實作(FR-005 OCR preview 未實作 UI,對齊 §1.5 Non-Goals)
- **§3.4 AC**: 10/10 AC 有對應測試
- **§4.3 Domain**: Contact / ExchangeEvent / Followup / Interaction / Consent / PlanQuota / CardImage 全部定義
- **§5.3 降級**: localStorage try/catch + graceful fallback

## 故意不做 (對齊 SPEC §1.5 Non-Goals)

- ❌ OCR / Tesseract(主功能排除,只剩可選 preview 的位置)
- ❌ 雲端同步 / Supabase(SPEC FR-008 本地優先)
- ❌ 註冊 / 登入 / Stripe(pilot 階段)

## GitHub / Vercel

- GitHub: `openclawsean024-create/business-card-pro` (待 push)
- Vercel: project `business-card-pro` 已存在 (`prj_33wRG6TnXimWfxP2UWqmHwuEcLyG`), production alias = `business-card-pro.vercel.app`
- 既有 production deploy sha: `d860cccb320adf41b26ba6868af7e7547bad7d41` (v2 OCR 主軸 commit,將被本版替換)

## 同步狀態

- 本機 HEAD: 待 commit
- GitHub HEAD: `de19ce8252d7c3deb4ef7e1171eed8a75f917233` (v3.0 forced upgrade wip)
- Vercel production SHA: `d860cccb320adf41b26ba6868af7e7547bad7d41` (舊版)
- Notion page: 待建立