# Goal — 名片回訪 CRM M1

## Objective

在不接觸真實個資、不接真實外部服務的前提下，把 business-card-manager 中仍有價值的 OCR 與拍照輸入搬進本 repo，並補齊 Notion「上市前要補」中可在本機完成的部分：OCR 改為預覽確認流程且有可量測的準確度、Google 聯絡人以檔案互通與 mock 同步驗證、免費層上限不可被匯入繞過。完成後本 repo 是唯一的主程式碼來源，仍維持 Next.js static export、local-only 架構。

規格依據：`PRD/SPEC.md` v4.0（FR-005、FR-010、FR-012、FR-013、FR-015 與 §10 合併清單）。

## Acceptance criteria

每條 AC 的「驗證」欄位是完成判定的唯一依據；標「M1 新增」的指令或測試檔目前不存在，需在 M1 建立。

- **AC-001：合併 — OCR 與拍照輸入搬入主 repo，且不帶入伺服器端依賴**
  - 內容：`SPEC.md` §10.1 第 1～3 項（OCR engine、`parseCardHeuristic`、拍照／上傳輸入）已在本 repo 以 `src/lib/ocr/`（或同等位置）實作；OCR engine 以 adapter 注入，可在測試中替換為 mock。`package.json` 不得新增 `@prisma/client`、`prisma`、`next-auth`、`@auth/*`、`stripe`、`bcryptjs`；`next.config.ts` 維持 `output: "export"`；不新增 `src/app/api/` 或 server actions。
  - 驗證：`npm run build` exit 0 且產出 `out/index.html`；`node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};const bad=['@prisma/client','prisma','next-auth','stripe','bcryptjs'].filter(k=>d[k]);if(bad.length){console.error(bad);process.exit(1)}"` exit 0；`test ! -d src/app/api` 成立；`grep -rn '"use server"' src` 無輸出。

- **AC-002：OCR 只產生預覽，使用者確認後才建立聯絡人**
  - 內容：拍照或上傳 → 辨識 → 結果預填到聯絡人表單；低信心欄位有視覺標示並列入 `ocrLowConfidenceFields`，`ocrConfidence` 寫入實際數值；使用者按下確認前不得呼叫 `addContact`。辨識失敗或使用者取消時退回手動輸入且已填欄位不遺失。名片影像預設不寫入 localStorage。
  - 驗證（M1 新增測試檔，例如 `src/test/ocr-flow.test.tsx`）：以 mock engine 驗證 (a) 辨識完成後 store 的聯絡人數不變、(b) 按下確認後聯絡人數 +1 且 `ocrConfidence` 不為 `null`、(c) mock engine 丟錯時表單仍可手動送出、(d) 流程結束後 `localStorage` 內容不含影像 data URL。執行 `npm test` exit 0。

- **AC-003：OCR 準確度 — 合成假名片測試集與門檻**
  - 測試集：放在 `src/test/fixtures/ocr/`（M1 新增），**只能使用合成的假名片**，禁止任何真實名片影像。內容：
    - 文字層：≥60 筆合成 OCR 原始文字，每筆附 ground truth JSON（姓名、公司、職稱、電話、Email）；涵蓋繁中橫式、繁中直式、中英混排、純英文、含雜訊（多餘空白、全形數字、斷行錯位）五類，每類 ≥10 筆。
    - 影像層：≥30 張由腳本產生的合成名片影像（固定字型與版型，產生腳本一併提交），每張附 ground truth JSON。
    - 假資料規則：姓名用「測試」前綴或明顯虛構名（如「測試 王小明」「Test Alex Chen」）；電話只用 `0900-000-001`～`0900-000-099`、`02-0000-0001`～`02-0000-0099`；Email 只用 `@example.com`；公司名含「範例」或「Example」。
  - 指標：逐欄位比對正規化後完全相符（去空白、全形轉半形、電話只比數字、Email 轉小寫）。
  - 門檻（初版，Sean 可在 M1 開工前調整）：
    - 文字層（parser，CI 必跑）：Email ≥98%、電話 ≥95%、姓名 ≥90%、公司 ≥90%、職稱 ≥85%；全部欄位平均 ≥92%。
    - 影像層（Tesseract 端到端，本機執行）：Email ≥90%、電話 ≥85%、姓名 ≥75%；全部欄位平均 ≥80%。
  - 驗證：M1 新增 `npm run eval:ocr`（文字層，零網路依賴，輸出各欄位準確率並在未達門檻時 exit 1）與 `npm run eval:ocr:images`（影像層）；兩者 exit 0。文字層評估同時以 Vitest 測試納入 `npm test`。評估結果（各欄位數字、測試集筆數、執行日期）記入 `STATUS.md`。

- **AC-004：Google 聯絡人 — 檔案互通**
  - 內容：(a) 匯出 Google 聯絡人可匯入的 CSV（欄位名稱依 Google 官方匯入格式，查證後寫入 `PRD/SPEC.md` 欄位對照表；目前**待確認**）；(b) 匯入 vCard 3.0（Google 聯絡人可匯出此格式）與上述 CSV；(c) 匯入時以 Email（小寫）或電話（只取數字）去重，重複者不新增並回報筆數。
  - 驗證（M1 新增測試檔，例如 `src/test/google-contacts-file.test.ts`）：以合成 fixture 驗證欄位對照、往返（export → import）後欄位一致、去重筆數正確；`npm test` exit 0。

- **AC-005：Google 聯絡人 — mock 同步 adapter，零網路**
  - 內容：定義 `ContactSyncProvider` 介面（pull／push／列出衝突），實作 `MockGoogleContactsProvider`（記憶體資料）。衝突規則：同一聯絡人兩邊皆修改時以 `updatedAt` 較新者為準，另一版本列入衝突清單供使用者確認。UI 若出現同步入口，必須明確標示「測試模式／未連線 Google」。
  - 驗證（M1 新增測試檔，例如 `src/test/contact-sync.test.ts`）：pull／push 欄位對應、衝突判定與清單正確；以 `vi.spyOn(globalThis, "fetch")` 斷言整個同步測試期間 `fetch` 呼叫次數為 0；`npm test` exit 0。

- **AC-006：免費層上限不可被匯入繞過**
  - 內容：CSV、vCard 匯入與 mock 同步 pull 都遵守 `plan.maxContacts`；超過時只匯入到上限，並告知未匯入筆數。
  - 驗證：在 `src/test/store.test.ts` 或新測試檔加入「已有 19 筆時匯入 5 筆，結果為 20 筆、回報 4 筆未匯入」的案例；`npm test` exit 0。

- **AC-007：OCR 前的個資告知**
  - 內容：OCR 入口顯示簡短告知：影像只在本機辨識、不上傳伺服器、預設不保存影像、名片內容屬他人個資應僅用於業務聯繫；若 Tesseract 語言檔從 CDN 下載，告知中須說明會下載辨識模型（不含影像）。
  - 驗證：`src/test/ocr-flow.test.tsx` 斷言告知文字在 OCR 入口可見，且通過既有 axe 檢查（`src/test/a11y-axe.test.tsx` 擴充涵蓋 OCR 入口）；`npm test` exit 0。

- **AC-008：品質門檻與證據**
  - 內容：既有 65 條測試全部保留且通過（不得為了通過而刪除或放寬斷言）；新增測試涵蓋 AC-002～AC-007；文件同步更新（`STATUS.md` 的 FR 對照與評估數字、`SOP.md` 的新指令）。
  - 驗證：`bash scripts/quality-gate.sh` exit 0（依序 `npm ci --legacy-peer-deps`、`npm run typecheck`、`npm test`、`npm run build`、`npm run lint`）；`npm test` 回報測試數 ≥65 + 新增數，且 `git diff main -- src/test` 中既有測試檔只有新增、沒有刪除 `expect` 行（以 `git diff main -- src/test | grep '^-.*expect('` 無輸出確認，若確需修改須在 PR 說明逐條理由並經 Sean 同意）；`git diff --check` exit 0。

## Out of scope

- 真實 Google 聯絡人同步：Google OAuth、People API 呼叫、任何 Google 憑證或 client secret（M3）。
- 真實金流：Stripe 或任何付款串接、真實付款測試、方案定價定案（M2 決定價格；金流 M3）。
- 真實個資：真實名片影像、真實客戶或同事資料、從任何人手機匯出的聯絡人檔案。
- 帳號、登入、雲端資料庫、加密同步，以及 manager 的 Auth.js／Prisma／server actions（M3 重新設計）。
- 隱私權聲明與服務條款完整頁面、同意紀錄 UI、名片照片附件保存 UI、方案頁（M2）。
- Telegram、CRM connector、團隊共享、原生 App。
- GitHub Actions workflow、Vercel 設定、部署與 production release（變更需 `risk-approved` 與人審）。
- 封存、刪除或改名 business-card-manager（M1 完成後由 Sean 決定）。

## Exit gate

M1 完成前需由 Sean 覆審 scope 與 AC-003 門檻，並通過 `bash scripts/quality-gate.sh`、`npm run eval:ocr`、`npm run eval:ocr:images`。`STATUS.md` 需列出每條 AC 的驗證指令、exit code 與日期；任何一條未通過不得進入 M2，也不得對外宣稱 OCR 準確度或 Google 聯絡人同步已上線。
