// GOAL.md M1 AC-001 / AC-003：名片 OCR 文字 → 聯絡人欄位（純函式）
//
// 來源：business-card-manager `dashboard/card-list.tsx` 的 parseCardHeuristic
// （email／電話／姓名／公司／職稱 regex）。搬入時改寫為：
//   - 純函式，不碰 DOM、store 或網路；
//   - 每欄輸出信心值與低信心清單（對應 ContactPayload.ocrConfidence／ocrLowConfidenceFields）；
//   - 處理直式（逐字空白、逐字斷行）、中英混排、全形字元與斷行錯位。
// 這只是啟發式預覽，結果一律需要使用者確認，不可直接存檔（AGENTS.md 規則 5）。
//
// 單一欄位的取捨（資料模型每欄只有一個值）：
//   - 電話：手機優先，其次市話；傳真不取。
//   - 姓名／公司／職稱：同時有中文與英文時取中文。

import { toHalfWidth } from "./normalize";
import {
  LOW_CONFIDENCE_THRESHOLD,
  OCR_FIELDS,
  type OcrFieldKey,
  type OcrLine,
  type ParsedCard,
} from "./types";

export interface ParseCardOptions {
  /** engine 提供的逐行信心（0–1）；有提供時欄位信心不會高於所在行的信心 */
  lines?: OcrLine[];
  lowConfidenceThreshold?: number;
}

const CJK = "\\u3400-\\u9fff\\uf900-\\ufaff";
const HAS_CJK = new RegExp(`[${CJK}]`);
const SINGLE_CJK = new RegExp(`^[${CJK}]$`);
const CJK_WITH_SPACES = new RegExp(`^[${CJK}]+(?: [${CJK}]+)*$`);

// ── 關鍵字 ────────────────────────────────────────────────────────────────

const TITLE_CORE_ZH =
  "副董事長|董事長|副總經理|總經理|執行長|營運長|技術長|財務長|行銷長|資訊長|副總裁|總裁|副總監|總監|" +
  "協理|副理|襄理|經理|主任|主管|處長|部長|課長|組長|店長|站長|廠長|所長|院長|校長|" +
  "工程師|設計師|建築師|會計師|攝影師|規劃師|分析師|管理師|律師|醫師|藥師|講師|教授|老師|" +
  "顧問|專員|特別助理|助理|特助|秘書|業務代表|代表|企劃|編輯|記者|共同創辦人|創辦人|負責人|合夥人|" +
  "研究員|業務員|營業員|經紀人|理事長|理事|監事|幹事|督導|董事|業務";
const TITLE_MOD_ZH =
  "資深|高級|首席|副|助理|業務|行銷|專案|產品|技術|研發|客戶|執行|營運|財務|人資|人力資源|品牌|設計|" +
  "軟體|硬體|系統|採購|法務|公關|通路|企劃|管理|創意|藝術|工程|品管|生產|客服|總|區域|海外|國際";
const TITLE_ZH = new RegExp(TITLE_CORE_ZH);
const ZH_TITLE_MOD_ONLY = new RegExp(`^(?:${TITLE_MOD_ZH})+$`);
const ZH_TITLE_HEAD = new RegExp(`^(?:${TITLE_MOD_ZH})*(?:${TITLE_CORE_ZH})`);
const TITLE_EN =
  /\b(Manager|Engineer|Director|Designer|Architect|Developer|Consultant|Specialist|Representative|Analyst|Officer|Executive|Founder|Co-?Founder|President|Chairman|Partner|Associate|Advisor|Coordinator|Supervisor|Assistant|Lead|Head|Strategist|Planner|Editor|Accountant|Lawyer|Attorney|Professor|Lecturer|Researcher|Scientist|Administrator|Agent|Owner|Principal|CEO|CTO|CMO|COO|CFO|CIO|CPO|VP|SVP|EVP|GM)\b/;
const TITLE_MOD_EN =
  /^(Senior|Junior|Sr\.?|Jr\.?|Chief|Vice|General|Regional|Global|Managing|Executive|Technical|Sales|Marketing|Product|Project|Program|Account|Business|Development|Software|Hardware|Operations|Customer|Success|Creative|Art|Design|Brand|Finance|Financial|HR|Human|Resources|Talent|Staff|Principal|Lead|Head|Assistant|Associate|Deputy|Co-?Founder|Founder|Procurement|Purchasing|Research|Quality|Supply|Chain|Legal|Digital|Content|Data|Cloud|Security|Network|Systems|Support|Service|Engineering|Strategy|Investment|Country|Area|Store|Office|Public|Relations|Training|Logistics|Production|Manufacturing|Planning|Corporate|Communications|International|Export|Import|Key|of|and|&)$/i;

const COMPANY_STRONG_ZH_SRC =
  "股份有限公司|有限公司|分公司|總公司|公司|事務所|工作室|基金會|協會|學會|銀行|集團|企業社|商行|診所|醫院|大學|工廠|合作社|出版社|旅行社";
const COMPANY_STRONG_ZH = new RegExp(COMPANY_STRONG_ZH_SRC);
const COMPANY_STRONG_EN =
  /\b(Co\.?,?\s*Ltd\.?|Ltd\.?|Limited|Inc\.?|Incorporated|Corp\.?|Corporation|LLC|PLC|GmbH|Company|Group|Studios?|Labs?|Partners|Associates|Holdings|Bank|University|Foundation|Institute|Agency|Ventures|Enterprises?)(?=$|[\s,.)])/i;
const COMPANY_WEAK_ZH =
  /(科技|實業|國際|企業|資訊|行銷|貿易|建設|工業|生技|餐飲|咖啡|文創|媒體|電子|精密|物流|設計|開發|光電|金控|證券|保險|地產|不動產|廣告|影像|數位|軟體|網路|電商|食品|餐廳|書店|藥局|顧問)/;
const COMPANY_WEAK_EN =
  /\b(Technology|Technologies|Tech|Consulting|Design|Trading|Solutions|Systems|Software|International|Global|Media|Digital|Coffee|Capital|Industries|Logistics|Services|Marketing|Biotech|Creative|Foods?|Realty|Insurance|Electronics)\b/i;
/** 斷行後只剩公司尾綴的行，例如「有限公司」「Co., Ltd.」 */
const COMPANY_SUFFIX_ONLY = new RegExp(
  `^(?:${COMPANY_STRONG_ZH_SRC}|股份有限|有限|限公司|份有限公司|Co\\.?,?\\s*Ltd\\.?|Ltd\\.?|Inc\\.?|Corp\\.?|LLC)$`,
  "i",
);

const DEPT_ZH = /(部|處|課|組|室|中心|事業群|事業部|部門)$/;
const ADDRESS =
  new RegExp(
    `\\d\\s*(?:號|樓|巷|弄|F\\b)|[市縣][${CJK}]{1,4}[區鄉鎮市]|(?:路|街|大道)[一二三四五六七八九十\\d]*段|` +
      `\\b(?:Rd\\.?|Road|St\\.?|Street|Ave\\.?|Avenue|Blvd\\.?|Sec\\.|Dist\\.|Floor|City|Taiwan|Taipei)(?=$|[\\s,.])|\\bNo\\.\\s*\\d`,
    "i",
  );
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|tw|co)(?:\.[a-z]{2})?\b(?!@)/i;

const LABEL_MOBILE = /(行動電話|手機|行動|Mobile|Cell(?:phone)?|(?:^|[\s|/])M\s*[:：.)])\s*[:：.]?\s*$/i;
const LABEL_FAX = /(傳真|Fax|(?:^|[\s|/])F\s*[:：.)])\s*[:：.]?\s*$/i;
const LABEL_TEL =
  /(公司電話|電話|市話|專線|Telephone|Tel|Phone|Office|Direct|(?:^|[\s|/])[TPO]\s*[:：.)])\s*[:：.]?\s*$/i;
const LABEL_NOT_PHONE = /(統一編號|統編|郵遞區號|Tax\s*ID|VAT|LINE\s*ID|LINE)\s*[:：.]?\s*$/i;
const LABEL_ONLY =
  /^(行動電話|公司電話|電話|手機|行動|傳真|信箱|電子郵件|電子信箱|電郵|地址|網址|網站|Telephone|Tel|Phone|Mobile|Cell|Fax|E-?mail|Address|Add|Web|Website|[TMFEPOAW])\s*[:：.]?$/i;
const EMAIL_LABEL = /^(?:E-?mail|電子郵件|電子信箱|信箱|電郵|Mail|E)\s*[:：.]?\s*/i;
/** 常見姓氏（單姓），只用來在多個姓名候選之間加分 */
const COMMON_SURNAMES =
  "陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周徐蘇葉莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余盧梁趙顏柯翁魏孫戴范方宋鄧杜傅侯曹薛丁卓馬阮董唐溫藍蔣石古紀姚連馮歐程湯田康姜白汪鄒尤巫鐘黎涂龔嚴韓袁金童陸夏柳凃邵錢伍倪溫于譚駱熊任甘秦顧毛章史官萬俞雷粘饒張闕凌崔尹孔辛武辜陶段龍韋葛池孟褚殷麥賀賈莫文管關向包丘梅";
const NON_NAME_WORDS = /^(名片|電話|地址|傳真|手機|信箱|網址|統編|業務項目|服務項目|營業項目)$/;

// ── 前處理 ────────────────────────────────────────────────────────────────

/** 「測 試 王 小 明」→「測試王小明」：只合併相鄰的單一中文字（OCR 與直式名片常見） */
function joinSpacedCjk(line: string): string {
  // 以空白切開並保留空白長度；相鄰兩個「單一中文字」之間的 1–2 個空白視為字距而移除，
  // 3 個以上的空白視為欄位間隔而保留。
  const parts = line.split(/( +)/);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i] ?? "";
    if (i % 2 === 1) {
      const prev = parts[i - 1] ?? "";
      const next = parts[i + 1] ?? "";
      if (cur.length <= 2 && SINGLE_CJK.test(prev) && SINGLE_CJK.test(next)) continue;
    }
    out += cur;
  }
  return out;
}

function stripEmailLabel(line: string): string {
  return line.replace(EMAIL_LABEL, "");
}

const STRICT_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;

/** 把文字整理成行：全形轉半形、合併逐字斷行、接回被斷開的公司尾綴／Email／電話／標籤 */
export function prepareLines(text: string): string[] {
  const raw = toHalfWidth(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\t/g, "  ").trim());

  // 1. 直式名片被逐字辨識成一字一行 → 合併成一行
  const merged: string[] = [];
  let run = "";
  const flush = () => {
    if (run) merged.push(run);
    run = "";
  };
  for (const line of raw) {
    if (SINGLE_CJK.test(line)) {
      run += line;
      continue;
    }
    flush();
    if (line) merged.push(line);
  }
  flush();

  // 2. 逐字空白
  const lines = merged.map(joinSpacedCjk);

  // 3. 斷行錯位
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let cur = lines[i] ?? "";
    let next = lines[i + 1];
    const take = (joiner: string) => {
      cur = `${cur}${joiner}${next ?? ""}`;
      i += 1;
      next = lines[i + 1];
    };

    // 標籤獨立成一行（「電話」＋下一行才是號碼）
    if (next !== undefined && LABEL_ONLY.test(cur) && !LABEL_ONLY.test(next)) take(" ");

    // 公司名被斷在尾綴前後
    if (next !== undefined && HAS_CJK.test(cur) && COMPANY_SUFFIX_ONLY.test(next.replace(/\s+/g, ""))) take("");
    else if (
      next !== undefined &&
      /(?:股份有限|股份|有限|有限公)$/.test(cur) &&
      /^(?:公司|限公司|有限公司|司)/.test(next)
    )
      take("");
    else if (next !== undefined && /[A-Za-z]$/.test(cur) && COMPANY_SUFFIX_ONLY.test(next) && !HAS_CJK.test(next))
      take(" ");

    // Email 被斷成兩行
    if (next !== undefined && cur.includes("@")) {
      const tail = cur.slice(cur.lastIndexOf("@"));
      const complete = /@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(tail);
      const fragment = /^[A-Za-z0-9-]*\.?[A-Za-z0-9.-]*$/.test(next) && !/^www\./i.test(next) && next.length > 0;
      if (fragment && (!complete || /^[a-z]{1,3}$/.test(next))) take("");
    } else if (next !== undefined && !cur.includes("@") && /^[A-Za-z0-9._%+-]*@[A-Za-z0-9-]+\./.test(next)) {
      const body = stripEmailLabel(cur);
      if (/^[a-z0-9._%+-]+$/.test(body) && /[a-z]/.test(body) && !URL.test(body) && (next.startsWith("@") || /[._-]$/.test(body))) {
        take("");
      }
    }

    // 電話被斷成兩行（行尾是數字加連字號，下一行以數字開頭）
    if (next !== undefined && /\d[\s]*[-–—][\s]*$/.test(cur) && /^\d{2,4}(?:\D|$)/.test(next)) take("");

    out.push(cur);
  }
  return out;
}

// ── Email ────────────────────────────────────────────────────────────────

interface Found {
  value: string;
  confidence: number;
  line: number;
}

const EMAIL_LABEL_WORDS = /^(?:e|m|t|f|tel|fax|mail|email|e-mail|mobile|web|www|add|phone)$/i;

function findEmail(lines: string[]): Found | null {
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i] ?? "";
    if (!/[@©®]|\((?:a|at)\)/i.test(original)) continue;
    // 常見的 @ 誤判
    const line = original.replace(/\s*(?:©|®|\((?:a|at)\))\s*(?=[A-Za-z0-9-]+\s*\.)/gi, "@");
    const strict = line.match(STRICT_EMAIL)?.[0] ?? null;

    // 收掉 @ 與網域裡的多餘空白；local part 只在前一段不是標籤時才收
    let compact = line.replace(/\s*@\s*/g, "@");
    compact = compact.replace(/(@[A-Za-z0-9-]+(?:\s*\.\s*[A-Za-z0-9-]+)+)/g, (m) => m.replace(/\s+/g, ""));
    compact = compact.replace(
      /([A-Za-z0-9_%+-]+)\s*\.\s*(?=[A-Za-z0-9._%+-]*@)/g,
      (m, head: string) => (/\s/.test(m) && EMAIL_LABEL_WORDS.test(head) ? m : `${head}.`),
    );
    const relaxed = compact.match(STRICT_EMAIL)?.[0] ?? null;

    const value = relaxed ?? strict;
    if (!value) continue;
    const cleaned = value.replace(/[.,;:]+$/, "");
    const changed = strict !== relaxed || line !== original;
    return { value: cleaned, confidence: changed ? 0.8 : 0.95, line: i };
  }
  return null;
}

// ── 電話 ─────────────────────────────────────────────────────────────────

type PhoneKind = "mobile" | "tel" | "fax" | "other";

interface PhoneCandidate {
  value: string;
  kind: PhoneKind;
  labeled: boolean;
  line: number;
}

function isPhoneDigits(d: string): boolean {
  return /^09\d{8}$/.test(d) || /^0[2-8]\d{7,8}$/.test(d) || /^886\d{8,9}$/.test(d) || /^0800\d{6}$/.test(d);
}

function labelKind(before: string): PhoneKind | null {
  if (LABEL_NOT_PHONE.test(before)) return "other";
  if (LABEL_FAX.test(before)) return "fax";
  if (LABEL_MOBILE.test(before)) return "mobile";
  if (LABEL_TEL.test(before)) return "tel";
  return null;
}

function findPhones(lines: string[]): PhoneCandidate[] {
  const found: PhoneCandidate[] = [];
  const run = /[+(]?\d[\d\s().+–—-]*\d/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.includes("@") && !/\d{2,4}\s*[-–—]\s*\d{3,4}/.test(line)) continue;
    for (const m of line.matchAll(run)) {
      const start = m.index ?? 0;
      const text = m[0];
      // 把連續數字拆成群組，找出第一段符合台灣電話格式的群組組合
      const groups = [...text.matchAll(/\d+/g)].map((g) => ({ s: g.index ?? 0, e: (g.index ?? 0) + g[0].length, d: g[0] }));
      let gi = 0;
      while (gi < groups.length) {
        let matched = -1;
        let digits = "";
        for (let gj = gi; gj < groups.length; gj++) {
          digits += groups[gj]?.d ?? "";
          if (digits.length > 12) break;
          if (isPhoneDigits(digits)) matched = gj;
        }
        if (matched < 0) {
          gi += 1;
          continue;
        }
        const first = groups[gi];
        const last = groups[matched];
        if (!first || !last) break;
        let s = start + first.s;
        let e = start + last.e;
        if (line[s - 1] === "(" || line[s - 1] === "+") s -= 1;
        const ext = line.slice(e).match(/^\s*(?:#|ext\.?|分機|轉)\s*\d{1,5}/i);
        if (ext) e += ext[0].length;
        const before = line.slice(0, s);
        const explicit = labelKind(before);
        const d = digitsOf(line.slice(s, start + last.e));
        const kind: PhoneKind = explicit ?? (/^(?:886)?0?9\d{8}$/.test(d) ? "mobile" : "tel");
        found.push({ value: line.slice(s, e).trim(), kind, labeled: explicit !== null, line: i });
        gi = matched + 1;
      }
    }
  }
  return found;
}

function digitsOf(s: string): string {
  return s.replace(/\D+/g, "");
}

function pickPhone(cands: PhoneCandidate[]): Found | null {
  const usable = cands.filter((c) => c.kind === "mobile" || c.kind === "tel");
  const mobile = usable.find((c) => c.kind === "mobile");
  const pick = mobile ?? usable[0];
  if (!pick) return null;
  const confidence = pick.labeled || pick.kind === "mobile" ? 0.9 : usable.length > 1 ? 0.6 : 0.75;
  return { value: pick.value, confidence, line: pick.line };
}

// ── 姓名／公司／職稱 ───────────────────────────────────────────────────────

interface Segment {
  text: string;
  line: number;
}

interface Candidate extends Found {
  cjk: boolean;
}

function isNameLikeZh(s: string): boolean {
  if (!CJK_WITH_SPACES.test(s)) return false;
  const bare = s.replace(/ /g, "");
  if (bare.length < 2 || bare.length > 6) return false;
  if (NON_NAME_WORDS.test(bare) || DEPT_ZH.test(bare)) return false;
  if (TITLE_ZH.test(bare) || COMPANY_STRONG_ZH.test(bare) || COMPANY_WEAK_ZH.test(bare)) return false;
  return true;
}

function isNameLikeEn(s: string): boolean {
  if (HAS_CJK.test(s) || /\d/.test(s)) return false;
  const words = s.split(" ");
  if (words.length < 2 || words.length > 4) return false;
  if (!words.every((w) => /^[A-Z][A-Za-z'’.-]*$/.test(w))) return false;
  if (TITLE_EN.test(s) || COMPANY_STRONG_EN.test(s) || COMPANY_WEAK_EN.test(s)) return false;
  return true;
}

function hasStrongCompany(s: string): boolean {
  return COMPANY_STRONG_ZH.test(s) || COMPANY_STRONG_EN.test(s);
}

function hasTitle(s: string): boolean {
  return TITLE_ZH.test(s) || TITLE_EN.test(s);
}

/** 把一行切成片段：寬空白、分隔符號，以及中英文交界 */
function segmentLine(line: string, index: number): Segment[] {
  const rawParts = line
    .split(/\s{2,}|\s*[|｜•·]\s*|\s+[/／]\s+|,\s+(?!(?:Ltd|Inc|LLC|Co|Corp|Limited)\b)/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // 寬空白有時落在欄位內部（OCR 多餘空白）：把明顯屬於同一欄位的片段接回去
  const parts: string[] = [];
  for (const p of rawParts) {
    const last = parts.length - 1;
    const prev = parts[last];
    if (prev !== undefined) {
      const prevWords = prev.split(" ");
      const lastWord = prevWords[prevWords.length - 1] ?? "";
      const capitalized = (s: string) => s.split(" ").every((w) => /^[A-Z][A-Za-z'’.-]*$/.test(w));
      if (COMPANY_SUFFIX_ONLY.test(p) || (!HAS_CJK.test(p) && p.replace(COMPANY_STRONG_EN, "").replace(/[\s,.]/g, "") === "")) {
        // 「範例科技  股份有限公司」「Example Trading  Inc.」
        parts[last] = HAS_CJK.test(p) ? `${prev}${p}` : `${prev} ${p}`;
        continue;
      }
      if (!HAS_CJK.test(prev) && !HAS_CJK.test(p) && /^[A-Z]/.test(p)) {
        const singleLead = /^[A-Z][a-z]+$/.test(prev);
        const nameTail =
          /^[A-Z][A-Za-z'’-]*$/.test(p) && !hasTitle(p) && !hasStrongCompany(p) && capitalized(prev) &&
          prevWords.length <= 3 && !hasTitle(prev) && !hasStrongCompany(prev);
        const titleContinues = TITLE_MOD_EN.test(lastWord) && (hasTitle(p) || TITLE_MOD_EN.test(p.split(" ")[0] ?? ""));
        if (singleLead || nameTail || titleContinues) {
          parts[last] = `${prev} ${p}`;
          continue;
        }
      }
      if (ZH_TITLE_MOD_ONLY.test(prev) && ZH_TITLE_HEAD.test(p)) {
        // 「業務  經理」
        parts[last] = `${prev}${p}`;
        continue;
      }
    }
    parts.push(p);
  }

  const out: Segment[] = [];
  for (const part of parts) {
    // 公司名可能本身中英混寫（「Example 範例股份有限公司」），有公司尾綴且沒有職稱時不切
    if (hasStrongCompany(part) && !hasTitle(part.replace(COMPANY_STRONG_ZH, "").replace(COMPANY_STRONG_EN, ""))) {
      out.push({ text: part, line: index });
      continue;
    }
    const pieces = part
      .split(new RegExp(`(?<=[${CJK}])\\s+(?=[A-Za-z])|(?<=[A-Za-z.])\\s+(?=[${CJK}])`))
      .map((p) => p.trim())
      .filter(Boolean);
    for (const piece of pieces) out.push({ text: piece, line: index });
  }
  return out;
}

interface Classified {
  names: Candidate[];
  titles: Candidate[];
  companies: Array<Candidate & { strong: boolean }>;
  leftovers: Candidate[];
}

const ZH_TITLE_AT_END = new RegExp(`^(.*?)((?:${TITLE_MOD_ZH})*(?:${TITLE_CORE_ZH}))$`);
const ZH_TITLE_AT_START = new RegExp(`^((?:${TITLE_MOD_ZH})*(?:${TITLE_CORE_ZH}))(.+)$`);

function classifyTitleSegment(seg: Segment, acc: Classified): void {
  const s = seg.text;
  const cjk = HAS_CJK.test(s);
  if (cjk) {
    const tokens = s.split(" ");
    if (tokens.length > 1) {
      // 「測試 王小明 業務經理」「業務部 經理」：有空白分隔 → 逐 token 判斷
      const titleIdx = tokens.findIndex((t) => TITLE_ZH.test(t));
      const head = tokens.slice(0, titleIdx).join(" ");
      const titleTokens = tokens.slice(titleIdx);
      const tailNameStart = titleTokens.findIndex((t, k) => k > 0 && !TITLE_ZH.test(t) && !DEPT_ZH.test(t));
      const tail = tailNameStart > 0 ? titleTokens.slice(tailNameStart).join(" ") : "";
      const titlePart = (tailNameStart > 0 ? titleTokens.slice(0, tailNameStart) : titleTokens).join(" ");
      if (head && isNameLikeZh(head)) {
        acc.names.push({ value: head, confidence: 0.9, line: seg.line, cjk: true });
        acc.titles.push({ value: titlePart, confidence: 0.85, line: seg.line, cjk: true });
      } else {
        acc.titles.push({ value: head ? `${head} ${titlePart}` : titlePart, confidence: 0.85, line: seg.line, cjk: true });
      }
      if (tail && isNameLikeZh(tail)) acc.names.push({ value: tail, confidence: 0.85, line: seg.line, cjk: true });
      return;
    }
    // 沒有空白：「測試王小明業務經理」「業務經理測試王小明」
    const end = s.match(ZH_TITLE_AT_END);
    if (end) {
      const prefix = end[1] ?? "";
      const title = end[2] ?? "";
      if (prefix.length >= 3 && isNameLikeZh(prefix)) {
        acc.names.push({ value: prefix, confidence: 0.7, line: seg.line, cjk: true });
        acc.titles.push({ value: title, confidence: 0.7, line: seg.line, cjk: true });
        return;
      }
    }
    const startMatch = s.match(ZH_TITLE_AT_START);
    if (startMatch && !end) {
      const title = startMatch[1] ?? "";
      const suffix = startMatch[2] ?? "";
      if (suffix.length >= 3 && isNameLikeZh(suffix)) {
        acc.titles.push({ value: title, confidence: 0.7, line: seg.line, cjk: true });
        acc.names.push({ value: suffix, confidence: 0.7, line: seg.line, cjk: true });
        return;
      }
    }
    acc.titles.push({ value: s, confidence: 0.85, line: seg.line, cjk: true });
    return;
  }
  // 英文：「Test Alex Chen Sales Manager」→ 姓名在前、職稱從第一個職稱字開始
  const words = s.split(" ");
  const start = words.findIndex((w) => TITLE_MOD_EN.test(w.replace(/[,.]$/, "")) || TITLE_EN.test(w));
  const head = words.slice(0, Math.max(start, 0)).join(" ").replace(/[,|-]\s*$/, "").trim();
  if (start > 0 && isNameLikeEn(head)) {
    acc.names.push({ value: head, confidence: 0.85, line: seg.line, cjk: false });
    acc.titles.push({ value: words.slice(start).join(" "), confidence: 0.85, line: seg.line, cjk: false });
    return;
  }
  acc.titles.push({ value: s, confidence: 0.85, line: seg.line, cjk: false });
}

function classifySegment(seg: Segment, acc: Classified): void {
  const s = seg.text;
  if (s.length < 2) return;
  const cjk = HAS_CJK.test(s);

  if (hasStrongCompany(s)) {
    // 取到最後一個公司尾綴為止；其餘部分（前面的職稱、後面的姓名職稱）另行判斷
    const zh = [...s.matchAll(new RegExp(COMPANY_STRONG_ZH_SRC, "g"))].pop();
    const en = [...s.matchAll(new RegExp(COMPANY_STRONG_EN.source, "gi"))].pop();
    const endZh = zh ? (zh.index ?? 0) + zh[0].length : -1;
    const endEn = en ? (en.index ?? 0) + en[0].length : -1;
    let end = Math.max(endZh, endEn);
    if (s[end] === ".") end += 1;
    let head = s.slice(0, end).trim();
    const tail = s.slice(end).replace(/^[\s,，、]+/, "").trim();

    // 前面黏著的職稱／姓名（以空白分隔）：「業務經理 範例科技股份有限公司」
    const tokens = head.split(" ");
    const peeled: string[] = [];
    while (tokens.length > 1) {
      const t = tokens[0] ?? "";
      const nxt = tokens[1] ?? "";
      const titleLike = hasTitle(t) && !hasStrongCompany(t) && !COMPANY_WEAK_ZH.test(t.replace(TITLE_ZH, ""));
      const nameThenTitle = (isNameLikeZh(t) || /^[A-Z][a-z]+$/.test(t)) && hasTitle(nxt) && !hasStrongCompany(nxt);
      if (!titleLike && !nameThenTitle) break;
      peeled.push(tokens.shift() ?? "");
    }
    head = tokens.join(" ");
    if (head.replace(/\s/g, "").length >= 2) {
      acc.companies.push({ value: head, confidence: 0.9, line: seg.line, cjk, strong: true });
    }
    if (peeled.length) classifySegment({ text: peeled.join(" "), line: seg.line }, acc);
    if (tail) classifySegment({ text: tail, line: seg.line }, acc);
    return;
  }

  // 單獨一段的部門名稱（「業務部」）不是職稱，也不是姓名
  if (cjk && !s.includes(" ") && DEPT_ZH.test(s)) return;

  if (hasTitle(s)) {
    classifyTitleSegment(seg, acc);
    return;
  }

  if (COMPANY_WEAK_ZH.test(s) || COMPANY_WEAK_EN.test(s)) {
    acc.companies.push({ value: s, confidence: 0.65, line: seg.line, cjk, strong: false });
    return;
  }

  if (cjk ? isNameLikeZh(s) : isNameLikeEn(s)) {
    acc.names.push({ value: s, confidence: 0.7, line: seg.line, cjk });
    return;
  }

  if (!/\d/.test(s) && !(cjk && DEPT_ZH.test(s))) {
    acc.leftovers.push({ value: s, confidence: 0.4, line: seg.line, cjk });
  }
}

function best<T extends Candidate>(cands: T[]): T | null {
  if (cands.length === 0) return null;
  // 同時有中文與英文時取中文；同語言取信心高者，再取出現較早者
  const pool = cands.some((c) => c.cjk) ? cands.filter((c) => c.cjk) : cands;
  return [...pool].sort((a, b) => b.confidence - a.confidence || a.line - b.line)[0] ?? null;
}

// ── 主函式 ────────────────────────────────────────────────────────────────

function emptyResult(): ParsedCard {
  return {
    fields: { name: null, company: null, title: null, phone: null, email: null },
    confidence: { name: 0, company: 0, title: 0, phone: 0, email: 0 },
    lowConfidenceFields: [],
    overallConfidence: 0,
  };
}

function compact(s: string): string {
  return toHalfWidth(s).replace(/\s+/g, "").toLowerCase();
}

/** 欄位所在行的 engine 信心：找出內容最接近的一行 */
function engineConfidence(value: string, lines: OcrLine[] | undefined): number | null {
  if (!lines || lines.length === 0) return null;
  const needle = compact(value);
  if (!needle) return null;
  let found: number | null = null;
  for (const l of lines) {
    if (l.confidence === null) continue;
    const hay = compact(l.text);
    if (hay.includes(needle) || (hay.length >= 2 && needle.includes(hay))) {
      found = found === null ? l.confidence : Math.min(found, l.confidence);
    }
  }
  return found;
}

/**
 * 名片 OCR 文字的啟發式解析。只回傳預覽；呼叫端必須讓使用者確認後才可建立聯絡人。
 */
export function parseCardHeuristic(text: string, options: ParseCardOptions = {}): ParsedCard {
  const result = emptyResult();
  if (!text || !text.trim()) return result;
  const threshold = options.lowConfidenceThreshold ?? LOW_CONFIDENCE_THRESHOLD;
  const lines = prepareLines(text);

  const email = findEmail(lines);
  const phones = findPhones(lines);
  const phone = pickPhone(phones);
  const contactLines = new Set<number>(phones.map((p) => p.line));
  if (email) contactLines.add(email.line);

  const acc: Classified = { names: [], titles: [], companies: [], leftovers: [] };
  lines.forEach((line, i) => {
    if (contactLines.has(i)) return;
    if (line.includes("@") || URL.test(line) || ADDRESS.test(line)) return;
    if (LABEL_ONLY.test(line) || /^(?:統一編號|統編|LINE)/i.test(line)) return;
    for (const seg of segmentLine(line, i)) classifySegment(seg, acc);
  });

  // 同一行相鄰的中文姓名片段（「測試」「王小明」被寬空白切開）接回一個姓名
  const mergedNames: Candidate[] = [];
  for (const n of acc.names) {
    const last = mergedNames[mergedNames.length - 1];
    if (last && last.cjk && n.cjk && last.line === n.line && `${last.value}${n.value}`.replace(/ /g, "").length <= 6) {
      last.value = `${last.value} ${n.value}`;
      last.confidence = Math.min(last.confidence, n.confidence);
    } else {
      mergedNames.push({ ...n });
    }
  }

  // 姓名：緊鄰職稱、或與 Email 帳號相符者加分
  const titleLines = new Set(acc.titles.map((t) => t.line));
  const local = email ? email.value.split("@")[0]?.toLowerCase() ?? "" : "";
  for (const n of mergedNames) {
    if (titleLines.has(n.line)) n.confidence = Math.min(0.95, n.confidence + 0.15);
    else if (titleLines.has(n.line - 1) || titleLines.has(n.line + 1)) n.confidence = Math.min(0.95, n.confidence + 0.1);
    if (n.cjk && n.value.split(" ").some((t) => t.length >= 2 && t.length <= 4 && COMMON_SURNAMES.includes(t[0] ?? ""))) {
      n.confidence = Math.min(0.95, n.confidence + 0.05);
    }
    if (!n.cjk && local) {
      const hit = n.value
        .toLowerCase()
        .split(" ")
        .some((w) => w.length >= 3 && local.includes(w));
      if (hit) n.confidence = Math.min(0.95, n.confidence + 0.15);
    }
  }
  const name = best(mergedNames);

  const title = best(acc.titles);

  const strong = acc.companies.filter((c) => c.strong);
  const weak = acc.companies.filter((c) => !c.strong);
  let company: Candidate | null = best(strong) ?? best(weak);
  if (!company) {
    // 沒有任何公司關鍵字：退而取第一個未歸類的片段（含未被選為姓名的候選），信心低
    const altName = (n: Candidate) => name !== null && n.cjk !== name.cjk && Math.abs(n.line - name.line) <= 1;
    const rest = [
      ...acc.leftovers,
      ...mergedNames.filter((n) => n !== name && !altName(n)).map((n) => ({ ...n, confidence: 0.4 })),
    ].sort(
      (a, b) => a.line - b.line,
    );
    company = rest[0] ?? null;
  }

  const picked: Record<OcrFieldKey, Found | null> = { name, company, title, phone, email };
  let sum = 0;
  let count = 0;
  for (const key of OCR_FIELDS) {
    const f = picked[key];
    if (!f) continue;
    const value = f.value.trim();
    if (!value) continue;
    const engine = engineConfidence(value, options.lines);
    const confidence = Math.round((engine === null ? f.confidence : Math.min(f.confidence, engine)) * 100) / 100;
    result.fields[key] = value;
    result.confidence[key] = confidence;
    if (confidence < threshold) result.lowConfidenceFields.push(key);
    sum += confidence;
    count += 1;
  }
  result.overallConfidence = count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
  return result;
}
