# 名片回訪 CRM — 開發 SOP

## 規格對齊狀態（2026-11-16 文件重建）

- ✅ `PRD/SPEC.md` 重建為 v4.0：以 Notion「可產品化商品」為商業依據，FR 狀態以 `main@a8b5fe8` 實際程式為準。
- ✅ `GOAL.md` 定義 M1（合併 manager 的 OCR、OCR 準確度、Google 聯絡人檔案互通與 mock 同步）。
- ⚠️ 本次只重建文件，**M1 尚未開發**；OCR、Google 聯絡人相關指令與測試皆尚未存在。
- ⚠️ 產品名稱、方案價格、OCR 門檻等待 Sean 決定（見 `PRD/SPEC.md` §12）。

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
| `npm run test:coverage` | 無法執行 | 缺 `@vitest/coverage-v8`，實跑回報 `MISSING DEPENDENCY`；需另行加入 devDependency |
| `npm run e2e` | 尚未配置 | 沒有 Playwright／E2E 設定（列入 M2） |
| `npm run eval:ocr` | 尚未配置 | M1 新增（`GOAL.md` AC-003，文字層 parser 評估） |
| `npm run eval:ocr:images` | 尚未配置 | M1 新增（`GOAL.md` AC-003，合成影像端到端評估） |
| `npm run format` | 尚未配置 | 沒有 Prettier 設定 |
| `bash sync-3way.sh business-card-pro --verify` | 不在本 repo | Hermes Project 外部腳本；沒有腳本與憑證時不得宣稱三向對齊 |

## CI

- `.github/workflows/quality-gate.yml`：PR 時執行 `scripts/quality-gate.sh`，並檢查敏感路徑需 `risk-approved` 標籤。
- `.github/workflows/ci.yml`：lint 設 `continue-on-error`；test 步驟為 `npm test -- --run 2>&1 || echo "no test script"`，**測試失敗不會讓這個 job 失敗**。判斷是否通過請以 `quality-gate` workflow 或本機指令為準。修正 workflow 需 `risk-approved` 與人審（列入 M2）。

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

- `importContacts` 未檢查免費層上限（M1 AC-006 修正）。
- `src/lib/types.ts` 註解提到 Web Crypto 加密，但程式中沒有任何加密實作。
- `CardImage`／`attachCardImage`、`Consent`／`grantConsent` 只有資料層，沒有 UI。
- localStorage 容量約 5–10MB；若保存名片影像或聯絡人超過數百筆，需改用 IndexedDB。
- `vitest.config.ts` 必須維持 CJS 寫法（vitest 4 + Node 26）。
- `Sidebar.tsx` 為壓 lint 留有未使用的 `SIDEBAR_ICON_REFS`，無功能影響。
