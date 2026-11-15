#!/usr/bin/env node
// GOAL.md M1 AC-003：合成假名片測試集產生器
//
//   node scripts/gen-ocr-fixtures.mjs            # 只重產文字層（text-cases.json）
//   node scripts/gen-ocr-fixtures.mjs --images   # 文字層 + 影像層（需要字型檔）
//   node scripts/gen-ocr-fixtures.mjs --images --font "/path/to/font.ttf"
//   node scripts/gen-ocr-fixtures.mjs --seed 7 --out /tmp/holdout   # 另一組文字層（檢查 parser 是否過度貼合）
//
// 規則（AGENTS.md §4.1）：全部是合成假資料，禁止任何真實名片。
//   - 姓名：「測試」／「Test」前綴
//   - 電話：只用 0900-000-001～0900-000-099、02-0000-0001～02-0000-0099
//   - Email：只用 @example.com
//   - 公司：含「範例」或「Example」
// 產生結果完全由固定種子決定，重跑會得到相同的 text-cases.json。
// 影像另外取決於字型檔；產生時使用的字型記錄在 images/README.md。

import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
const DEFAULT_SEED = 20261116;
const SEED = Number(argOf("--seed") ?? DEFAULT_SEED);
const OUT_DIR = argOf("--out") ?? join(ROOT, "src/test/fixtures/ocr");
const IMAGE_DIR = join(OUT_DIR, "images");
const PER_CATEGORY = 14;
const IMAGES_PER_TEMPLATE = 11;
const DEFAULT_FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf";

// ── 固定種子亂數 ─────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 假資料池 ─────────────────────────────────────────────────────────────
const ZH_SURNAMES = ["王", "林", "陳", "張", "李", "黃", "吳", "劉", "蔡", "楊", "許", "鄭", "謝", "郭", "洪", "曾"];
const ZH_GIVEN = ["小明", "大華", "怡君", "志明", "淑芬", "家豪", "雅婷", "建宏", "美玲", "俊傑", "佩珊", "冠宇", "欣怡", "柏翰", "宜蓁", "承恩"];
const EN_FIRST = ["Alex", "Bella", "Chris", "Dana", "Eric", "Fiona", "Gary", "Helen", "Ivan", "Judy", "Kevin", "Lily", "Mark", "Nina", "Oscar", "Penny"];
const EN_LAST = ["Chen", "Lin", "Wang", "Wu", "Huang", "Tsai", "Liu", "Yang", "Hsu", "Cheng", "Lee", "Chang", "Kuo", "Hung", "Tseng", "Lai"];
const ZH_COMPANIES = [
  "範例科技股份有限公司",
  "範例國際貿易有限公司",
  "範例設計工作室",
  "範例管理顧問有限公司",
  "範例生技股份有限公司",
  "範例資訊有限公司",
  "範例建設股份有限公司",
  "範例行銷企業社",
  "範例餐飲集團",
  "範例聯合會計師事務所",
  "範例精密工業股份有限公司",
  "範例數位媒體有限公司",
  "範例咖啡",
  "範例文創",
  "範例好物",
  "範例物流股份有限公司",
];
const EN_COMPANIES = [
  "Example Technology Co., Ltd.",
  "Example Trading Inc.",
  "Example Design Studio",
  "Example Consulting Group",
  "Example Biotech Corp.",
  "Example Software LLC",
  "Example Construction Co., Ltd.",
  "Example Marketing Agency",
  "Example Foods Group",
  "Example Partners",
  "Example Precision Industries Co., Ltd.",
  "Example Digital Media Ltd.",
  "Example Coffee",
  "Example Creative",
  "Example Works",
  "Example Logistics Corp.",
];
const ZH_TITLES = ["業務經理", "資深工程師", "行銷總監", "專案經理", "業務專員", "總經理", "設計師", "顧問", "產品經理", "客戶經理", "財務長", "執行長", "業務副理", "技術長", "人資主任", "採購專員"];
const EN_TITLES = ["Sales Manager", "Senior Engineer", "Marketing Director", "Project Manager", "Account Executive", "General Manager", "Product Designer", "Consultant", "Product Manager", "Account Manager", "CFO", "CEO", "Assistant Sales Manager", "CTO", "HR Supervisor", "Procurement Specialist"];
const ZH_DEPTS = ["業務部", "研發處", "行銷部", "專案管理中心"];

const pad = (n, w) => String(n).padStart(w, "0");
const mobileOf = (n) => `0900-000-${pad(n, 3)}`;
const telOf = (n) => `02-0000-${pad(n, 4)}`;

/** 第 i 張假名片的完整資料（i 從 0 起算，最多 99 張以符合電話號段） */
function makeCard(i, rand) {
  const n = (i % 99) + 1;
  const pick = (arr, salt) => arr[(i * 7 + salt) % arr.length];
  const first = pick(EN_FIRST, 3);
  const last = pick(EN_LAST, 5);
  const emailStyles = [
    `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    `test${pad(n, 2)}@example.com`,
    `${first.toLowerCase()}@example.com`,
    `sales${pad(n, 2)}@example.com`,
    `${first.toLowerCase()}_${last.toLowerCase()}@example.com`,
  ];
  return {
    n,
    nameZh: `測試 ${pick(ZH_SURNAMES, 1)}${pick(ZH_GIVEN, 2)}`,
    nameEn: `Test ${first} ${last}`,
    companyZh: pick(ZH_COMPANIES, 4),
    companyEn: pick(EN_COMPANIES, 4),
    titleZh: pick(ZH_TITLES, 6),
    titleEn: pick(EN_TITLES, 6),
    dept: pick(ZH_DEPTS, 0),
    mobile: mobileOf(n),
    tel: telOf(n),
    fax: telOf(((n + 49) % 99) + 1),
    email: emailStyles[Math.floor(rand() * emailStyles.length)],
    addressZh: `100 台北市範例區測試路 ${n} 號 ${(n % 9) + 1} 樓`,
    addressEn: `${(n % 9) + 1}F, No. ${n}, Example Rd., Sample City`,
    website: "www.example.com",
  };
}

const spaced = (s) => [...s.replace(/\s+/g, "")].join(" ");
const truthOf = (o) => ({ name: o.name ?? null, company: o.company ?? null, title: o.title ?? null, phone: o.phone ?? null, email: o.email ?? null });

// ── 版型（文字層）─────────────────────────────────────────────────────────
// 每個版型回傳 { lines, truth }。truth 的取捨規則與 parser 一致：
//   電話＝手機優先、其次市話、不取傳真；中英並列時姓名／公司／職稱取中文。

const ZH_HORIZONTAL = [
  (c) => ({
    lines: [c.companyZh, "", `${c.nameZh}  ${c.titleZh}`, "", `電話：${c.tel}`, `手機：${c.mobile}`, `Email：${c.email}`, `地址：${c.addressZh}`],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.nameZh, c.titleZh, c.companyZh, `T ${c.tel}`, `M ${c.mobile}`, `E ${c.email}`, c.addressZh],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.companyZh, c.dept, `${c.titleZh} ${c.nameZh}`, `TEL: ${c.tel}`, `FAX: ${c.fax}`, `E-mail: ${c.email}`, c.website],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.tel, email: c.email }),
  }),
  (c) => ({
    lines: [c.companyZh, `${c.nameZh} ${c.titleZh}`, `TEL: ${c.tel}  FAX: ${c.fax}`, `行動電話: ${c.mobile}`, `E-mail: ${c.email}`, "統編：00000000", c.website],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.nameZh, `${c.dept} ${c.titleZh}`, c.companyZh, c.addressZh, `電話 ${c.tel} #${(c.n % 89) + 10}`, `傳真 ${c.fax}`, `信箱 ${c.email}`],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: `${c.dept} ${c.titleZh}`, phone: `${c.tel} #${(c.n % 89) + 10}`, email: c.email }),
  }),
  (c) => ({
    lines: [c.titleZh, c.nameZh, "", c.companyZh, c.addressZh, c.mobile, c.email],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
];

const ZH_VERTICAL = [
  // 每一行是一個直欄，字與字之間被辨識出空白
  (c) => ({
    lines: [spaced(c.companyZh), spaced(c.titleZh), spaced(c.nameZh), `電 話 ${c.tel}`, `手 機 ${c.mobile}`, c.email, spaced(c.addressZh)],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  // 姓名被逐字辨識成一字一行
  (c) => ({
    lines: [spaced(c.companyZh), "", ...c.nameZh.replace(/\s+/g, ""), "", spaced(c.titleZh), "", `電話 ${c.tel}`, `手機 ${c.mobile}`, c.email],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  // 職稱與姓名在同一直欄，中間有較大的間隔
  (c) => ({
    lines: [`${spaced(c.titleZh)}   ${spaced(c.nameZh)}`, spaced(c.companyZh), `電話 ${c.tel}`, `傳真 ${c.fax}`, `電子郵件 ${c.email}`, spaced(c.addressZh)],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.tel, email: c.email }),
  }),
  // 由左欄讀起：聯絡資訊在前、公司在最後
  (c) => ({
    lines: [`手機 ${c.mobile}`, `電話 ${c.tel}`, c.email, spaced(c.addressZh), spaced(c.nameZh), spaced(c.titleZh), spaced(c.companyZh)],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  // 職稱與姓名在同一直欄且沒有間隔
  (c) => ({
    lines: [spaced(c.companyZh), spaced(`${c.titleZh}${c.nameZh}`), `行動 ${c.mobile}`, `信箱 ${c.email}`, spaced(c.addressZh)],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  // 姓名用全形空白拉開字距
  (c) => ({
    lines: [spaced(c.companyZh), spaced(c.dept), [...c.nameZh.replace(/\s+/g, "")].join("　"), spaced(c.titleZh), `電話 ${c.tel}`, c.email],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.tel, email: c.email }),
  }),
];

const MIXED = [
  (c) => ({
    lines: [c.companyZh, c.companyEn, "", `${c.nameZh}  ${c.nameEn}`, `${c.titleZh} ${c.titleEn}`, `Tel: ${c.tel}`, `Mobile: ${c.mobile}`, `Email: ${c.email}`],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.nameZh, c.nameEn, c.titleZh, c.titleEn, c.companyZh, c.companyEn, `T: ${c.tel} | M: ${c.mobile}`, c.email, c.website],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.companyEn, c.companyZh, `${c.nameZh} ${c.titleZh}`, `${c.nameEn} | ${c.titleEn}`, `電話 Tel ${c.tel}`, `傳真 Fax ${c.fax}`, `E-mail ${c.email}`, c.addressZh, c.addressEn],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.tel, email: c.email }),
  }),
  // 中文姓名、只有英文公司名
  (c) => ({
    lines: [c.companyEn, c.nameZh, c.titleZh, `M ${c.mobile}`, `T ${c.tel}`, c.email, c.addressEn],
    truth: truthOf({ name: c.nameZh, company: c.companyEn, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [`${c.nameZh} ${c.nameEn}`, c.titleZh, c.companyZh, c.tel, c.mobile, c.email],
    truth: truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
  }),
  // 英文姓名與職稱、中文公司名
  (c) => ({
    lines: [c.companyZh, c.nameEn, c.titleEn, `Phone: ${c.tel}`, `Email: ${c.email}`, c.addressZh],
    truth: truthOf({ name: c.nameEn, company: c.companyZh, title: c.titleEn, phone: c.tel, email: c.email }),
  }),
];

const ENGLISH = [
  (c) => ({
    lines: [c.companyEn, "", c.nameEn, c.titleEn, "", `T: ${c.tel}`, `M: ${c.mobile}`, `E: ${c.email}`, c.addressEn, c.website],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.nameEn, `${c.titleEn}, ${c.companyEn}`, c.addressEn, `Tel ${c.tel}`, `Fax ${c.fax}`, c.email],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.tel, email: c.email }),
  }),
  (c) => ({
    lines: [`${c.nameEn} | ${c.titleEn}`, c.companyEn, `Phone ${c.tel}`, `Cell ${c.mobile}`, `Email ${c.email}`, c.website],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.companyEn, c.nameEn, c.titleEn, c.mobile, c.email],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.mobile, email: c.email }),
  }),
  (c) => ({
    lines: [c.nameEn, c.titleEn, c.companyEn, `Tel ${c.tel} ext. ${(c.n % 89) + 10}`, `E-mail: ${c.email}`, c.addressEn],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: `${c.tel} ext. ${(c.n % 89) + 10}`, email: c.email }),
  }),
  (c) => ({
    lines: [`${c.nameEn} ${c.titleEn}`, c.companyEn, `Office: ${c.tel}`, `Mobile: ${c.mobile}`, c.email, c.website],
    truth: truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.mobile, email: c.email }),
  }),
];

// ── 雜訊（多餘空白、全形數字、斷行錯位）────────────────────────────────────
const toFullWidth = (s, rand, alsoPunct) =>
  [...s]
    .map((ch) => {
      if (/[0-9]/.test(ch)) return String.fromCodePoint(ch.codePointAt(0) + 0xfee0);
      if (alsoPunct && /[-@.:#]/.test(ch) && rand() < 0.6) return String.fromCodePoint(ch.codePointAt(0) + 0xfee0);
      return ch;
    })
    .join("");

function noiseExtraSpaces(lines, rand) {
  return lines.map((line) => {
    if (!line) return line;
    let out = line;
    // 欄位之間與標籤後面被拉寬
    out = out.replace(/([:：])\s*/g, (m, p) => `${p}${" ".repeat(1 + Math.floor(rand() * 3))}`);
    // 號碼的連字號兩側多出空白
    if (rand() < 0.35) out = out.replace(/(\d)-(\d)/g, "$1 - $2");
    // Email 的 @ 兩側多出空白
    if (rand() < 0.3) out = out.replace("@", " @ ");
    // 字詞之間的空白被拉寬（含欄位內部）
    out = out.replace(/ /g, () => (rand() < 0.3 ? "  " : " "));
    // 行首行尾多出空白
    return `${" ".repeat(Math.floor(rand() * 4))}${out}${" ".repeat(Math.floor(rand() * 3))}`;
  });
}

function noiseFullWidth(lines, rand) {
  const punct = rand() < 0.5;
  return lines.map((line) => (/\d{2,}|@/.test(line) && rand() < 0.8 ? toFullWidth(line, rand, punct) : line));
}

function noiseLineBreaks(lines, rand) {
  let out = lines.filter((l) => l !== "");
  const ops = 1 + Math.floor(rand() * 2);
  for (let k = 0; k < ops; k++) {
    const kind = Math.floor(rand() * 5);
    if (kind === 0) {
      // 相鄰兩行被併成一行
      const i = Math.floor(rand() * (out.length - 1));
      out = [...out.slice(0, i), `${out[i]} ${out[i + 1]}`, ...out.slice(i + 2)];
    } else if (kind === 1) {
      // 標籤與內容被斷成兩行
      const i = out.findIndex((l) => /^(電話|手機|行動電話|傳真|信箱|Tel|TEL|Mobile|Email|E-mail|Phone|Fax)\s*[:：]?\s+\S/.test(l));
      if (i >= 0) {
        const m = out[i].match(/^(\S+?[:：]?)\s+(.*)$/);
        if (m) out = [...out.slice(0, i), m[1], m[2], ...out.slice(i + 1)];
      }
    } else if (kind === 2) {
      // 公司名在尾綴前被斷行
      const i = out.findIndex((l) => /(股份有限公司|有限公司| Co\., Ltd\.| Inc\.| Corp\.| LLC)$/.test(l) && !/[@\d]/.test(l));
      if (i >= 0) {
        const m = out[i].match(/^(.*?)\s?(股份有限公司|有限公司|Co\., Ltd\.|Inc\.|Corp\.|LLC)$/);
        if (m && m[1]) out = [...out.slice(0, i), m[1], m[2], ...out.slice(i + 1)];
      }
    } else if (kind === 3) {
      // Email 在網域中間被斷行
      const i = out.findIndex((l) => l.includes("@example.com"));
      if (i >= 0) {
        const at = out[i].indexOf("@");
        const cut = at + 2 + Math.floor(rand() * 8);
        out = [...out.slice(0, i), out[i].slice(0, cut), out[i].slice(cut), ...out.slice(i + 1)];
      }
    } else {
      // 多出空行
      const i = Math.floor(rand() * out.length);
      out = [...out.slice(0, i), "", ...out.slice(i)];
    }
  }
  return out;
}

function applyNoise(lines, rand) {
  // 每筆至少套兩種雜訊
  const kinds = [noiseExtraSpaces, noiseFullWidth, noiseLineBreaks];
  const skip = Math.floor(rand() * 4); // 3 = 三種都套
  let out = lines;
  kinds.forEach((fn, i) => {
    if (i !== skip) out = fn(out, rand);
  });
  return out;
}

// ── 產生文字層 ───────────────────────────────────────────────────────────
function buildTextCases() {
  const rand = mulberry32(SEED);
  const categories = [
    ["zh-horizontal", ZH_HORIZONTAL],
    ["zh-vertical", ZH_VERTICAL],
    ["mixed", MIXED],
    ["english", ENGLISH],
  ];
  const cases = [];
  let cardIndex = 0;
  for (const [category, templates] of categories) {
    for (let k = 0; k < PER_CATEGORY; k++) {
      const card = makeCard(cardIndex++, rand);
      const { lines, truth } = templates[k % templates.length](card);
      cases.push({ id: `${category}-${pad(k + 1, 2)}`, category, rawText: lines.join("\n"), truth });
    }
  }
  // 雜訊類：輪流取前四類的版型，再套雜訊
  for (let k = 0; k < PER_CATEGORY; k++) {
    const [baseCategory, templates] = categories[k % categories.length];
    const card = makeCard(cardIndex++, rand);
    const { lines, truth } = templates[(k * 5 + 1) % templates.length](card);
    cases.push({
      id: `noisy-${pad(k + 1, 2)}`,
      category: "noisy",
      base: baseCategory,
      rawText: applyNoise(lines, rand).join("\n"),
      truth,
    });
  }
  return cases;
}

// ── 產生影像層 ───────────────────────────────────────────────────────────
// 固定字型、固定三種橫式版型、白底黑字 1050×600。
const W = 1050;
const H = 600;

const IMAGE_TEMPLATES = [
  {
    id: "zh-horizontal",
    truth: (c) => truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
    draw: (c) => [
      { text: c.companyZh, x: 70, y: 110, size: 40 },
      { text: c.nameZh, x: 70, y: 235, size: 54 },
      { text: c.titleZh, x: 70, y: 295, size: 30 },
      { text: `電話：${c.tel}`, x: 70, y: 400, size: 30 },
      { text: `手機：${c.mobile}`, x: 70, y: 448, size: 30 },
      { text: `Email：${c.email}`, x: 70, y: 496, size: 30 },
      { text: c.addressZh, x: 70, y: 544, size: 26 },
    ],
  },
  {
    id: "mixed",
    truth: (c) => truthOf({ name: c.nameZh, company: c.companyZh, title: c.titleZh, phone: c.mobile, email: c.email }),
    draw: (c) => [
      { text: c.companyZh, x: 70, y: 100, size: 38 },
      { text: c.companyEn, x: 70, y: 146, size: 26 },
      { text: c.nameZh, x: 70, y: 250, size: 50 },
      { text: c.nameEn, x: 70, y: 300, size: 30 },
      { text: c.titleZh, x: 600, y: 250, size: 32 },
      { text: c.titleEn, x: 600, y: 300, size: 26 },
      { text: `Tel: ${c.tel}`, x: 70, y: 420, size: 30 },
      { text: `Mobile: ${c.mobile}`, x: 70, y: 468, size: 30 },
      { text: `Email: ${c.email}`, x: 70, y: 516, size: 30 },
    ],
  },
  {
    id: "english",
    truth: (c) => truthOf({ name: c.nameEn, company: c.companyEn, title: c.titleEn, phone: c.mobile, email: c.email }),
    draw: (c) => [
      { text: c.nameEn, x: 70, y: 130, size: 54 },
      { text: c.titleEn, x: 70, y: 185, size: 30 },
      { text: c.companyEn, x: 70, y: 290, size: 38 },
      { text: `T: ${c.tel}`, x: 70, y: 400, size: 30 },
      { text: `M: ${c.mobile}`, x: 70, y: 448, size: 30 },
      { text: `E: ${c.email}`, x: 70, y: 496, size: 30 },
      { text: c.addressEn, x: 70, y: 544, size: 26 },
    ],
  },
];

async function buildImages(fontPath) {
  if (!existsSync(fontPath)) {
    console.error(`找不到字型檔：${fontPath}\n請用 --font 指定一個同時含繁體中文與英數的 TTF/OTF。`);
    process.exit(1);
  }
  const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
  GlobalFonts.registerFromPath(fontPath, "CardFixture");
  mkdirSync(IMAGE_DIR, { recursive: true });
  for (const f of readdirSync(IMAGE_DIR)) {
    if (/^card-\d+\.(png|json)$/.test(f)) rmSync(join(IMAGE_DIR, f));
  }
  const rand = mulberry32(SEED + 1);
  let index = 0;
  for (const template of IMAGE_TEMPLATES) {
    for (let k = 0; k < IMAGES_PER_TEMPLATE; k++) {
      // 與文字層用不同的卡片序號（從 40 起），避免兩層資料完全重複
      const card = makeCard(40 + index, rand);
      index += 1;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#111111";
      ctx.textBaseline = "alphabetic";
      const lines = template.draw(card);
      for (const l of lines) {
        ctx.font = `${l.size}px CardFixture`;
        ctx.fillText(l.text, l.x, l.y);
      }
      const id = `card-${pad(index, 2)}`;
      writeFileSync(join(IMAGE_DIR, `${id}.png`), canvas.toBuffer("image/png"));
      writeFileSync(
        join(IMAGE_DIR, `${id}.json`),
        `${JSON.stringify({ id, template: template.id, image: `${id}.png`, synthetic: true, printed: lines.map((l) => l.text), truth: template.truth(card) }, null, 2)}\n`,
      );
    }
  }
  writeFileSync(
    join(IMAGE_DIR, "README.md"),
    [
      "# 合成名片影像（OCR 影像層測試集）",
      "",
      "全部由 `scripts/gen-ocr-fixtures.mjs --images` 產生，**不含任何真實名片或真實個資**。",
      "",
      `- 張數：${index}（${IMAGE_TEMPLATES.map((t) => `${t.id} ${IMAGES_PER_TEMPLATE}`).join("、")}）`,
      `- 畫布：${W}×${H}，白底黑字，三種固定橫式版型`,
      `- 字型：${fontPath.split("/").pop()}（產生時的系統字型；字型檔不提交進 repo）`,
      `- 種子：${SEED + 1}`,
      "- 每張 `card-NN.png` 附同名 `card-NN.json`（印在卡片上的文字與 ground truth）",
      "",
      "重新產生：`npm run gen:ocr-fixtures -- --images`（換字型或版型後，影像層評估結果需重跑並更新 STATUS.md）。",
      "",
    ].join("\n"),
  );
  return index;
}

// ── main ────────────────────────────────────────────────────────────────
const args = argv;
if (args.includes("--images") && (SEED !== DEFAULT_SEED || argOf("--out"))) {
  console.error("--images 只能用預設種子與預設輸出位置（提交進 repo 的影像層必須可重現）。");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
const cases = buildTextCases();
writeFileSync(join(OUT_DIR, "text-cases.json"), `${JSON.stringify({ seed: SEED, synthetic: true, cases }, null, 2)}\n`);
const perCategory = {};
for (const c of cases) perCategory[c.category] = (perCategory[c.category] ?? 0) + 1;
console.log(`文字層：${cases.length} 筆`, perCategory);

if (args.includes("--images")) {
  const fontPath = argOf("--font") ?? DEFAULT_FONT;
  const count = await buildImages(fontPath);
  console.log(`影像層：${count} 張 → ${IMAGE_DIR}`);
}
