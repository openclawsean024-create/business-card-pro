# AGENTS.md — 名片回訪 CRM（business-card-pro）

> 給 coding agent（Claude Code、Codex、Hermes、OpenCode 等）的專案指引。產品名稱以 Notion「可產品化商品」為準：**名片回訪 CRM**；程式與 UI 目前仍沿用舊名「名片王 Pro」，改名尚待決定。

## 1. 規格來源

- `PRD/SPEC.md` v4.0：產品規格、FR 狀態、合併清單、待確認事項。
- `GOAL.md`：目前里程碑（M1）的 Objective、AC、Out of scope、Exit gate。**只做 GOAL.md 範圍內的事**。
- `PRD/UI-SPEC.md`：UI 方向（今日回訪工作台）。
- `SOP.md`：可執行的驗證指令；`STATUS.md`：目前狀態與證據。
- 修改前先讀對應 FR／AC；任何 FR 行為變更需同步更新測試與 `STATUS.md`。

## 2. 專案結構

```
business-card-pro/
├── PRD/SPEC.md、PRD/UI-SPEC.md、PRD/CHANGELOG.md
├── GOAL.md、SOP.md、STATUS.md、AGENTS.md
├── src/
│   ├── app/            page.tsx（單頁、5 個 tab）、layout.tsx、globals.css
│   ├── components/     Sidebar、BottomNav、TopNav、Header、ContactFormModal、ContactDetailDrawer、
│   │                   ContactRow、QueueGroup、FollowupCard、PulseCard、LogInteractionForm、
│   │                   OnboardingHint、SearchBar、Common、nav-items
│   │   └── tabs/       TodayTab、QueueTab、ContactsTab、TimelineTab、SettingsTab
│   ├── lib/            types.ts（domain model、STORAGE_KEY）、domain.ts（純函式）、
│   │                   store.ts（Zustand + localStorage）、export.ts（vCard／CSV／ICS）
│   └── test/           9 個 Vitest 測試檔 + setup.ts
├── public/             manifest.webmanifest、ui-prototype.html（設計參考，不嵌入 app）
├── scripts/quality-gate.sh
├── .github/workflows/  ci.yml、quality-gate.yml
└── .agent/workflow.yaml
```

M1 預計新增（尚不存在）：`src/lib/ocr/`、OCR 拍照元件、`src/test/fixtures/ocr/`（合成假名片）、Google 聯絡人檔案互通與 mock sync adapter、`eval:ocr` 指令。

## 3. 技術棧（依 `package.json` 與設定檔查證）

| 層 | 技術 |
|---|---|
| 框架 | Next.js 16（App Router，`output: "export"` 靜態匯出到 `out/`） |
| UI | React 19、Tailwind CSS 3、lucide-react |
| 狀態 | Zustand 5，自行以 `subscribe` 寫入 localStorage（key：`business-card-pro-v3`） |
| 語言 | TypeScript strict |
| 測試 | Vitest 4 + jsdom + Testing Library + axe-core（`vitest.config.ts` 必須維持 CJS 寫法） |
| Lint | ESLint 9 + eslint-config-next |
| 部署 | Vercel（`vercel.json`，outputDirectory `out`） |
| Node | `engines.node >= 20`；本機在 Node 26 驗證過 |

沒有後端、資料庫、API route、登入或金流。

## 4. 開發規則

1. **只用假資料。** 測試、fixture、截圖、範例、文件中的姓名、電話、Email、地址一律明顯虛構：姓名加「測試」前綴或用明顯虛構名；電話用 `0900-000-0xx`、`02-0000-00xx` 形式（台灣是否有官方保留的測試號段待確認，故同時以姓名標示測試）；Email 只用 `@example.com`；公司名含「範例」或「Example」。**禁止提交真實名片影像**，OCR 影像測試集只能由腳本合成。
2. **不得提交憑證。** 不得把 API key、token、OAuth client secret、Vercel／Stripe／Google／Telegram 憑證、`.env*`、`*.pem`、資料庫檔（如 `prisma/dev.db`）加入 git。需要設定時只提交 `.env.example`（值留空）。
3. **測試不可為了通過而刪改斷言。** 不得刪除既有測試、放寬 `expect`、加 `.skip`／`.only`、或改測試資料去配合錯誤行為；確需修改斷言時，在 PR 中逐條說明理由並取得 Sean 同意。
4. **維持 local-only 架構。** 不加 server route、server actions、資料庫、登入；不改 `next.config.ts` 的 `output: "export"`；不改 `STORAGE_KEY`（會破壞既有使用者資料）。上述變更屬 M3，需先有安全設計與人審。
5. **OCR 只能是預覽。** 辨識結果必須經使用者確認才建立聯絡人；影像在瀏覽器端處理，不上傳伺服器，預設不保存。
6. **外部服務一律 mock。** Google 聯絡人、金流在 M1 只能是檔案互通或 mock adapter；測試中不得有真實網路呼叫。
7. **business-card-manager 只讀。** 搬移依 `PRD/SPEC.md` §10；不得對該 repo push、開 PR、封存或改設定。
8. 完成前執行 `bash scripts/quality-gate.sh`（或依 `SOP.md` 分步執行）全綠才算完成。
9. Commit 訊息格式：`<type>(scope): <FR／AC 編號> <說明>`。

## 5. Autonomous development contract

- Planner、QA、Final reviewer 為唯讀；只有 Developer 與 Integrator 可修改 workspace（見 `.agent/workflow.yaml`）。
- 接受任何 agent 變更前執行 `bash scripts/quality-gate.sh`。
- Quota fallback 只能依 `.agent/workflow.yaml` 前進；驗證、測試、安全失敗必須停止。
- Agent 不在工作階段內 push 到 `main`、合併、部署或變更 branch protection。
- 變更 authentication、secrets、deployment、workflows、infrastructure 需 `risk-approved` 標籤與人審（`quality-gate.yml` 的 sensitive-path-policy 會檢查）。

## 6. 三向對齊（repo 外部流程）

Hermes Project 層級的 `sync-3way.sh` 不在本 repo 內；用於確認 GitHub HEAD、本地 HEAD、Vercel production SHA 與 Notion 進度欄位一致。沒有該腳本或沒有對應憑證時，不得宣稱已對齊。

## 7. 已知陷阱

- `vitest.config.ts` 必須用 CJS（`require` + `module.exports`）；ESM 寫法在 vitest 4 + Node 26 會靜默忽略 `test.environment`。
- Node 26 執行測試時的 `ExperimentalWarning: localStorage is not available` 可忽略。
- `npm run start`（`next start`）在 static export 下不適用；預覽 build 結果請見 `SOP.md`。
- 遠端另有舊分支 `master`（與 manager 同源的舊程式，歷史中含 `prisma/dev.db`）；不要以它為基底開發。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
