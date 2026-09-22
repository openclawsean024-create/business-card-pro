# 名片王 Pro｜UI-SPEC v1.0

> 目的：把 PRD v3.0 的核心 job 從「管理名片」收斂成「今天完成下一步，讓關係不掉線」。
> 本文件只定義 UI/互動方向；prototype 先獨立於正式 React app，確認後才進入實作。

## 1. 設計判斷

### 1.1 產品主張

名片王不是名片資料庫，也不是 CRM pipeline。主畫面只回答一件事：

> 我今天要回訪誰？下一步是什麼？完成後怎麼留下可追蹤紀錄？

### 1.2 主要使用者

- 台灣 B2B 業務、房仲、保險、顧問等個人工作者。
- 每月交換約 20–100 張名片，沒有 Salesforce，也不想維護複雜 CRM。
- 在會後 1–14 天內需要記得「答應了什麼」並完成一次低摩擦回訪。

### 1.3 UI 優先順序

1. 今日/逾期 queue 與一鍵完成。
2. 交換後的下一步、日期、情境與備註可快速回看。
3. 互動時間線讓使用者知道關係是否有前進。
4. 聯絡人可搜尋、可匯出、可刪除；資料不被產品鎖住。
5. local-only 與 20 張 pilot 限額明確但不打斷首次核心 job。

## 2. 資訊架構

### 導覽

- 今日：預設入口；顯示逾期、今天、即將到期的回訪任務。
- 聯絡人：搜尋、標籤、公司與最近互動；支援快速開啟詳細資料。
- 互動時間線：按日期回看見面、通話、筆記與已完成回訪。
- 設定：local-only 說明、vCard/CSV/ICS 匯出、資料刪除與容量狀態。

### 今日頁面區塊

1. Page header：日期、清楚的成果導向標題、搜尋與「新增聯絡人」。
2. Progress strip：本日完成數、剩餘回訪、14 天完成率；只放能幫助決策的數字。
3. Follow-up queue：依 overdue → today → upcoming 排序，每列顯示人、公司、下一步、交換情境、日期。
4. Weekly pulse：過去/未來 7 天完成節奏，讓使用者看出自己是否正在建立習慣。
5. Recent activity：最近互動，提供可追查證據，不做虛假的 AI 分數。

## 3. 視覺系統

- Tone：安靜、可信、帶一點工作台感；避免「AI 魔法」與過度 SaaS dashboard。
- Canvas：暖灰白背景 `#F6F7F5`；表面使用純白；主要文字深墨藍 `#182230`。
- Primary：靛藍 `#3F5BF6`，只用在主要行動、選取狀態與進度。
- Signal：逾期使用珊瑚紅、今天使用琥珀、完成使用青綠；顏色一定搭配文字。
- Typography：Inter + Noto Sans TC；標題 32/40，section 18/26，body 14/22，輔助字不低於 12px。
- Geometry：8px spacing base；主要表面 20px radius；queue row 16px radius；細邊框 `#E5E8EC`。
- Motion：完成任務時 row 收合 + toast；尊重 `prefers-reduced-motion`。

## 4. 核心互動

### 4.1 完成回訪

- 直接點 row 的「完成」開啟小型 completion sheet，而不是立即刪除任務。
- sheet 要求可選備註，預填「已完成下一步」；送出後寫入 interaction timestamp 與 note。
- 完成後保留在「最近互動」，讓使用者能查回；queue 數字同步更新。

### 4.2 新增聯絡人

- 先顯示姓名、公司、手機/Email、交換來源、交換情境、下一步、日期。
- 姓名或公司至少一項；下一步與日期是主流程欄位。
- 名片照片是 optional attachment；不在 prototype 假裝 OCR 已存在。
- 儲存後直接把新任務放入 queue，避免使用者再找一次。

### 4.3 搜尋與詳細資料

- 搜尋姓名、公司、標籤、備註與最近互動。
- 點選 queue row 或聯絡人 row 開右側 detail drawer；不跳離工作上下文。

### 4.4 匯出與隱私

- 設定頁以「資料可帶走」呈現 vCard、CSV、ICS；不使用威脅式 copy。
- local-only 狀態固定放在 sidebar footer 與設定頁，文字為「只存在這台瀏覽器，不上傳伺服器」。
- 20 張上限顯示為容量進度，不在首次新增前做 paywall。

## 5. 狀態與驗收

### 必須具備

- [ ] 390px、768px、1440px 皆能完成「看 queue → 完成回訪」。
- [ ] 首屏 5 秒內能說出今日最重要的下一步。
- [ ] 每一列的狀態不只靠顏色：有「逾期」「今天」「即將到期」「已完成」文字。
- [ ] 完成回訪後，任務不被刪除，會進入活動紀錄並保留 timestamp/note。
- [ ] 新增聯絡人後自動出現在 queue；未填姓名與公司時有 inline error。
- [ ] 搜尋輸入支援鍵盤焦點；按 Escape 可關閉 modal/drawer。
- [ ] 所有資料、匯出與刪除能力符合 SPEC §3.1 FR-004、FR-008、FR-009。

### 明確不做

- 不加入 OCR 主入口、全球名片資料庫、CRM pipeline、登入/註冊、雲端同步。
- 不用 KPI、AI 分數或空泛活動圖表填滿畫面。
- 不把 pilot 的 20 張限制做成阻擋核心 job 的付費牆。

## 6. Prototype scope

`public/ui-prototype.html` 只模擬可評審的前台狀態：

- 今日 dashboard（含真實感 seed data）。
- 完成回訪 sheet、完成後 queue/活動更新、toast。
- 新增聯絡人 modal、基本驗證與 queue 插入。
- 導覽 tab、搜尋過濾、深色模式、responsive mobile nav。

正式 React 實作時，狀態與資料欄位必須沿用 `src/lib/types.ts`、`src/lib/store.ts` 與既有 `STORAGE_KEY`，不得以 prototype 的 seed data 取代 localStorage。
