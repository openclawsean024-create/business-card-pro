// SPEC §3.1 FR-004 / AC-006 / AC-007: vCard / CSV 匯出 + CSV 匯入
// 注意: 匯出永遠可執行,免費 pilot 不擋匯出 (AC-010)

import type { Contact, Followup, Interaction } from "./types";
import { lastInteractionDate } from "./domain";

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
    .map((c) => buildVCard(c, lastInteractionDate(c.id, {
      ...state,
      contacts: [c],
      cardImages: [],
      exchanges: [],
      consents: [],
      ownerId: "x",
      plan: { ownerId: "x", tier: "free", maxContacts: 20, cloudSync: false },
      theme: "light",
      ui: { searchQuery: "", activeTag: null, activeTab: "today", sortMode: "dueDate" },
    } as Parameters<typeof lastInteractionDate>[1])))
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

export function exportCSV(contacts: Contact[], state: { interactions: Interaction[]; followups: Followup[] }): string {
  const header = CSV_FIELDS.join(",");
  const rows = contacts.map((c) => {
    const last = lastInteractionDate(c.id, {
      ...state,
      contacts: [c],
      cardImages: [],
      exchanges: [],
      consents: [],
      ownerId: "x",
      plan: { ownerId: "x", tier: "free", maxContacts: 20, cloudSync: false },
      theme: "light",
      ui: { searchQuery: "", activeTag: null, activeTab: "today", sortMode: "dueDate" },
    } as Parameters<typeof lastInteractionDate>[1]);
    return CSV_FIELDS.map((f) => {
      if (f === "tags") return csvCell(c.payload.tags.join("|"));
      if (f === "lastInteraction") return csvCell(last ?? "");
      const v = (c.payload as unknown as Record<string, string | null>)[f];
      return csvCell(v ?? "");
    }).join(",");
  });
  // schema version header (AC-007 / §10.5)
  return `# business-card-pro v3.0 export — schema-version: 1\n${header}\n${rows.join("\n")}`;
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function parseCSV(input: string): Contact[] {
  const lines = input.split(/\r?\n/).filter((l) => !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  if (!headerLine) return [];
  const headers = headerLine.split(",");
  const now = new Date().toISOString();
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const payload: Record<string, string | null> = {};
    headers.forEach((h, i) => {
      payload[h] = cols[i] ?? "";
    });
    return {
      id: `csv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ownerId: null,
      status: "active",
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
    };
  });
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