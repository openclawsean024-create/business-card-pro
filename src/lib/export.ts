// SPEC §3.1 FR-004 / AC-006 / AC-007 / §10.5: vCard / CSV / JSON 匯出 + CSV 匯入
// 注意: 匯出永遠可執行,免費 pilot 不擋匯出 (AC-010)
//
// Schema versioning policy (SPEC §10.5):
// - 任何欄位新增 / 重新命名 / 型別變更 → EXPORT_SCHEMA_VERSION + 1
// - EXPORT_SCHEMA_DOC 是 schema 定義文件路徑,machine-readable
// - 解析端可以信賴 schema-version 標頭來決定欄位映射

import type { Contact, Followup, Interaction } from "./types";
import { lastInteractionDate } from "./domain";

/** 當前 schema 版本。任何欄位變動都要 bump 這個常數 + 更新 EXPORT_SCHEMA_DOC。
 *  v2 (2026-08-16): Interaction.kind enum 擴充 line/wechat/dm/visit
 *  v1: kind 只有 note/call/email/meeting */
export const EXPORT_SCHEMA_VERSION = 2;

/** Schema 描述文件路徑(spec-kit 風格,machine-readable) */
export const EXPORT_SCHEMA_DOC =
  "https://github.com/openclawsean024-create/business-card-pro/blob/main/PRD/SPEC.md#export-schema-v" +
  EXPORT_SCHEMA_VERSION;

function emptyStateStub(state: {
  interactions: Interaction[];
  followups: Followup[];
}) {
  return {
    ...state,
    contacts: state.interactions.length > 0 ? undefined : [],
    cardImages: [],
    exchanges: [],
    consents: [],
    ownerId: "x",
    plan: { ownerId: "x", tier: "free" as const, maxContacts: 20, cloudSync: false },
    theme: "light" as const,
    ui: { searchQuery: "", activeTag: null, activeTab: "today" as const, sortMode: "dueDate" as const },
  } as Parameters<typeof lastInteractionDate>[1];
}

/** vCard 3.0 單張名片 */
export function buildVCard(contact: Contact, lastTouch: string | null): string {
  const p = contact.payload;
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`FN:${esc(p.name ?? p.company ?? "(無姓名)")}`);
  if (p.name) lines.push(`N:${esc(p.name)};;;;`);
  if (p.company) lines.push(`ORG:${esc(p.company)}`);
  if (p.title) lines.push(`TITLE:${esc(p.title)}`);
  if (p.phone) lines.push(`TEL;TYPE=CELL:${esc(p.phone)}`);
  if (p.email) lines.push(`EMAIL:${esc(p.email)}`);
  if (p.website) lines.push(`URL:${esc(p.website)}`);
  if (p.address) lines.push(`ADR:;;${esc(p.address)};;;;`);
  if (p.notes) lines.push(`NOTE:${esc(p.notes)}`);
  if (lastTouch) lines.push(`REV:${esc(lastTouch)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function exportVCard(contact: Contact, lastTouch: string | null): string {
  return buildVCard(contact, lastTouch);
}

export function exportVCards(
  contacts: Contact[],
  state: { interactions: Interaction[]; followups: Followup[] },
): string {
  return contacts
    .map((c) =>
      buildVCard(
        c,
        lastInteractionDate(
          c.id,
          emptyStateStub(state) as Parameters<typeof lastInteractionDate>[1],
        ),
      ),
    )
    .join("\r\n");
}

/** AC-007: CSV 包含原始欄位與最後互動日期 */
export const CSV_FIELDS = [
  "name",
  "company",
  "title",
  "phone",
  "email",
  "address",
  "website",
  "notes",
  "tags",
  "lastInteraction",
] as const;

interface CsvExportOptions {
  /** exported at time (ISO 8601),寫進 # meta 讓 import 端可對齊 */
  exportedAt?: string;
}

/**
 * CSV 匯出 — SPEC §10.5 machine-readable schema version header。
 *
 * Header 格式(每行都是 # 開頭的 metadata):
 *   # business-card-pro export
 *   # schema-version: 1
 *   # schema-doc: <url>
 *   # exported-at: <ISO 8601>
 *
 * 接著是 CSV header + rows。import 端用 grep/parse metadata line 即可知道
 * schema 是否相容,而不需要打開文件讀內容。
 */
export function exportCSV(
  contacts: Contact[],
  state: { interactions: Interaction[]; followups: Followup[] },
  options: CsvExportOptions = {},
): string {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const csvHeader = CSV_FIELDS.join(",");
  const rows = contacts.map((c) => {
    const last = lastInteractionDate(
      c.id,
      emptyStateStub(state) as Parameters<typeof lastInteractionDate>[1],
    );
    return CSV_FIELDS.map((f) => {
      if (f === "tags") return csvCell(c.payload.tags.join("|"));
      if (f === "lastInteraction") return csvCell(last ?? "");
      const v = (c.payload as unknown as Record<string, string | null>)[f];
      return csvCell(v ?? "");
    }).join(",");
  });
  const meta = [
    `# business-card-pro export`,
    `# schema-version: ${EXPORT_SCHEMA_VERSION}`,
    `# schema-doc: ${EXPORT_SCHEMA_DOC}`,
    `# exported-at: ${exportedAt}`,
  ].join("\n");
  return `${meta}\n${csvHeader}\n${rows.join("\n")}`;
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** AC-007 + §10.5: 解析端如果看到 # schema-version != EXPORT_SCHEMA_VERSION,應該警告 */
export function parseCSV(input: string): { contacts: Contact[]; meta: ExportMeta } {
  const lines = input.split(/\r?\n/);
  const meta: ExportMeta = { schemaVersion: null, schemaDoc: null, exportedAt: null };
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.startsWith("#")) {
      dataStart = i;
      break;
    }
    if (line.startsWith("# schema-version:")) {
      meta.schemaVersion = parseInt(line.slice("# schema-version:".length).trim(), 10);
    } else if (line.startsWith("# schema-doc:")) {
      meta.schemaDoc = line.slice("# schema-doc:".length).trim();
    } else if (line.startsWith("# exported-at:")) {
      meta.exportedAt = line.slice("# exported-at:".length).trim();
    }
  }
  const dataLines = lines.slice(dataStart).filter((l) => l !== undefined);
  if (dataLines.length < 2) return { contacts: [], meta };
  const headerLine = dataLines[0];
  if (!headerLine) return { contacts: [], meta };
  const headers = headerLine.split(",");
  const now = new Date().toISOString();
  const contacts = dataLines
    .slice(1)
    .map((line) => {
      const cols = parseCsvLine(line);
      const payload: Record<string, string> = {};
      headers.forEach((h, i) => {
        payload[h] = cols[i] ?? "";
      });
      return {
        id: `csv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ownerId: null,
        status: "active" as const,
        version: 1,
        createdAt: now,
        updatedAt: now,
        payload: {
          name: payload.name || null,
          company: payload.company || null,
          title: payload.title || null,
          phone: payload.phone || null,
          email: payload.email || null,
          address: payload.address || null,
          website: payload.website || null,
          notes: payload.notes || null,
          tags: payload.tags ? payload.tags.split("|").filter(Boolean) : [],
          ocrConfidence: null,
          ocrLowConfidenceFields: [],
        },
      } satisfies Contact;
    });
  return { contacts, meta };
}

export interface ExportMeta {
  schemaVersion: number | null;
  schemaDoc: string | null;
  exportedAt: string | null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}