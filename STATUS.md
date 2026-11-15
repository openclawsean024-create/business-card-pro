# Sprint Status — business-card-pro（名片回訪 CRM）

- Project: 名片回訪 CRM（repo 與 UI 舊名：名片王 Pro；改名待 Sean 決定，M1 未改名）
- Repo: `openclawsean024-create/business-card-pro`（預設分支 `main`）
- 併入來源: `openclawsean024-create/business-card-manager`（預設分支 `master`，只讀；未 push、未封存）
- Spec: `PRD/SPEC.md` v4.0
- Goal: `GOAL.md` — M1
- Branch: `feat/m1`（基於 `chore/prd-rebuild`；PR #1 尚未合併）
- State: 🧪 **M1 開發完成、待 Sean 覆審** — 2026-11-16（Exit gate 需 Sean 覆審 scope 與 AC-003 門檻）
- Stack: Next.js 16（static export）+ React 19 + TypeScript strict + Zustand 5 + Tailwind 3 + Vitest 4 + Tesseract.js 7

## M1 AC 進度（2026-11-16，Node v26.13.1，macOS）

| AC | 標題 | 狀態 | 驗證指令 → exit | 測試（名稱皆以 AC 編號開頭） |
|---|---|---|---|---|
| AC-001 | 合併 OCR 與拍照輸入，不帶伺服器依賴 | ✅ | `npm run build` → 0（產出 `out/index.html`）；GOAL 的 `node -e …` 依賴檢查 → 0；`test ! -d src/app/api` → 0；`grep -rn '"use server"' src` → 無輸出 | `src/test/merge-guard.test.ts`、`src/test/ocr-flow.test.tsx`（adapter 注入） |
| AC-002 | OCR 只產生預覽，確認後才建立 | ✅ | `npm test` → 0 | `src/test/ocr-flow.test.tsx` (a)(b)(c)(d) |
| AC-003 | OCR 準確度：合成測試集與門檻 | ✅（門檻為 GOAL 初版，待 Sean 確認） | `npm run eval:ocr` → 0；`npm run eval:ocr:images` → 0；`npm test` → 0 | `src/test/ocr-accuracy.test.ts`、`scripts/eval/*.eval.ts` |
| AC-004 | Google 聯絡人檔案互通 | ✅（Google CSV 欄位名稱未經官方文件逐欄查證，見下方） | `npm test` → 0 | `src/test/google-contacts-file.test.ts` |
| AC-005 | mock 同步 adapter，零網路 | ✅ | `npm test` → 0 | `src/test/contact-sync.test.ts`（`fetch` 呼叫次數斷言為 0） |
| AC-006 | 免費層上限不可被匯入繞過 | ✅ | `npm test` → 0 | `src/test/store.test.ts`「已有 19 筆時匯入 5 筆 → 20 筆、回報 4 筆未匯入」；`contact-sync.test.ts` 同步 pull 版 |
| AC-007 | OCR 前的個資告知 | ✅ | `npm test` → 0 | `src/test/ocr-flow.test.tsx`、`src/test/a11y-axe.test.tsx`（OCR 入口 axe 0 critical/serious） |
| AC-008 | 品質門檻與證據 | ✅ 見下方 `quality-gate.sh` 結果 | 見下方 | `src/test/merge-guard.test.ts`（CI 不吞失敗、coverage 依賴、既有測試檔仍在） |

### AC-008 證據

| 指令 | Exit | 結果 |
|---|---:|---|
| `bash scripts/quality-gate.sh` | 0 | 依序 `npm ci`（512 packages）→ typecheck → test（123 passed）→ build → lint（0 errors）；詳見 SOP.md「M1 驗證結果」 |
| `npm run typecheck` | 0 | 0 errors |
| `npm test` | 0 | 14 files、**123 tests** passed（既有 65 + 新增 58） |
| `npm run build` | 0 | 靜態匯出，`out/index.html` 產出 |
| `npm run lint` | 0 | 0 errors、1 warning（`eslint.config.mjs` 既有的 `import/no-anonymous-default-export`） |
| `npm run test:coverage` | 0 | 可執行（已加 `@vitest/coverage-v8`） |
| `git diff main -- src/test \| grep '^-.*expect('` | 1（無輸出） | 既有測試沒有刪除任何 `expect` 行；既有測試檔只有新增 |
| `git diff --check origin/main` | 0 | fixtures 的 CRLF 以 `.gitattributes` 標示 |

- CI：`.github/workflows/ci.yml` 的 test 步驟移除 `|| echo`。此檔屬 sensitive path，PR 需 `risk-approved` 標籤與人審。

### AC-003 OCR 準確度（2026-11-16）

正規化後完全相符（去空白、全形轉半形、電話只比數字、Email 小寫）。

| 層 | 筆數 | Email | 電話 | 姓名 | 公司 | 職稱 | 平均 | 門檻（GOAL 初版） |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 文字層（parser，`npm run eval:ocr`，CI 必跑） | 70 | 100% | 100% | 100% | 100% | 100% | 100% | Email 98／電話 95／姓名 90／公司 90／職稱 85／平均 92 |
| 影像層（Tesseract `eng+chi_tra` 端到端，`npm run eval:ocr:images`，本機） | 33 | 100% | 100% | 90.9% | 97.0% | 97.0% | 97.0% | Email 90／電話 85／姓名 75／平均 80 |

- 文字層五類各 14 筆：繁中橫式、繁中直式、中英混排、純英文、含雜訊（多餘空白、全形數字、斷行錯位）。影像層三種固定橫式版型各 11 張（字型：系統 Arial Unicode，字型檔不提交）。
- **解讀限制**：parser 是對著這組測試集調整的，100% 不代表真實名片的準確率。另以 6 個不同種子產生的 holdout 文字層各 70 筆檢查，平均 99.4%～100%。影像層為乾淨的合成影像，沒有拍攝角度、光線、背景，真實名片的數字應會明顯較低；上市前需另行量測（M2）。
- 影像層剩餘錯誤皆為 Tesseract 字元辨識錯誤（例：「集團」→「集轉」、大字級姓名漏字）。
- 加上 Tesseract 參數 `preserve_interword_spaces=1` 後影像層姓名由 66.7% → 90.9%（manager 原本沒有此設定）。

### Tesseract 語言檔放置方式

- **CDN（沿用預設）**：Tesseract.js 預設從 jsDelivr CDN 下載 worker、WASM 核心與 `eng`、`chi_tra` 語言檔，與 manager 原本行為一致；GOAL.md 與 SPEC §12 未改變此預設，因此沿用。語言檔不放進 repo。
- 下載內容不含影像；OCR 入口告知已說明「首次使用會從 CDN 下載辨識程式與語言模型（下載內容不含你的影像）」（AC-007）。
- 本機影像層評估把語言檔快取在 `node_modules/.cache/tesseract`（不提交）；第一次執行需要網路。

### AC-004 Google CSV 欄位查證狀態

- Google 聯絡人說明頁（2026-11-16 查閱 `support.google.com/contacts/answer/7199294`）只說明可匯出「Google CSV」與 vCard，**未公布欄位清單**。
- 匯出欄位依已知的 Google CSV 匯出格式撰寫；匯入同時接受舊版標頭（`Name`、`Organization 1 - Name`、`Group Membership` 等）。對照表見 `PRD/SPEC.md` §5.2。
- **待確認**：尚未以官方欄位文件逐欄查證，也尚未用測試帳號＋假資料實際匯入 Google 聯絡人驗證。

### 實機檢查（2026-11-16）

以 `python3 -m http.server` 服務 `out/`，在瀏覽器上傳合成名片 `card-01.png`：真實 Tesseract 辨識後預填 5 欄、聯絡人數維持 0；按「確認並儲存」後 1 筆，`ocrConfidence` 0.81、`ocrLowConfidenceFields` = `["company"]`，`cardImages` 為 0、localStorage 無 `data:image/`。

## FR 對照（詳見 `PRD/SPEC.md` §5）

| FR | 需求 | 優先 | 狀態 | 證據 |
|---|---|---|---|---|
| FR-001～FR-003 | 聯絡人、交換情境、回訪 queue | P0 | 已實作 | 既有 |
| FR-004 | vCard／CSV 匯出、CSV 匯入 | P0 | 已實作（M1 起 vCard 匯入也已實作） | `google-contacts.ts` |
| FR-005 | OCR 預覽確認 | P0 | **已實作（M1）** | `src/lib/ocr/`、`OcrCapture.tsx`、`ContactFormModal.tsx` |
| FR-006～FR-009 | 搜尋、時間線、本機模式、刪除 | P0 | 已實作 | 既有；`STORAGE_KEY` 未變 |
| FR-010 | 免費層上限 | P0 | **已實作（M1：匯入與同步 pull 也受限）** | `contact-import.ts`、`store.importContacts` |
| FR-011 | `.ics` 回訪提醒匯出 | P1 | 已實作 | 既有 |
| FR-012 | Google 聯絡人同步 | P0 | **部分（M1：檔案互通 + mock adapter；真實 API 為 M3）** | `google-contacts.ts`、`src/lib/sync/` |
| FR-013 | OCR 準確度評估 | P0 | **已實作（M1）** | `scripts/gen-ocr-fixtures.mjs`、`eval:ocr`、`eval:ocr:images` |
| FR-014 | 名片照片附件 | P1 | 部分（只有資料層；M1 刻意不保存影像） | — |
| FR-015 | 個資告知與同意紀錄 | P0 | 部分（M1：OCR 前告知；隱私頁與同意紀錄 UI 為 M2） | `OcrCapture.tsx` |
| FR-016～FR-020 | 方案付費、雲端、團隊、CRM、Telegram | P1／P2 | 未變更 | M1 不做 |

## M1 刻意未做

- 不接真實 Google API／OAuth；mock 同步沒有 UI 入口（`provider.label` 標示「測試模式／未連線 Google」）。
- 不做登入、金流；未改產品名稱、未改方案價格（免費層仍為 20 張）。
- 未從 manager 搬入 Prisma、server actions、Auth.js、Stripe、Telegram、`prisma/dev.db` 或任何資料檔。
- 未 push 到 `main`、未合併任何 PR、未部署、未封存 business-card-manager。

## 風險與發現

- **歷史資料庫檔**：`prisma/dev.db` 仍在 manager 與本 repo 舊分支 `origin/master` 的 git 歷史中（未讀取、未搬入）。需 Sean 確認。
- **OCR 準確度宣稱**：上表為合成資料結果，不得對外宣稱為真實名片準確度。
- **第三方 CDN**：CDN 無法連線時 OCR 失敗並退回手動輸入（已有測試）。

## 部署

- 未部署；未更新 Notion、未執行 `sync-3way.sh`。

## 下一步（等待 Sean）

1. 覆審 M1 scope 與 AC-003 門檻；確認 Tesseract 語言檔沿用 CDN。
2. 以測試帳號實際匯入一次 Google CSV，確認欄位名稱。
3. 為 PR 加上 `risk-approved` 標籤（`ci.yml` 屬 sensitive path）後審查；PR #1（文件）需先或一併處理。
