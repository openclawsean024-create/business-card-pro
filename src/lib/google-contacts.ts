// GOAL.md M1 AC-004：Google 聯絡人 — 檔案互通（不連線 Google、不需要任何憑證）
//
//   - exportGoogleCSV：產生 Google 聯絡人「匯入」可讀的 CSV（Google CSV 格式）
//   - parseGoogleCSV ：讀取 Google 聯絡人匯出的 Google CSV（新版與舊版標頭都接受）
//   - parseVCards    ：讀取 vCard 3.0（Google 聯絡人與本 app 都能匯出）
//   - parseContactsFile：依內容自動判斷三種格式（含本 app 自己的 CSV）
//
// 欄位對照表見 PRD/SPEC.md §5.2。Google 的說明文件（2026-11-16 查閱）只說明可匯出
// 「Google CSV」與「vCard」，沒有公布欄位清單；這裡的標頭是依已知的 Google CSV 匯出格式撰寫，
// 尚未以官方文件逐欄查證，也尚未用測試帳號＋假資料實際匯入驗證（狀態記錄在 STATUS.md）。
// 為了降低標頭差異的風險，匯入時同時接受新版與舊版標頭。
//
// 去重與免費層上限不在這裡處理，統一由 store.importContacts（contact-import.ts）負責。

import type { Contact, ContactPayload } from "./types";
import { newId } from "./domain";

/** Google CSV 多值欄位（標籤、多個 Email）的分隔符號 */
const MULTI = " ::: ";

/** 新版 Google CSV 標頭（Google 聯絡人「匯出 → Google CSV」的欄位順序） */
export const GOOGLE_CSV_HEADERS = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Phonetic First Name",
  "Phonetic Middle Name",
  "Phonetic Last Name",
  "Name Prefix",
  "Name Suffix",
  "Nickname",
  "File As",
  "Organization Name",
  "Organization Title",
  "Organization Department",
  "Birthday",
  "Notes",
  "Photo",
  "Labels",
  "E-mail 1 - Label",
  "E-mail 1 - Value",
  "Phone 1 - Label",
  "Phone 1 - Value",
  "Address 1 - Label",
  "Address 1 - Formatted",
  "Address 1 - Street",
  "Address 1 - City",
  "Address 1 - PO Box",
  "Address 1 - Region",
  "Address 1 - Postal Code",
  "Address 1 - Country",
  "Address 1 - Extended Address",
  "Website 1 - Label",
  "Website 1 - Value",
] as const;

type GoogleHeader = (typeof GOOGLE_CSV_HEADERS)[number];

/** 本 app 欄位 → Google CSV 欄位（匯出用；匯入時另外接受舊版標頭，見 LEGACY_ALIASES） */
export const GOOGLE_CSV_FIELD_MAP: Record<Exclude<keyof ContactPayload, "ocrConfidence" | "ocrLowConfidenceFields">, GoogleHeader> = {
  name: "First Name",
  company: "Organization Name",
  title: "Organization Title",
  phone: "Phone 1 - Value",
  email: "E-mail 1 - Value",
  address: "Address 1 - Formatted",
  website: "Website 1 - Value",
  notes: "Notes",
  tags: "Labels",
};

/** 舊版 Google CSV（2024 年以前的匯出檔）使用的標頭 */
const LEGACY_ALIASES: Record<string, string[]> = {
  "Organization Name": ["Organization 1 - Name"],
  "Organization Title": ["Organization 1 - Title"],
  Labels: ["Group Membership"],
  "First Name": ["Given Name"],
  "Middle Name": ["Additional Name"],
  "Last Name": ["Family Name"],
  "E-mail 1 - Label": ["E-mail 1 - Type"],
  "Phone 1 - Label": ["Phone 1 - Type"],
};

const HAS_CJK = /[㐀-鿿豈-﫿]/;

// ── CSV 基本讀寫（RFC 4180：引號、跳脫、欄位內換行）──────────────────────────

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function parseCsvRows(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ── 匯出 ────────────────────────────────────────────────────────────────

/** Google 聯絡人可匯入的 CSV。只輸出 active 聯絡人；不含 OCR 中繼資料與回訪紀錄。 */
export function exportGoogleCSV(contacts: Contact[]): string {
  const rows = contacts
    .filter((c) => c.status === "active")
    .map((c) => {
      const p = c.payload;
      const row: Partial<Record<GoogleHeader, string>> = {
        "First Name": p.name ?? "",
        "Organization Name": p.company ?? "",
        "Organization Title": p.title ?? "",
        Notes: p.notes ?? "",
        // 「* myContacts」是 Google 的系統標籤，匯入後才會出現在「聯絡人」清單
        Labels: [...p.tags, "* myContacts"].join(MULTI),
        "E-mail 1 - Label": p.email ? "Work" : "",
        "E-mail 1 - Value": p.email ?? "",
        "Phone 1 - Label": p.phone ? (/^(?:\+?886)?0?9/.test(p.phone.replace(/\D/g, "")) ? "Mobile" : "Work") : "",
        "Phone 1 - Value": p.phone ?? "",
        "Address 1 - Label": p.address ? "Work" : "",
        "Address 1 - Formatted": p.address ?? "",
        "Website 1 - Label": p.website ? "Work" : "",
        "Website 1 - Value": p.website ?? "",
      };
      return GOOGLE_CSV_HEADERS.map((h) => csvCell(row[h] ?? "")).join(",");
    });
  return `${[GOOGLE_CSV_HEADERS.join(","), ...rows].join("\r\n")}\r\n`;
}

// ── 匯入 ────────────────────────────────────────────────────────────────

function blankToNull(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return v === "" ? null : v;
}

function firstValue(value: string | undefined): string | null {
  return blankToNull((value ?? "").split(":::")[0]);
}

function newContact(payload: ContactPayload, prefix: string): Contact {
  const now = new Date().toISOString();
  return { id: newId(prefix), ownerId: null, status: "active", version: 1, createdAt: now, updatedAt: now, payload };
}

/** 姓名：中文為「姓＋名」不加空白；其他語言為「First Middle Last」 */
function joinName(first: string, middle: string, last: string): string | null {
  const parts = [first, middle, last].map((s) => s.trim());
  if (parts.every((s) => s === "")) return null;
  if (parts.some((s) => HAS_CJK.test(s)) && parts[2]) return `${parts[2]}${parts[0]}${parts[1]}`;
  return parts.filter(Boolean).join(" ");
}

export function isGoogleCSV(input: string): boolean {
  const header = parseCsvRows(input.split(/\r?\n/, 1)[0] ?? "")[0] ?? [];
  const set = new Set(header.map((h) => h.trim()));
  const hasName = set.has("First Name") || set.has("Given Name") || set.has("Name");
  return hasName && (set.has("E-mail 1 - Value") || set.has("Phone 1 - Value"));
}

/** 讀取 Google 聯絡人匯出的 Google CSV；沒有姓名也沒有公司的列會略過並計入 skipped */
export function parseGoogleCSV(input: string): { contacts: Contact[]; skipped: number } {
  const rows = parseCsvRows(input);
  const header = (rows[0] ?? []).map((h) => h.trim());
  const index = new Map(header.map((h, i) => [h, i]));
  const contacts: Contact[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const get = (name: string): string => {
      for (const key of [name, ...(LEGACY_ALIASES[name] ?? [])]) {
        const i = index.get(key);
        if (i !== undefined && (row[i] ?? "").trim() !== "") return row[i] ?? "";
      }
      return "";
    };
    // 舊版有完整的 "Name" 欄；新版只有 First／Middle／Last
    const name = blankToNull(get("Name")) ?? joinName(get("First Name"), get("Middle Name"), get("Last Name")) ?? blankToNull(get("File As"));
    const company = blankToNull(get("Organization Name"));
    if (!name && !company) {
      skipped += 1;
      continue;
    }
    const tags = get("Labels")
      .split(":::")
      .map((t) => t.trim())
      .filter((t) => t !== "" && !t.startsWith("*"));
    contacts.push(
      newContact(
        {
          name,
          company,
          title: blankToNull(get("Organization Title")),
          phone: firstValue(get("Phone 1 - Value")),
          email: firstValue(get("E-mail 1 - Value")),
          address: blankToNull(get("Address 1 - Formatted")),
          website: firstValue(get("Website 1 - Value")),
          notes: blankToNull(get("Notes")),
          tags,
          ocrConfidence: null,
          ocrLowConfidenceFields: [],
        },
        "gcsv",
      ),
    );
  }
  return { contacts, skipped };
}

// ── vCard 3.0 ────────────────────────────────────────────────────────────

function vUnescape(value: string): string {
  return value.replace(/\\([nN,;:\\])/g, (_, ch: string) => (ch === "n" || ch === "N" ? "\n" : ch));
}

/** 以未跳脫的分號切開（N、ORG、ADR 的結構化值） */
function vSplit(value: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\\" && i + 1 < value.length) {
      cur += ch + value[i + 1];
      i += 1;
    } else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => vUnescape(s).trim());
}

interface VProp {
  name: string;
  params: string;
  value: string;
}

/** 讀取 vCard 3.0（可含多張）；沒有姓名也沒有公司的卡片略過並計入 skipped */
export function parseVCards(input: string): { contacts: Contact[]; skipped: number } {
  // 行折疊：CRLF 後接空白或 tab 表示接續上一行
  const lines = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const contacts: Contact[] = [];
  let skipped = 0;
  let props: VProp[] | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^BEGIN:VCARD$/i.test(line)) {
      props = [];
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (props) {
        const payload = vcardToPayload(props);
        if (payload) contacts.push(newContact(payload, "vcf"));
        else skipped += 1;
      }
      props = null;
      continue;
    }
    if (!props) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const [rawName = "", ...params] = head.split(";");
    // Google 會輸出群組前綴（item1.EMAIL）
    const name = rawName.replace(/^[^.]+\./, "").toUpperCase();
    props.push({ name, params: params.join(";").toUpperCase(), value: line.slice(colon + 1) });
  }
  return { contacts, skipped };
}

function vcardToPayload(props: VProp[]): ContactPayload | null {
  const all = (name: string) => props.filter((p) => p.name === name && p.value.trim() !== "");
  const one = (name: string) => all(name)[0];
  const preferred = (name: string, type: RegExp) => all(name).find((p) => type.test(p.params)) ?? one(name);

  let name = blankToNull(vUnescape(one("FN")?.value ?? ""));
  if (!name) {
    const n = one("N");
    if (n) {
      const [family = "", given = "", additional = ""] = vSplit(n.value, ";");
      name = joinName(given, additional, family);
    }
  }
  const org = one("ORG");
  const company = org ? blankToNull(vSplit(org.value, ";")[0] ?? "") : null;
  if (!name && !company) return null;

  const adr = one("ADR");
  const address = adr ? blankToNull(vSplit(adr.value, ";").filter(Boolean).join(" ")) : null;
  const tags = all("CATEGORIES")
    .flatMap((p) => vSplit(p.value, ","))
    .filter((t) => t !== "" && t !== "myContacts");

  return {
    name,
    company,
    title: blankToNull(vUnescape(one("TITLE")?.value ?? "")),
    phone: blankToNull(vUnescape(preferred("TEL", /CELL|MOBILE/)?.value ?? "")),
    email: blankToNull(vUnescape(preferred("EMAIL", /PREF/)?.value ?? "")),
    address,
    website: blankToNull(vUnescape(one("URL")?.value ?? "")),
    notes: blankToNull(vUnescape(one("NOTE")?.value ?? "")),
    tags,
    ocrConfidence: null,
    ocrLowConfidenceFields: [],
  };
}

// ── 自動判斷格式 ─────────────────────────────────────────────────────────

export type ContactsFileFormat = "vcard" | "google-csv" | "app-csv";

export interface ParsedContactsFile {
  format: ContactsFileFormat;
  contacts: Contact[];
  /** 檔案中無法成為聯絡人的筆數（沒有姓名也沒有公司） */
  skipped: number;
}

/**
 * 讀取本 app 匯出的 CSV（export.ts 的 exportCSV；開頭有 `# schema-version` 等 meta 行）。
 * 與 export.ts 的 parseCSV 不同處：依 RFC 4180 解析，備註欄位內的換行與逗號能正確讀回，
 * 且沒有姓名也沒有公司的列（例如結尾空行）不會變成空白聯絡人。
 */
export function parseAppCSV(input: string): { contacts: Contact[]; skipped: number } {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  let start = 0;
  while (start < lines.length && (lines[start] ?? "").startsWith("#")) start += 1;
  const rows = parseCsvRows(lines.slice(start).join("\n"));
  const header = (rows[0] ?? []).map((h) => h.trim());
  const contacts: Contact[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const get = (name: string) => blankToNull(row[header.indexOf(name)]);
    const name = get("name");
    const company = get("company");
    if (!name && !company) {
      skipped += 1;
      continue;
    }
    contacts.push(
      newContact(
        {
          name,
          company,
          title: get("title"),
          phone: get("phone"),
          email: get("email"),
          address: get("address"),
          website: get("website"),
          notes: get("notes"),
          tags: (get("tags") ?? "").split("|").map((t) => t.trim()).filter(Boolean),
          ocrConfidence: null,
          ocrLowConfidenceFields: [],
        },
        "csv",
      ),
    );
  }
  return { contacts, skipped };
}

/** 設定頁的「匯入」用：vCard、Google CSV、本 app 的 CSV 都走這裡 */
export function parseContactsFile(text: string): ParsedContactsFile {
  if (/BEGIN:VCARD/i.test(text)) return { format: "vcard", ...parseVCards(text) };
  if (isGoogleCSV(text)) return { format: "google-csv", ...parseGoogleCSV(text) };
  return { format: "app-csv", ...parseAppCSV(text) };
}
