# business-card-pro · CHANGELOG

所有對 `business-card-pro` 規格 / 部署 / 測試的版本變更紀錄。

---

## v3.0.2 — 2026-09-06（repo-fleet 升級）

> 由 repo-fleet 批次 B-2D 自動駕駛：Sean Li / Mavis worker agent
> v3.0.2 完成於 2026-09-06 by Sean 10-repo-fleet

### Added
- `PRD/SPEC.md` 升級至 v3.0.2（在 v3.0 1135 行內容頂部加 v3.0.2 banner + 增量章節導引）
- `PRD/CHANGELOG.md` 本檔
- `.github/workflows/ci.yml` GHA 4-job workflow（lint / test / build / deploy to Vercel）

### Changed
- `PRD/SPEC.md` 標題從 v3.0 → v3.0.2；§0 改版摘要補充 v3.0 → v3.0.2 增量清單

### Validation（v3.0.2 跑過）
- `npm run lint` → **0 errors, 3 warnings** ✅（warnings 為既有，不影響 DoD）
- `npm test -- --run` → **55/55 passed** ✅（7 test files）
- `npm run build` → **Next.js 16.3.0 + Turbopack 綠，3 個 static route** ✅

### Notes
- 部署目標沿用 v3.0 既定 **Vercel**（Next.js 16 + static export + vercel.json 既存）
- GHA deploy job 需在 GitHub repo Settings 設 `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` 三個 secret；未設定時 deploy job 跳過但 build/test/lint 仍綠
- 已存在 PRD 結構（sweet-spot 5 問雷達 + 5 份 ADR + 6 條市場驗證 checklist）原封保留；v3.0.2 只在頂部加 banner，不破壞既有 1135 行論述

---

## v3.0 — 2026-07-19（Sean PRD Rewrite Specialist 強制升級）

> Group B 批次重寫，強制升 v3.0

- Sweet spot 從「OCR 名片管理」紅海 pivot 到「台灣 B2B 業務人脈回訪清單 niche」
- 新增 §15.11 v3.0 Sweet Spot 量表（5 問 × 10 分雷達）
- 新增 §15.12 5 份 ADR 決策紀錄
- 新增 §15.13 6 條市場驗證 checklist
- 完整 1135 行規格書（問題陳述 / Personas / 5 種 ADR / 6 種驗證）
- 既有 PRD 文件（v2.2.2）→ v3.0 sweet-spot-driven 完整重寫

---

## v2.2.2 — 2026-07（v2.2.1 改版）

- Sweet spot 6 → 4
- Persona 從「所有名片管理用戶」縮為「台灣 B2B 業務 / 業務主管」
- 核心功能從「OCR 為主」變成「回訪 queue + 提醒 + 互動紀錄時間線」
- 定價 pivot：免費 20 張 + NT$149/月 200 張 + NT$399/月 無限
- 驗證從「1000 downloads」改為「30 天 5 個台灣業務付費」

---

## v2.2.1 — 早期

- 原始 OCR 名片管理 spec（sweet spot 6/10）
- 對齊 v2.2.1 UI/UX 優化版
- 既有 280 行 SPEC.md（v3.0.2 升級前版本）
