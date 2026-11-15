# 名片回訪 CRM — 開發 SOP

## 規格對齊狀態（2026-11-16 文件重建）

- ✅ `PRD/SPEC.md` 重建為 v4.0：以 Notion「可產品化商品」為商業依據，FR 狀態以 `main@a8b5fe8` 實際程式為準。
- ✅ `GOAL.md` 定義 M1（合併 manager 的 OCR、OCR 準確度、Google 聯絡人檔案互通與 mock 同步）。
- ✅ M1 已在 `feat/m1` 開發完成（2026-11-16），AC 證據見 `STATUS.md`；待 Sean 覆審。
- ⚠️ 產品名稱、方案價格、OCR 門檻（目前用 GOAL 初版）等待 Sean 決定（見 `PRD/SPEC.md` §12）。

## 環境

- Node：`package.json` 要求 `>=20`；2026-11-16 在 Node v26.13.1 驗證以下指令。
- 安裝：`npm ci --legacy-peer-deps`（repo 同時有 `package-lock.json` 與 `pnpm-lock.yaml`；quality gate 與 CI 使用 npm）。

## 驗證指令（已查證 `package.json` scripts 並於 2026-11-16 實跑）

| 指令 | 用途 | 2026-11-16 結果 |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` | exit 0，0 errors |
| `npm test` | `vitest run` | exit 0，9 個測試檔、65 條測試全過 |
| `npm run build` | `next build`，靜態匯出到 `out/` | exit 0，產出 `out/index.html` |
| `npm run lint` | `eslint` | exit 0，0 errors、1 warning（`eslint.config.mjs` 的 `import/no-anonymous-default-export`，既有） |
| `bash scripts/quality-gate.sh` | 依序 `npm ci --legacy-peer-deps` → typecheck → test → build → lint | 組成指令皆已個別通過；完整腳本本次未整段執行 |
| `npm run dev` | 開發伺服器 http://localhost:3000 | 未在本次執行 |
| `npm run test:coverage` | `vitest run --coverage`（M1 補上 `@vitest/coverage-v8`） | M1：exit 0 |
| `npm run eval:ocr` | M1：OCR 文字層準確度（parser，零網路），未達門檻 exit 1 | M1：exit 0，70 筆全欄位 100% |
| `npm run eval:ocr:images` | M1：OCR 影像層（Tesseract 端到端，本機；首次需網路下載語言檔） | M1：exit 0，33 張，平均 97.0% |
| `npm run gen:ocr-fixtures` | M1：重產合成假名片測試集（加 `-- --images` 重產影像） | — |

M1 後 `npm test` 為 14 個測試檔、123 條測試（65 + 58）。M1 的 quality gate 整段輸出摘要見本檔最後「M1 驗證結果」。

一次跑完：

```bash
npm ci --legacy-peer-deps
npm run typecheck && npm test && npm run build && npm run lint
# 或
bash scripts/quality-gate.sh
```

完成判定：以上全部 exit 0，且測試數不少於 65（M1 後為 65 + 新增數）。

## 有問題或尚未配置的指令

| 指令 | 狀態 | 說明 |
|---|---|---|
| `npm run start` | 不適用 | `next start` 不支援 `output: "export"`。要預覽 build 結果，可用任一靜態伺服器服務 `out/`，例如 `python3 -m http.server 3000 -d out`（repo 未提供對應 script） |
| `npm run e2e` | 尚未配置 | 沒有 Playwright／E2E 設定（列入 M2） |
| `npm run format` | 尚未配置 | 沒有 Prettier 設定 |
| `bash sync-3way.sh business-card-pro --verify` | 不在本 repo | Hermes Project 外部腳本；沒有腳本與憑證時不得宣稱三向對齊 |

## CI

- `.github/workflows/quality-gate.yml`：PR 時執行 `scripts/quality-gate.sh`，並檢查敏感路徑需 `risk-approved` 標籤。
- `.github/workflows/ci.yml`：lint 仍設 `continue-on-error`；test 步驟在 M1 改為 `npm test`（移除 `|| echo`），測試失敗會讓 job 失敗。此變更屬 sensitive path，PR 需 `risk-approved` 標籤與人審。

## M1 開發流程

1. 讀 `GOAL.md` 的目標 AC 與 `PRD/SPEC.md` 對應 FR、§10 合併清單。
2. 從 manager（`openclawsean024-create/business-card-manager`，只讀）參考 `src/app/(app)/dashboard/card-list.tsx` 的 OCR 流程與 `parseCardHeuristic`，依 §10.1 改寫成 adapter + 純函式後搬入。
3. 先寫測試（mock engine、合成 fixture），再寫實作；fixture 只能用合成假資料。
4. 跑完整驗證指令；新增的 `eval:ocr` 指令完成後補入上表並記錄結果。
5. 更新 `STATUS.md` 的 FR 對照、AC 證據（指令、exit code、日期、OCR 各欄位準確率）。

## 故意不做（M1）

- ❌ 真實 Google OAuth／People API、真實金流、真實個資或真實名片影像。
- ❌ server route、資料庫、登入（manager 的 Auth.js／Prisma 不搬）。
- ❌ 修改 `STORAGE_KEY`、`output: "export"`、CI workflow、Vercel 設定。
- ❌ 把 `public/ui-prototype.html` 直接嵌入正式 app。

## 技術債／已知限制

- OCR 依賴 jsDelivr CDN 下載 Tesseract worker 與語言檔；離線或 CDN 不通時退回手動輸入。
- Google CSV 欄位名稱尚未以官方文件逐欄查證（`STATUS.md`）。
- `src/lib/types.ts` 註解提到 Web Crypto 加密，但程式中沒有任何加密實作。
- `CardImage`／`attachCardImage`、`Consent`／`grantConsent` 只有資料層，沒有 UI。
- localStorage 容量約 5–10MB；若保存名片影像或聯絡人超過數百筆，需改用 IndexedDB。
- `vitest.config.ts` 必須維持 CJS 寫法（vitest 4 + Node 26）。
- `Sidebar.tsx` 為壓 lint 留有未使用的 `SIDEBAR_ICON_REFS`，無功能影響。

## M1 驗證結果（2026-11-16，`feat/m1`，Node v26.13.1）

| 指令 | Exit | 輸出摘要 |
|---|---:|---|
| `bash scripts/quality-gate.sh` | 0 | `npm ci`：added 512 packages；typecheck 0 errors；`npm test` 14 files／123 tests passed；`next build` 靜態匯出 3/3 頁；lint 0 errors、1 warning（既有） |
| `test -f out/index.html` | 0 | — |
| GOAL AC-001 `node -e …`（禁止依賴檢查） | 0 | 無 Prisma／next-auth／Stripe／bcryptjs |
| `test ! -d src/app/api` | 0 | — |
| `grep -rn '"use server"' src` | 1 | 無輸出 |
| `npm run eval:ocr` | 0 | 70 筆：Email／電話／姓名／公司／職稱皆 100%，平均 100% |
| `npm run eval:ocr:images` | 0 | 33 張：Email 100%、電話 100%、姓名 90.9%、公司 97.0%、職稱 97.0%，平均 97.0% |
| `npm run test:coverage` | 0 | — |
| `git diff origin/main -- src/test \| grep '^-.*expect('` | 1 | 無輸出（沒有刪除任何既有斷言） |
| `git diff --check origin/main` | 0 | Google CSV／vCard 測試檔的 CRLF 以 `.gitattributes` 標示 `-whitespace` |
