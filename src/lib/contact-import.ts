// GOAL.md M1 AC-004(c)／AC-006：匯入的去重與免費層上限
// CSV、vCard、Google CSV 匯入與同步 pull 都經過這裡，任何匯入路徑都不能繞過 plan.maxContacts。
import type { Contact } from "./types";
import { digitsOnly } from "./ocr/normalize";

export interface ImportPlan {
  /** 實際要新增的聯絡人 */
  toAdd: Contact[];
  /** 與既有聯絡人或同一批前面的資料重複（Email 或電話相同）而未新增的筆數 */
  duplicates: number;
  /** 因超過方案上限而未匯入的筆數 */
  overLimit: number;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  /** 因超過方案上限而未匯入的筆數 */
  notImported: number;
  /** 方案的聯絡人上限（供訊息顯示） */
  limit: number;
}

export function emailKey(email: string | null | undefined): string | null {
  const v = (email ?? "").trim().toLowerCase();
  return v === "" ? null : v;
}

export function phoneKey(phone: string | null | undefined): string | null {
  const v = digitsOnly(phone ?? "");
  return v === "" ? null : v;
}

/**
 * 決定一批匯入資料中哪些要新增。
 * - 去重：Email（小寫）或電話（只取數字）與 active 聯絡人或同批前面的資料相同者不新增。
 * - 上限：active 聯絡人數 + 新增數不得超過 maxContacts；超過的部分不匯入並回報筆數。
 * 已刪除（tombstone）的聯絡人不列入去重與上限。
 */
export function planImport(existing: Contact[], incoming: Contact[], maxContacts: number): ImportPlan {
  const active = existing.filter((c) => c.status === "active");
  const ids = new Set(existing.map((c) => c.id));
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const c of active) {
    const e = emailKey(c.payload.email);
    const p = phoneKey(c.payload.phone);
    if (e) emails.add(e);
    if (p) phones.add(p);
  }

  let room = Math.max(0, maxContacts - active.length);
  const toAdd: Contact[] = [];
  let duplicates = 0;
  let overLimit = 0;
  for (const c of incoming) {
    const e = emailKey(c.payload.email);
    const p = phoneKey(c.payload.phone);
    if (ids.has(c.id) || (e !== null && emails.has(e)) || (p !== null && phones.has(p))) {
      duplicates += 1;
      continue;
    }
    if (room <= 0) {
      overLimit += 1;
      continue;
    }
    toAdd.push(c);
    room -= 1;
    ids.add(c.id);
    if (e) emails.add(e);
    if (p) phones.add(p);
  }
  return { toAdd, duplicates, overLimit };
}

/** 給使用者看的匯入結果摘要 */
export function describeImport(result: ImportResult): string {
  const parts = [`匯入 ${result.imported} 筆`];
  if (result.duplicates > 0) parts.push(`${result.duplicates} 筆重複（Email 或電話相同）未新增`);
  if (result.notImported > 0) parts.push(`${result.notImported} 筆因超過方案上限 ${result.limit} 張未匯入`);
  return parts.join("；");
}
