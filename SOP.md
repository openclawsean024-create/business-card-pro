# 名片王 Pro — 開發 SOP

## 規格對齊狀態 (2026-08-08)

- ✅ PRD/SPEC.md v3.0 (從 GitHub upstream 同步, 67KB / 1135 行)
- ✅ §3.1 FR-001 ~ FR-010 (10 個 P0, 9 個實作, FR-005 OCR preview 未實作 UI 對齊 Non-Goals)
- ✅ §3.4 AC-001 ~ AC-010 (10 條 AC, 31 條測試覆蓋)
- ✅ §4.1 技術棧: Next.js 16 + React 19 + Zustand + Tailwind 3 + Vitest
- ✅ §4.3 Domain models: Contact / ExchangeEvent / Followup / Interaction / Consent / PlanQuota
- ✅ §5.3 降級機制: localStorage 失敗保留草稿 + try/catch
- ✅ §6.1 DoD: 全部 P0 通過, RWD (mobile bottom-nav + desktop), a11y (aria-* + sr-only + focus-visible)

## 已實作

- ✅ Next.js 16 App Router + React 19 + TypeScript strict
- ✅ Zustand 5 + localStorage 持久化 (SPEC FR-008 本地資料模式)
- ✅ 4 個 tab: 今日 queue / 全部 queue / 聯絡人 / 互動時間線 / 設定
- ✅ vCard 3.0 + CSV 匯出 / 匯入
- ✅ 排程回訪 + 一鍵完成 (互動時間線自動生成)
- ✅ 搜尋 (姓名 / 公司 / 標籤 / 備註) + 排序
- ✅ 免費層 20 張聯絡人上限
- ✅ 個資最小化: 刪除聯絡人同步清除照片 + 互動 + 回訪 + 同意紀錄
- ✅ Dark mode + RWD (390 / 768 / 1440)
- ✅ 31/31 Vitest 通過

## 故意不做

- ❌ OCR (Tesseract.js): SPEC §1.5 Non-Goals 明確排除 OCR 主功能
- ❌ 雲端同步 / Supabase: SPEC §3.1 FR-008 本地模式優先
- ❌ 註冊 / 登入: v3.0 仍是 local-only pilot
- ❌ Stripe 訂閱: SPEC §15.13 MV-02 待 30 天 pilot 驗證
- ❌ 原生 App / iOS: SPEC §1.5 Non-Goals, MVP 階段以 PWA 為主

## v2 規劃 (SPEC §3.2 P1, 待 §15.13 市場驗證通過)

- SHOULD-01 中英文 OCR (只在 3 位以上 pilot 要求時啟動)
- SHOULD-02 Google Calendar 單向提醒
- SHOULD-03 一個 CRM CSV connector
- SHOULD-04 團隊共享回訪 queue
- SHOULD-05 名片交換活動批次整理
- SHOULD-06 付費訂閱與資料加密同步

## 技術債 / 已知限制

- ESLint 規則 `react-hooks/set-state-in-effect` 在 hydration effect 上 warning(已加 disable comment)
- Vitest typecheck 與 tsc 分開跑(`tsc --noEmit` 不含 test 檔)
- localStorage 容量約 5–10MB,pilot 階段 20 張聯絡人足夠;若日後擴到 200 張以上應改 IndexedDB

## 驗證 SOP

```bash
npm run typecheck  # tsc --noEmit (src/ 不含 test)
npm run test       # vitest 31 條
npm run build      # next build 靜態匯出
npx eslint .       # ESLint
```

build exit 0 + 3 static pages = 通過。