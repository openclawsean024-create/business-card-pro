// SPEC §3.1 / §3.4 對齊的核心邏輯 + utility
// 注意:所有 mutation 必須保留 updatedAt / version;刪除須 tombstone

import type {
  AppState,
  Contact,
  ContactPayload,
  ExchangeEvent,
  Followup,
  FollowupEntry,
  ID,
  Interaction,
  ISODate,
  TimelineEntry,
} from "./types";

/** AC-001: 建立聯絡人必填姓名或公司其中一項 */
export function validateContactPayload(p: ContactPayload): string | null {
  if (!p.name && !p.company) {
    return "AC-001: 姓名或公司必填其中一項";
  }
  if (p.name !== null && p.name.length > 100) {
    return "姓名過長 (>100)";
  }
  if (p.company !== null && p.company.length > 100) {
    return "公司過長 (>100)";
  }
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) {
    return "Email 格式不正確";
  }
  return null;
}

/** AC-003: 今日 queue 只顯示未完成且到期事件 */
export function isFollowupDueToday(f: Followup, now: Date = new Date()): boolean {
  if (f.status !== "pending") return false;
  const due = new Date(f.dueDate);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000);
  return due >= todayStart && due < todayEnd;
}

/** 逾期(比今天還早仍未完成) */
export function isFollowupOverdue(f: Followup, now: Date = new Date()): boolean {
  if (f.status !== "pending") return false;
  return new Date(f.dueDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 取得今日 + 逾期的 queue,順序: 逾期先, 再到期日近的先 */
export function getTodayQueue(
  followups: Followup[],
  contacts: Contact[],
  now: Date = new Date(),
): Array<Followup & { contact: Contact | null }> {
  const eligible = followups.filter(
    (f) => f.status === "pending" && (isFollowupDueToday(f, now) || isFollowupOverdue(f, now)),
  );
  return eligible
    .map((f) => ({
      ...f,
      contact: contacts.find((c) => c.id === f.contactId && c.status === "active") ?? null,
    }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/** AC-008: 搜尋姓名、公司、標籤與最近互動 */
export function matchesSearch(contact: Contact, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  const p = contact.payload;
  if ((p.name ?? "").toLowerCase().includes(needle)) return true;
  if ((p.company ?? "").toLowerCase().includes(needle)) return true;
  if (p.tags.some((t) => t.toLowerCase().includes(needle))) return true;
  if ((p.notes ?? "").toLowerCase().includes(needle)) return true;
  if ((p.title ?? "").toLowerCase().includes(needle)) return true;
  return false;
}

export function listContacts(state: AppState): Contact[] {
  const q = state.ui.searchQuery;
  const tag = state.ui.activeTag;
  return state.contacts
    .filter((c) => c.status === "active")
    .filter((c) => matchesSearch(c, q))
    .filter((c) => (tag ? c.payload.tags.includes(tag) : true));
}

export function sortContacts(
  contacts: Contact[],
  mode: AppState["ui"]["sortMode"],
  followups: Followup[] = [],
): Contact[] {
  const nextDueByContact = new Map<ID, number>();
  for (const f of followups) {
    if (f.status !== "pending") continue;
    const ts = new Date(f.dueDate).getTime();
    const cur = nextDueByContact.get(f.contactId);
    if (cur === undefined || ts < cur) nextDueByContact.set(f.contactId, ts);
  }
  const arr = [...contacts];
  switch (mode) {
    case "name":
      return arr.sort((a, b) => (a.payload.name ?? "").localeCompare(b.payload.name ?? ""));
    case "company":
      return arr.sort((a, b) => (a.payload.company ?? "").localeCompare(b.payload.company ?? ""));
    case "dueDate":
      return arr.sort((a, b) => {
        const da = nextDueByContact.get(a.id) ?? Number.POSITIVE_INFINITY;
        const db = nextDueByContact.get(b.id) ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    case "createdAt":
      return arr.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

/** 取得單一聯絡人的互動時間線 (FR-007 / AC-004), 由新到舊 */
export function getTimeline(
  contactId: ID,
  state: AppState,
): Array<TimelineEntry> {
  const interactions = state.interactions.filter((i) => i.contactId === contactId);
  const followups = state.followups
    .filter((f) => f.contactId === contactId && f.status === "done")
    .map((f) => ({ ...f, kind: "followup-done" as const }));
  const merged: TimelineEntry[] = [...interactions, ...followups];
  return merged.sort((a, b) => {
    const ts = (x: TimelineEntry): number => {
      if (x.kind === "followup-done") return new Date(x.completedAt ?? x.updatedAt).getTime();
      return new Date(x.occurredAt).getTime();
    };
    return ts(b) - ts(a);
  });
}

/** Discriminated guard */
export function isFollowupDoneEntry(x: TimelineEntry): x is FollowupEntry {
  return x.kind === "followup-done";
}

export function lastInteractionDate(contactId: ID, state: AppState): string | null {
  const tl = getTimeline(contactId, state);
  if (tl.length === 0) return null;
  const first = tl[0];
  if (!first) return null;
  if (isFollowupDoneEntry(first)) {
    return first.completedAt ?? first.updatedAt;
  }
  return first.occurredAt;
}

/** FR-008: 本地資料模式 */
export function isLocalOnly(state: AppState): boolean {
  return !state.plan.cloudSync;
}

/** AC-009: 刪除聯絡人同步刪除照片與互動內容 */
export function cascadeDeleteContact(state: AppState, contactId: ID): AppState {
  return {
    ...state,
    contacts: state.contacts.map((c) =>
      c.id === contactId ? { ...c, status: "deleted", updatedAt: new Date().toISOString() } : c,
    ),
    cardImages: state.cardImages.filter((img) => img.contactId !== contactId),
    exchanges: state.exchanges.filter((e) => e.contactId !== contactId),
    followups: state.followups.filter((f) => f.contactId !== contactId),
    interactions: state.interactions.filter((i) => i.contactId !== contactId),
    consents: state.consents.filter((co) => co.contactId !== contactId),
  };
}

/** 唯一 ID 生成(時間戳 + random) */
export function newId(prefix: string): ID {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 從 ExchangeEvent 建一個 Followup */
export function followupFromExchange(
  exchange: ExchangeEvent,
  contactId: ID,
  nextStep: string,
  dueDate: ISODate,
): Followup {
  const now = new Date().toISOString();
  return {
    id: newId("fu"),
    contactId,
    status: "pending",
    nextStep,
    dueDate,
    completedAt: null,
    nextCommitment: null,
    createdAt: now,
    updatedAt: now,
  };
}