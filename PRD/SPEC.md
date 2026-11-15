# 名片回訪 CRM — 產品規格書（PRD）v4.0

> 版本：v4.0（2026-11-16，文件重建）｜前版：v3.0.2（2026-09-06）
> 商業依據：Notion「可產品化商品」資料庫中的「名片回訪 CRM」列（唯一商業依據）。
> 程式依據：本 repo `main` 分支 `a8b5fe8`，以及要併入的 `openclawsean024-create/business-card-manager` 預設分支 `master`。
> 重建原則：功能狀態一律以實際程式碼為準；README 或舊文件與程式不一致時，以程式為準並在 §11 註明。
> 外部事實（競品數據、價格、市場規模、法規細節）沒有可靠出處者一律標「待確認」，不作為驗收依據。

本 repo 的 README、UI 與 `package.json` 目前仍使用舊名「名片王 Pro」。產品名稱以 Notion 為準，改名是否同步到 UI 列為待確認事項（§12）。

---

## 0. 與 v3.0.2 的主要差異

| 項目 | v3.0.2 | v4.0（本版） | 原因 |
|---|---|---|---|
| 產品名稱 | 名片王 Pro | 名片回訪 CRM | 對齊 Notion |
| OCR | Non-Goal，只留「可選 preview」位置，未實作 | **上市前必補（P0）**：OCR 只產生預覽，所有欄位需使用者確認；要有可量測準確度 | Notion「上市前要補」列出 OCR 準確度 |
| Google 聯絡人 | 未提及 | **上市前必補（P0）**；M1 以檔案互通 + mock adapter 驗證，真實 API 同步延到 M3 | Notion「上市前要補」 |
| Repo 結構 | 兩個 repo 各自演進 | 以本 repo 為主，business-card-manager 的有用模組搬入（§10 合併清單） | Notion「上市前要補：合併兩個 repo」 |
| 舊版競品數字（如下載量、使用者數） | 引用但無出處，且數字前後不一 | 移除，改標「待確認」 | 不得捏造外部事實 |

---

## 1. 問題

台灣 B2B 業務在展會、拜訪與會議中交換名片後，常見的流失點不是「名片沒掃進去」，而是：

1. 交換後沒有記下「答應了對方什麼、何時要回」；
2. 沒有固定的回訪節奏，回訪靠記憶；
3. 名片資料散在手機相簿、紙本、通訊軟體與 Google 聯絡人之間，無法一處管理；
4. 手動輸入名片欄位費時易錯。

本產品的核心工作（core job）：**把交換名片轉成一個有日期的下一步，並在到期時提醒、完成後留下紀錄。** OCR 與 Google 聯絡人同步是降低輸入與搬移成本的入口，不是產品本身。

> 「回訪不到三成」等量化描述來自前版假設，沒有調查出處，標記為**待確認**，需由 §9 的 pilot 驗證。

## 2. 目標客群

| 類型 | 描述 | 來源 |
|---|---|---|
| 主要客群 | 台灣 B2B 業務（個人工作者或小團隊成員），每月交換一定數量名片，沒有或不想維護企業 CRM | Notion 目標客群 |
| 次要客群 | 業務主管（關心團隊回訪率）、房仲、保險、顧問等高名片量工作者 | 前版 SPEC 假設，待 pilot 驗證 |
| 非目標 | 企業級 CRM 管理者、海外市場使用者、需要 pipeline／報價管理的團隊 | §1.5 Non-Goals 延續 |

## 3. 獲利模式

- Notion 定義：**免費增值（freemium）**；獲利潛力：**低**。
- 現況程式中有兩套互相矛盾的方案設定，價格與額度需 Sean 決定（§12）：

| 來源 | 免費層 | 付費層 1 | 付費層 2 |
|---|---|---|---|
| 主 repo `src/lib/types.ts`（`defaultPlan()`、註解） | 20 張，僅本機 | 個人 NT$149/月（200 張，僅註解，未實作） | 業務 NT$399/月（未實作） |
| business-card-manager `src/lib/plans.ts` | 30 張 | Pro NT$149/月（無限、雲端同步） | Business NT$999/月（5 帳號、CRM、API） |

- 現況：兩個 repo 都**沒有可用的金流**。manager 的 `src/lib/stripe.ts` 只有 client 初始化，沒有任何呼叫端；`/checkout` 頁面是「金流串接中」的佔位頁。
- 原則：免費層必須保留完整匯出（vCard/CSV），不以鎖資料作為付費誘因。

## 4. 競品與差異

| 競品 | 定位（概述） | 規模、價格、市佔 | 本產品不追的部分 |
|---|---|---|---|
| 名片全能王（CamCard） | 通用名片掃描與管理 | 待確認（前版引用的下載量／使用者數無出處且前後矛盾，已移除） | OCR 規模、速度、多語系辨識 |
| Sansan／Eight | 日本市場的企業名片管理與個人名片 App | 待確認 | 企業名片資料庫 |
| CardNest | 前版列為競品 | 待確認（產品定位與在台灣市占皆未查證） | — |
| 試算表／手機聯絡人／Google 聯絡人 | 業務最常見的替代方案 | — | — |

差異化假設（需 pilot 驗證）：

1. **以回訪 queue 為主畫面**：今日／逾期／接下來三組 queue、一鍵完成並寫入時間線，而非名片資料庫。
2. **本機優先、資料可攜**：免費層不需註冊，資料在使用者瀏覽器；隨時匯出 vCard／CSV／ICS。
3. **OCR 只是輸入捷徑**：辨識結果一律預覽確認，不自動存檔。
4. **與 Google 聯絡人互通**：不要求使用者放棄既有通訊錄。

主要風險（Notion）：**名片全能王等競品強勢**。本產品不與其比拼 OCR，若 pilot 顯示使用者只要 OCR、不要回訪 queue，應重新評估產品方向。

---

## 5. 功能需求（FR）

狀態定義：**已實作**＝在主 repo `main` 有程式與測試；**部分**＝有部分程式但缺 UI、缺測試或行為不符需求；**未實作**＝兩個 repo 都沒有。優先級：P0＝上市前必備、P1＝上市後首批、P2＝探索。

| FR | 需求 | 優先 | 狀態 | 所在 repo／證據 |
|---|---|---|---|---|
| FR-001 | 手動建立／編輯聯絡人；姓名或公司至少一項必填；Email 格式驗證；標籤 | P0 | 已實作 | 主 repo：`lib/domain.ts#validateContactPayload`、`store.addContact/updateContact`、`ContactFormModal.tsx`；`domain.test.ts`、`store.test.ts` |
| FR-002 | 建立時記錄來源、交換情境、下一步與預計日期 | P0 | 已實作 | 主 repo：`store.addContact(opts)`、`followupFromExchange` |
| FR-003 | 今日／逾期／接下來（7 天）回訪 queue、一鍵完成並寫入下次承諾、今日進度與 14 天節奏 | P0 | 已實作 | 主 repo：`getTodayQueue`、`getUpcomingQueue`、`getTodayProgress`、`buildRhythm`、`TodayTab.tsx`、`QueueGroup.tsx`、`PulseCard.tsx`；`workstation.test.tsx` |
| FR-004 | 匯出 vCard 3.0、CSV（含 schema 版本 meta）；匯入 CSV | P0 | 已實作 | 主 repo：`lib/export.ts`、`SettingsTab.tsx`；`domain.test.ts`。**vCard 匯入未實作** |
| FR-005 | OCR 預覽：拍照或上傳名片 → 辨識 → 預填表單 → 使用者逐欄確認後才建立；低信心欄位標示 | P0 | 部分 | 主 repo：只有 `ContactPayload.ocrConfidence/ocrLowConfidenceFields` 型別，UI 永遠填 `null`。manager：`dashboard/card-list.tsx` 以 CDN 載入 Tesseract.js（`eng+chi_tra`）+ `parseCardHeuristic`，**辨識後直接存檔、無預覽確認、不記錄信心值** |
| FR-006 | 搜尋姓名、公司、職稱、標籤、備註；標籤篩選；四種排序 | P0 | 已實作 | 主 repo：`matchesSearch`、`listContacts`、`sortContacts`、`ContactsTab.tsx` |
| FR-007 | 互動時間線（8 種互動類型）與快速記錄 | P0 | 已實作 | 主 repo：`getTimeline`、`LogInteractionForm.tsx`、`ContactDetailDrawer.tsx`、`TimelineTab.tsx`；`interactions.test.tsx` |
| FR-008 | 本機資料模式（localStorage，不需登入） | P0 | 已實作 | 主 repo：`store.ts` persist、`STORAGE_KEY = "business-card-pro-v3"`、`isLocalOnly` |
| FR-009 | 刪除聯絡人時連帶清除照片、交換、回訪、互動、同意紀錄；全部重置 | P0 | 已實作 | 主 repo：`cascadeDeleteContact`、`store.reset`；`domain.test.ts` |
| FR-010 | 免費層聯絡人上限 | P0 | 部分 | 主 repo：`addContact` 檢查 `plan.maxContacts`（20）；**`importContacts` 未檢查上限，CSV 匯入可超過** |
| FR-011 | 回訪提醒匯出為 `.ics`，可匯入 Google Calendar（單向、不連線） | P1 | 已實作 | 主 repo：`exportCalendar`；`calendar.test.ts` |
| FR-012 | Google 聯絡人同步：匯出／匯入 Google 聯絡人可讀的格式，欄位對照、去重、衝突處理；之後再接真實 API | P0 | 未實作 | 兩個 repo 都沒有程式。manager 的 `auth.ts` 只有被註解掉的 Google OAuth provider |
| FR-013 | OCR 準確度評估：合成假名片測試集 + 可重跑的評估指令 + 門檻 | P0 | 未實作 | 兩個 repo 都沒有 |
| FR-014 | 名片照片附件（可選保存，隨聯絡人刪除） | P1 | 部分 | 主 repo：`CardImage` 型別與 `store.attachCardImage` 存在，**無 UI 呼叫**；manager：`BusinessCard.imageUrl` 欄位存在但未寫入 |
| FR-015 | 個資告知與同意紀錄（隱私權聲明頁、OCR 前告知、同意紀錄 UI） | P0 | 部分 | 主 repo：`Consent` 型別、`store.grantConsent`，**無 UI**；設定頁有一段本機儲存說明。manager：`/privacy`、`/terms` 頁存在，但內容與程式不符（見 §11） |
| FR-016 | 方案與付費：方案表單一來源、升級提示、付款（測試模式） | P1 | 部分 | manager：`lib/plans.ts` + 10 條測試、`/pricing`、`/checkout` 佔位頁；Stripe 未接 |
| FR-017 | 帳號與加密雲端同步（多裝置） | P2 | 部分 | manager：Auth.js v5 Credentials（bcrypt）+ Prisma（SQLite dev）+ `BusinessCard` CRUD server actions；與主 repo 的 static export／local-only 架構不相容 |
| FR-018 | 團隊共享回訪 queue | P2 | 未實作 | — |
| FR-019 | 一個 CRM CSV connector（如 HubSpot 等，對象待確認） | P2 | 未實作 | manager 的方案頁宣稱「HubSpot / Salesforce 整合」，程式中不存在 |
| FR-020 | Telegram 機器人建檔 | P2（建議刪除） | 未實作 | manager：只有 `TelegramLink` model（含明文 `botToken` 欄位）；舊靜態分支有 `telegram-bot.js`，不在預設分支 |

### 5.1 既有驗收條件（AC，沿用 v3.0 編號，已有測試）

> 本節為 v3.0 的 AC 編號（測試註解以此引用），與 `GOAL.md` 的 M1 AC 編號各自獨立。

- AC-001：姓名與公司皆空時拒絕建立（FR-001）。
- AC-002：建立時可帶來源、情境、下一步與日期，並產生 pending follow-up（FR-002）。
- AC-003：今日 queue 只包含未完成且今日到期或逾期的回訪，逾期在前（FR-003）。
- AC-004：完成回訪後寫入時間線並保留下次承諾（FR-003、FR-007）。
- AC-006／AC-007：vCard 與 CSV 匯出欄位正確、特殊字元跳脫（FR-004）。
- AC-008：搜尋可命中姓名、公司、標籤（FR-006）。
- AC-009：刪除聯絡人後照片、互動、回訪、同意紀錄皆清除（FR-009）。
- AC-010：達 20 張上限時拒絕新增（FR-010，僅限手動新增路徑）。
- AC-005（OCR 預覽）在 v3.0 未實作；M1 的新 AC 見 `GOAL.md`。

---

## 6. 非功能需求

| 類別 | 需求 | 現況 |
|---|---|---|
| 可用性／RWD | 390／768／1440 寬度可用；手機 bottom nav、桌機 sidebar | 已實作（`layout.test.tsx`） |
| 無障礙 | skip link、focus-visible、aria 標記；axe 無 critical／serious | 已實作（`a11y-axe.test.tsx`） |
| 效能 | 核心互動本機 ≤500ms；搜尋 1,000 筆 ≤500ms；OCR 單張在中階手機 ≤15 秒（初版目標，待量測） | 未量測 |
| 離線／降級 | localStorage 寫入失敗時保留畫面狀態並 console 警告；OCR 失敗時退回手動輸入且不丟失已填欄位 | localStorage 降級已實作；OCR 降級未實作 |
| 資料可攜 | 免費層可完整匯出；匯出檔含 schema 版本 | 已實作（`EXPORT_SCHEMA_VERSION = 2`） |
| 相容性 | 不得更改 `STORAGE_KEY`；schema 變更需向下相容 | 規則已存在 |
| 部署 | Next.js static export（`out/`）→ Vercel | 已實作；M1 不得引入 server route |
| 品質門檻 | `bash scripts/quality-gate.sh`（npm ci → typecheck → test → build → lint）全綠 | 已配置；CI 的 `ci.yml` test 步驟以 `\|\| echo` 吞掉失敗，見 §8 風險 |

## 7. 資料與個資處理

名片上的姓名、電話、Email、地址、職稱屬於**名片持有人以外第三人的個人資料**。產品使用者（業務）蒐集這些資料用於業務聯繫；本產品在本機模式下不接觸資料，在雲端模式下則代為保存與處理。

| 原則 | 規格 | 現況 |
|---|---|---|
| 最小蒐集 | 只保存 `ContactPayload` 定義的欄位；OCR 原始文字不保存（manager schema 有 `ocrRawText` 欄位，搬移時不帶入） | 主 repo 符合 |
| 本機優先 | 免費層資料只在瀏覽器 localStorage；OCR 於瀏覽器端執行，名片影像不上傳伺服器 | 主 repo 本機模式已實作；OCR 待實作 |
| 影像保存 | 名片照片預設**不保存**；使用者勾選才以附件存入，並隨聯絡人刪除 | 刪除連帶清除已實作；保存 UI 未實作 |
| 刪除 | 單筆刪除連帶清除；全部重置清空 localStorage | 已實作 |
| 告知 | OCR 入口與設定頁需說明資料存放位置、是否上傳、如何刪除；需有隱私權聲明頁 | 部分（設定頁一段說明） |
| 開發資料 | repo、測試、fixture、截圖一律使用明顯假資料（姓名如「測試 王小明」、電話如 `0900-000-001`、Email 用 `@example.com`）；不得提交真實名片影像 | 本次重建掃描未在主 repo `main` 發現真實名片影像；歷史問題見 §8 |
| 雲端與第三方 | 接 Google 聯絡人或雲端同步前，需完成資料流說明、權限範圍、加密方式與人審 | M3 才處理 |

## 8. 法規與風險

| 風險 | 說明 | 處置 |
|---|---|---|
| 競品強勢（Notion 主要風險） | 名片全能王等成熟產品已覆蓋 OCR 與名片管理 | 不比拼 OCR；以回訪 queue 驗證差異；pilot 不達標即重新評估 |
| 個資法遵 | 台灣《個人資料保護法》對蒐集、處理、利用第三人個資的告知與目的限制要求如何適用於本產品（本機模式 vs 雲端模式），**待確認（需法律意見）** | 上市前完成隱私權聲明與告知文案的法律審閱 |
| Google API 政策 | 聯絡人存取權限範圍是否屬需審查的敏感範圍、OAuth 應用驗證流程與時程，**待確認** | M1 只做檔案互通與 mock；M3 前查證 |
| OCR 準確度 | manager 的 `parseCardHeuristic` 以簡單 regex 判斷姓名／電話，對直式、中英混排名片可能誤判 | M1 建立合成測試集與門檻（`GOAL.md` AC-003） |
| 歷史資料外洩 | 主 repo 的舊分支 `origin/master` 與 manager 的歷史 commit `52b83fc` 曾提交 `prisma/dev.db`（含 1 筆 User、1 筆 BusinessCard、1 筆 Subscription；本次未讀取內容），後於 `c818e6e` 取消追蹤但仍留在 git 歷史 | 由 Sean 判斷是否為測試資料；若含真實資料需另案清理歷史（不在本次範圍） |
| CI 假綠燈 | `.github/workflows/ci.yml` 的 test 步驟為 `npm test -- --run 2>&1 \|\| echo "no test script"`，測試失敗不會讓 CI 失敗；lint 為 `continue-on-error` | 修改 workflow 需 `risk-approved` 標籤與人審，列入 M2 |
| 明文憑證欄位 | manager `TelegramLink.botToken` 以明文存 DB | 不搬移（§10） |
| 不實宣稱 | manager 的首頁／方案頁／隱私頁宣稱 Telegram、雲端同步、CRM 整合、Neon Postgres、儀表板匯出等，程式中不存在 | 不搬移這些頁面；上市文案需與實作一致 |

## 9. 里程碑與成功指標

### 9.1 里程碑

| 里程碑 | 範圍 | 退出條件 |
|---|---|---|
| **M1：合併與上市前缺口（本機、mock）** | 依 §10 把 manager 的 OCR 與拍照輸入搬入主 repo 並改為預覽確認流程（FR-005）；OCR 合成測試集與評估指令（FR-013）；Google 聯絡人檔案互通 + mock 同步 adapter（FR-012）；修正匯入繞過上限（FR-010）；OCR 前告知（FR-015 的一部分） | `GOAL.md` AC-001～AC-008 全數通過且 Sean 覆審 |
| **M2：上市準備** | 隱私權聲明／服務條款頁（依實作改寫）、同意紀錄 UI、名片照片附件 UI（FR-014）、vCard 匯入、方案與價格定案及升級提示（FR-016，金流僅測試模式）、E2E 測試、CI 假綠燈修正（需 risk-approved）、改名決策、manager repo 處置（封存與否由 Sean 決定） | 法律審閱完成、E2E 全綠、5 位 pilot 開始使用 |
| **M3：雲端與真實整合** | 帳號與加密雲端同步（FR-017，參考 manager 的 Auth.js／Prisma 設計但重新做安全設計）、真實 Google People API 同步、真實金流 | 威脅模型與人審通過、Google 權限審查（如需要）通過 |

### 9.2 成功指標（假設，需 pilot 驗證）

| 指標 | 目標 | 量測方式 |
|---|---|---|
| 14 天回訪完成率 | ≥50%（每位 pilot 以 20 張聯絡人計） | 本機匯出的 follow-up 完成數／到期數（pilot 自行回報，不上傳） |
| 付費意願 | 30 天內 ≥5 位台灣業務願意付費 | 訪談與付費意向紀錄 |
| OCR 輸入節省 | OCR 預覽後需修改的欄位比例低於 M1 門檻定義的錯誤率 | `GOAL.md` AC-003 的評估報告 |
| 留存 | pilot D14 仍每週使用 | pilot 回報 |

以上門檻沿用前版 SPEC 的內部假設，非外部市場數據。

---

## 10. 合併清單（business-card-manager → business-card-pro）

依據：manager 預設分支 `master`（HEAD `1ea3194`，淺層 clone）。主 repo 已有且更完整的功能不重複列入搬移。manager 另有 `feat/vcard-import`、`v3-ui-overhaul`、`claude/camcard-clone-productize-4257k`、`gh-pages` 四個與 `master` 無共同祖先的舊分支（2026-04～05 的靜態 HTML 原型，含 `telegram-bot.js`、`api/ocr.js`），不列入搬移。

### 10.1 要搬入主 repo

| # | manager 來源 | 搬入後位置（建議） | 搬移方式 | 里程碑 |
|---|---|---|---|---|
| 1 | `dashboard/card-list.tsx` 的 Tesseract.js OCR 流程（`eng+chi_tra`、進度回報） | `src/lib/ocr/engine.ts`（engine adapter 介面 + Tesseract 實作） | 改為 npm 依賴 + adapter 注入，測試用 mock engine；**不再自動存檔**，改為回傳預覽結果 | M1 |
| 2 | `parseCardHeuristic`（email／電話／姓名／公司／職稱 regex） | `src/lib/ocr/parse.ts` | 抽成純函式並補單元測試；需改善以達 M1 門檻；輸出每欄信心值與低信心清單，對應 `ContactPayload.ocrConfidence/ocrLowConfidenceFields` | M1 |
| 3 | 拍照輸入（`<input type="file" accept="image/*" capture="environment">`）與上傳圖片按鈕 | 新元件（如 `src/components/OcrCapture.tsx`），結果導入既有 `ContactFormModal` | 只搬 UI 互動，沿用主 repo 設計系統 | M1 |
| 4 | `lib/plans.ts` 方案資料結構與 `tests/plans.test.ts` | `src/lib/plans.ts` 取代 `defaultPlan()` 中的硬編碼 | 價格與額度待 Sean 決定後再搬；移除 `planFromStripePriceId` 或改為測試模式 | M2 |
| 5 | `/privacy`、`/terms`、`/faq` 頁面結構（`_components/article.tsx`） | static export 下的獨立頁面 | 只搬版型；內容依主 repo 實際行為重寫（現有內容與程式不符） | M2 |
| 6 | `/pricing` 方案比較表版型 | 主 repo 設定頁或獨立頁 | 依定案方案重寫，不得宣稱未實作功能 | M2 |
| 7 | Auth.js v5 + Prisma `User/Account/Session` + `BusinessCard` 欄位設計 | 僅作為 M3 雲端同步的設計參考 | 不搬程式；M3 重新做安全設計（加密、權限、刪除） | M3（參考） |

### 10.2 不搬（及原因）

| manager 項目 | 原因 |
|---|---|
| 名片清單 CRUD、搜尋（`card-list.tsx` 其餘部分、`dashboard/actions.ts`） | 主 repo 已有更完整的聯絡人、搜尋、排序、標籤與回訪功能 |
| Prisma + SQLite、server actions、`/api/auth/[...nextauth]` | 主 repo 是 static export、local-only；引入 server 會違反現行架構與 AGENTS 規則；M3 再設計 |
| 註冊／登入頁（`(auth)/*`） | 同上；M1／M2 不需帳號 |
| `lib/stripe.ts`、`/checkout` | 沒有呼叫端；真實金流不在 M1／M2 範圍；`/checkout` 內含未查證的聯絡 Email 網域 |
| `/contact` 表單與 `ContactMessage` model | 需要 server 與 DB；客服管道另議 |
| `TelegramLink` model | 未實作，且以明文保存 `botToken` |
| 首頁行銷頁（`app/page.tsx`） | 宣稱多項未實作功能；上市頁另行撰寫 |
| `ocrRawText`、`ocrEngine`、`sourceMeta` 欄位 | 違反最小蒐集；主 repo 只需信心值與低信心欄位 |
| `SPEC.md`、`PRD/SPEC.md`、`PRD/CHANGELOG.md`、`dashboard.html`、`README.md` | 文件類；有用內容已併入本 SPEC；README 為 create-next-app 樣板，與程式不符 |
| `.github/workflows/ci.yml` | 主 repo 已有自己的 CI 與 quality gate |
| 舊分支 `api/ocr.js`（伺服器端 Tesseract）、`telegram-bot.js` | 伺服器端 OCR 會把名片影像上傳，違反本機處理原則；Telegram 不在範圍 |

---

## 11. 文件與程式不一致處（以程式為準）

| 位置 | 文件宣稱 | 程式實際 |
|---|---|---|
| 主 repo `README.md` | Vitest 31 條測試；「4 個 tab」 | 9 個測試檔、65 條測試；5 個 tab（今日／全部／聯絡人／時間線／設定） |
| 主 repo `README.md`、舊 SPEC | OCR 是 Non-Goal | Notion 要求上市前補 OCR 準確度（本版改為 P0） |
| 主 repo `src/lib/types.ts` 註解 | 「敏感欄位以 Web Crypto 處理」；個人 200 張、業務無限 | 沒有任何加密程式；只有免費層 20 張被實作 |
| 主 repo `PRD/SPEC.md` v3.0.2 §4.4 | REST API 規格 | 沒有任何 API route（static export） |
| 主 repo `package.json` `start` | `next start` | `output: "export"` 下不適用，預覽請改用靜態伺服器（見 `SOP.md`） |
| 主 repo `test:coverage` | 可產生覆蓋率 | `@vitest/coverage-v8` 未列在 devDependencies，指令無法直接執行 |
| manager `README.md` | create-next-app 樣板說明 | 實際有 Auth.js、Prisma、OCR、方案頁等 |
| manager `/privacy` | 資料存於 Neon Postgres；可從儀表板匯出 vCard／CSV；可刪除帳號 | Prisma datasource 為 SQLite；儀表板無匯出功能；無刪除帳號功能 |
| manager 首頁／`/pricing`／`/faq` | Telegram 機器人、雲端同步、HubSpot／Salesforce 整合、API | 皆未實作 |
| manager OCR | 隱私頁稱影像不上傳伺服器 | 影像確實只在瀏覽器辨識，但 Tesseract 程式與語言檔從 jsDelivr CDN 動態載入 |

## 12. 待確認事項

1. 產品名稱是否從「名片王 Pro」改為「名片回訪 CRM」（UI、`package.json`、Vercel 專案名）。
2. 方案與價格：免費層 20 或 30 張？付費層 NT$149／NT$399／NT$999 如何取捨？
3. Google 聯絡人：M1 以檔案互通 + mock adapter 是否足以視為「上市前要補」的第一階段？真實 API 同步是否必須在上市前完成？
4. OCR 門檻（`GOAL.md` AC-003 的初版數字）是否接受；Tesseract 語言檔要從 CDN 下載還是放在 repo 內自帶。
5. 歷史 `prisma/dev.db` 是否含真實資料、是否需清理 git 歷史。
6. M1 完成後 business-card-manager 的處置（封存、保留、或改為唯讀參考）。
7. 競品規模、價格與市占數據需補可靠出處。
8. 個資法適用與告知文案需法律意見。
