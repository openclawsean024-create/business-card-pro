# Sprint Status — business-card-pro（名片回訪 CRM）

- Project: 名片回訪 CRM（repo 與 UI 舊名：名片王 Pro）
- Repo: `openclawsean024-create/business-card-pro`（預設分支 `main`）
- 併入來源: `openclawsean024-create/business-card-manager`（預設分支 `master`，只讀）
- Spec: `PRD/SPEC.md` v4.0（2026-11-16 文件重建）
- Goal: `GOAL.md` — M1
- State: 📝 **文件重建完成、M1 尚未開發** — 2026-11-16
- Stack: Next.js 16（static export）+ React 19 + TypeScript strict + Zustand 5 + Tailwind 3 + Vitest 4

## Notion 商品資料庫對應

| Notion 欄位 | 值 | 本 repo 對應 |
|---|---|---|
| 產品名稱 | 名片回訪 CRM | UI／README 仍為「名片王 Pro」，改名待決定 |
| 優先順序 | P3 | — |
| 開發順位 | 第 8 個 | — |
| 主 repo | business-card-pro（main） | 本 repo |
| 要併入的 repo | business-card-manager | `PRD/SPEC.md` §10 合併清單；M1 AC-001 |
| 獲利潛力 | 低 | `PRD/SPEC.md` §3 |
| 獲利模式 | 免費增值 | `PRD/SPEC.md` §3；兩 repo 方案設定矛盾，待決定 |
| 目標客群 | 台灣 B2B 業務 | `PRD/SPEC.md` §2 |
| 現況完成度 | 60 | 本次未重新評分；13 項 P0 FR 中 8 項已實作、3 項部分（FR-005、FR-010、FR-015）、2 項未實作（FR-012、FR-013） |
| 上市前要補 | 合併兩個 repo、OCR 準確度、與 Google 聯絡人同步 | M1：AC-001（合併）、AC-002／AC-003（OCR）、AC-004／AC-005（Google 聯絡人檔案互通 + mock）；真實 Google 同步在 M3 |
| 主要風險 | 名片全能王等競品強勢 | `PRD/SPEC.md` §4、§8 |

## 本次增量（2026-11-16）

- 只重建文件：`PRD/SPEC.md`、`GOAL.md`、`AGENTS.md`、`SOP.md`、`STATUS.md`。未修改任何程式、設定或測試。
- 實際閱讀兩個 repo 的頁面、元件、資料模型、API、測試與 scripts，FR 狀態以程式為準；README 與程式不符處列於 `PRD/SPEC.md` §11。

## 目前驗證證據（`main@a8b5fe8`，Node v26.13.1，2026-11-16）

| 指令 | Exit | 結果 |
|---|---:|---|
| `npm ci --legacy-peer-deps` | 0 | 安裝完成 |
| `npm run typecheck` | 0 | 0 errors |
| `npm test` | 0 | 9 files、65 tests passed |
| `npm run build` | 0 | 靜態匯出，`out/index.html` 產出 |
| `npm run lint` | 0 | 0 errors、1 warning（既有） |
| `npm run test:coverage` | — | 缺 `@vitest/coverage-v8`，無法產生覆蓋率 |

business-card-manager 的測試（`tests/plans.test.ts`，10 條）本次未安裝依賴執行。

## FR 對照（詳見 `PRD/SPEC.md` §5）

| FR | 需求 | 優先 | 狀態 | 所在 repo |
|---|---|---|---|---|
| FR-001 | 手動建立／編輯聯絡人 | P0 | 已實作 | 主 repo |
| FR-002 | 來源、情境、下一步、日期 | P0 | 已實作 | 主 repo |
| FR-003 | 今日／逾期／接下來 queue、一鍵完成 | P0 | 已實作 | 主 repo |
| FR-004 | vCard／CSV 匯出、CSV 匯入 | P0 | 已實作（vCard 匯入未實作） | 主 repo |
| FR-005 | OCR 預覽確認 | P0 | 部分 | manager（OCR 但自動存檔、無預覽）；主 repo 只有型別 |
| FR-006 | 搜尋、標籤、排序 | P0 | 已實作 | 主 repo（manager 有較簡單版本） |
| FR-007 | 互動時間線 | P0 | 已實作 | 主 repo |
| FR-008 | 本機資料模式 | P0 | 已實作 | 主 repo |
| FR-009 | 刪除連帶清除、重置 | P0 | 已實作 | 主 repo（manager 有單筆刪除） |
| FR-010 | 免費層上限 | P0 | 部分（匯入可繞過） | 主 repo（20 張）；manager（30 張） |
| FR-011 | `.ics` 回訪提醒匯出 | P1 | 已實作 | 主 repo |
| FR-012 | Google 聯絡人同步 | P0 | 未實作 | — |
| FR-013 | OCR 準確度評估 | P0 | 未實作 | — |
| FR-014 | 名片照片附件 | P1 | 部分（只有資料層） | 主 repo；manager 只有欄位 |
| FR-015 | 個資告知與同意紀錄 | P0 | 部分 | 主 repo 資料層；manager 隱私／條款頁（內容與程式不符） |
| FR-016 | 方案與付費 | P1 | 部分 | manager（方案資料 + 佔位結帳頁，無金流） |
| FR-017 | 帳號與雲端同步 | P2 | 部分 | manager（Auth.js + Prisma SQLite），與主 repo 架構不相容 |
| FR-018 | 團隊共享 queue | P2 | 未實作 | — |
| FR-019 | CRM CSV connector | P2 | 未實作 | manager 頁面宣稱但無程式 |
| FR-020 | Telegram 機器人 | P2（建議刪除） | 未實作 | manager 只有 model |

## M1 AC 進度

| AC | 標題 | 狀態 |
|---|---|---|
| AC-001 | 合併：OCR 與拍照輸入搬入，不帶伺服器依賴 | 未開始 |
| AC-002 | OCR 只產生預覽，確認後才建立 | 未開始 |
| AC-003 | OCR 準確度：合成假名片測試集與門檻 | 未開始（門檻待 Sean 確認） |
| AC-004 | Google 聯絡人：檔案互通 | 未開始（Google CSV 欄位待查證） |
| AC-005 | Google 聯絡人：mock 同步 adapter，零網路 | 未開始 |
| AC-006 | 免費層上限不可被匯入繞過 | 未開始 |
| AC-007 | OCR 前的個資告知 | 未開始 |
| AC-008 | 品質門檻與證據 | 未開始 |

## 風險與發現

- **歷史資料庫檔**：`prisma/dev.db` 曾在 commit `52b83fc` 提交、`c818e6e` 取消追蹤，仍存在於 business-card-manager 的 git 歷史與本 repo 的舊分支 `origin/master` 歷史中；內含 1 筆 User、1 筆 BusinessCard、1 筆 Subscription（本次只計數、未讀內容）。需 Sean 確認是否為測試資料。
- **CI 假綠燈**：`ci.yml` 的 test 步驟以 `|| echo` 吞掉失敗。
- **文件與程式不符**：README 測試數與 tab 數過時；types 註解宣稱 Web Crypto 加密但未實作；manager 的隱私頁、首頁、方案頁宣稱多項未實作功能（`PRD/SPEC.md` §11）。
- **明文憑證欄位**：manager `TelegramLink.botToken`（不搬移）。
- 本次在兩個 repo 的工作樹與 manager 舊分支掃描常見憑證格式，未發現硬編碼憑證；未發現名片影像檔。

## 部署（沿用前版紀錄，本次未重新驗證）

- Vercel production alias：`business-card-pro.vercel.app`；前版紀錄 v3.1 於 commit `bfbc56c` 部署 READY。
- 本次為文件分支，未部署、未更新 Notion、未執行 `sync-3way.sh`。

## 下一步

1. Sean 回覆 `PRD/SPEC.md` §12 待確認事項（至少：OCR 門檻、Google 聯絡人 M1 範圍、方案價格）。
2. 依 `GOAL.md` 開始 M1，完成後在本檔更新每條 AC 的驗證指令、exit code 與日期。
