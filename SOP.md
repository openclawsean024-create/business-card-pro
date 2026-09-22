# 名片王 Pro — 開發 SOP

## 規格對齊狀態 (2026-08-08 + 2026-09-20 v3.1 工作台)

- ✅ PRD/SPEC.md v3.0 (從 GitHub upstream 同步, 67KB / 1135 行)
- ✅ §3.1 FR-001 ~ FR-010 (10 個 P0, 9 個實作, FR-005 OCR preview 未實作 UI 對齊 Non-Goals)
- ✅ §3.4 AC-001 ~ AC-010 (10 條 AC, 65 條測試覆蓋)
- ✅ §4.1 技術棧: Next.js 16 + React 19 + Zustand + Tailwind 3 + Vitest
- ✅ §4.3 Domain models: Contact / ExchangeEvent / Followup / Interaction / Consent / PlanQuota
- ✅ §5.3 降級機制: localStorage 失敗保留草稿 + try/catch
- ✅ §6.1 DoD: 全部 P0 通過, RWD (mobile bottom-nav + desktop sidebar), a11y (aria-* + sr-only + focus-visible + axe 0 critical/serious)

## 已實作

- ✅ Next.js 16 App Router + React 19 + TypeScript strict
- ✅ Zustand 5 + localStorage 持久化 (SPEC FR-008 本地資料模式)
- ✅ 5 個 tab + 桌面 sidebar / 手機 bottom nav 兩種主導覽
- ✅ vCard 3.0 + CSV + ICS 匯出 / CSV 匯入
- ✅ 排程回訪 + 一鍵完成 (互動時間線自動生成,接續完成 timestamp/note)
- ✅ 搜尋 (姓名 / 公司 / 標籤 / 備註) + 排序
- ✅ 免費層 20 張聯絡人上限 + sidebar 容量條提示
- ✅ 今日回訪工作台:逾期/今天/接下來 三組 queue + PulseCard 14 天節奏
- ✅ 點聯絡人開 detail drawer (ESC / scrim 關閉) + 快速記錄內嵌
- ✅ 個資最小化: 刪除聯絡人同步清除照片 + 互動 + 回訪 + 同意紀錄
- ✅ Dark mode + RWD (390 / 768 / 1440)
- ✅ 65/65 Vitest 通過

## 故意不做

- ❌ OCR (Tesseract.js): SPEC §1.5 Non-Goals 明確排除 OCR 主功能
- ❌ 雲端同步 / Supabase: SPEC §3.1 FR-008 本地模式優先
- ❌ 註冊 / 登入: v3.0 仍是 local-only pilot
- ❌ Stripe 訂閱: SPEC §15.13 MV-02 待 30 天 pilot 驗證
- ❌ 原生 App / iOS: SPEC §1.5 Non-Goals, MVP 階段以 PWA 為主
- ❌ 把 `public/ui-prototype.html` 直接嵌入正式 app (保留為設計參考,正式 UI 用 React 元件重寫)

## v2 規劃 (SPEC §3.2 P1, 待 §15.13 市場驗證通過)

- SHOULD-01 中英文 OCR (只在 3 位以上 pilot 要求時啟動)
- SHOULD-02 Google Calendar 單向提醒 (已完成 .ics 匯出)
- SHOULD-03 一個 CRM CSV connector
- SHOULD-04 團隊共享回訪 queue
- SHOULD-05 名片交換活動批次整理
- SHOULD-06 付費訂閱與資料加密同步

## 技術債 / 已知限制

- ESLint 規則 `react-hooks/set-state-in-effect` 在 hydration effect 上 warning(已加 disable comment)
- Vitest typecheck 與 tsc 分開跑(`tsc --noEmit` 不含 test 檔)
- localStorage 容量約 5–10MB,pilot 階段 20 張聯絡人足夠;若日後擴到 200 張以上應改 IndexedDB
- **Node 26 + vitest 4 + jsdom 29**:vitest 4 的 `configLoader:'native'` 對 ESM 寫法的 `vitest.config.ts` 會靜默忽略 `test.environment` 等欄位(jsdom 不會掛載)。**必須**用 CJS 寫法(`require()` + `module.exports`),或加 `// @vitest-environment jsdom` docblock 個別指定。
- Node 26 內建 `localStorage` experimental 會在 vitest 啟動時丟 `ExperimentalWarning: localStorage is not available ...`,這是 Node 26 自身訊息,jsdom 已正確運作,可忽略。
- `Sidebar.tsx` 為了壓 lint 留有未使用的 icon re-export (`SIDEBAR_ICON_REFS`),功能不受影響。

## 驗證 SOP

```bash
npm run typecheck  # tsc --noEmit (src/ 不含 test)
npm run test       # vitest run (65 條)
npm run build      # next build 靜態匯出
npm run lint       # ESLint (1 個預先存在 warning 在 eslint.config.mjs)
```

build exit 0 + 3 static pages + 0 typecheck errors + 65 tests passed = 通過。