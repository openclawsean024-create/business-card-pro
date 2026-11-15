// GOAL.md M1 AC-005／AC-006：同步流程（與 provider 無關的純邏輯 + 套用到 store）
import { emailKey, phoneKey, type ImportResult } from "../contact-import";
import { newId } from "../domain";
import type { Contact, ContactPayload, ID, ISODate } from "../types";
import {
  SYNC_FIELDS,
  type ContactSyncProvider,
  type PushResult,
  type RemoteContact,
  type SyncConflict,
  type SyncFieldKey,
  type SyncFields,
} from "./types";

export function fieldsOf(payload: ContactPayload): SyncFields {
  const out = {} as SyncFields;
  for (const key of SYNC_FIELDS) out[key] = payload[key];
  return out;
}

/** 認定為同一人的鍵：Email（小寫）優先，其次電話（只取數字）；兩者皆無則無法比對 */
export function matchKeys(fields: SyncFields): string[] {
  const keys: string[] = [];
  const e = emailKey(fields.email);
  const p = phoneKey(fields.phone);
  if (e) keys.push(`email:${e}`);
  if (p) keys.push(`tel:${p}`);
  return keys;
}

export function diffFields(a: SyncFields, b: SyncFields): SyncFieldKey[] {
  return SYNC_FIELDS.filter((key) => (a[key] ?? "").trim() !== (b[key] ?? "").trim());
}

export interface MatchedPair {
  local: Contact;
  remote: RemoteContact;
  matchedBy: string;
}

/** 把本機與遠端聯絡人配對；每筆遠端最多配到一筆本機 */
export function pairContacts(
  local: Contact[],
  remote: RemoteContact[],
): { pairs: MatchedPair[]; localOnly: Contact[]; remoteOnly: RemoteContact[] } {
  const index = new Map<string, RemoteContact>();
  for (const r of remote) for (const key of matchKeys(r.fields)) if (!index.has(key)) index.set(key, r);
  const used = new Set<string>();
  const pairs: MatchedPair[] = [];
  const localOnly: Contact[] = [];
  for (const c of local.filter((x) => x.status === "active")) {
    const key = matchKeys(fieldsOf(c.payload)).find((k) => index.has(k) && !used.has(index.get(k)!.remoteId));
    const r = key ? index.get(key) : undefined;
    if (!key || !r) {
      localOnly.push(c);
      continue;
    }
    used.add(r.remoteId);
    pairs.push({ local: c, remote: r, matchedBy: key });
  }
  return { pairs, localOnly, remoteOnly: remote.filter((r) => !used.has(r.remoteId)) };
}

function changedSince(updatedAt: ISODate, lastSyncedAt: ISODate | null): boolean {
  return lastSyncedAt === null || new Date(updatedAt).getTime() > new Date(lastSyncedAt).getTime();
}

/**
 * 衝突判定：同一聯絡人、內容不同、且兩邊都在上次同步之後修改過。
 * 以 updatedAt 較新者為準（相同時以本機為準），另一版本列入 discarded。
 * 沒有上次同步時間（第一次同步）時，內容不同即視為兩邊都改過。
 */
export function detectConflicts(
  local: Contact[],
  remote: RemoteContact[],
  lastSyncedAt: ISODate | null,
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];
  for (const { local: c, remote: r, matchedBy } of pairContacts(local, remote).pairs) {
    const mine = fieldsOf(c.payload);
    const differingFields = diffFields(mine, r.fields);
    if (differingFields.length === 0) continue;
    if (!changedSince(c.updatedAt, lastSyncedAt) || !changedSince(r.updatedAt, lastSyncedAt)) continue;
    const winner = new Date(r.updatedAt).getTime() > new Date(c.updatedAt).getTime() ? "remote" : "local";
    conflicts.push({
      localId: c.id,
      remoteId: r.remoteId,
      matchedBy,
      winner,
      localUpdatedAt: c.updatedAt,
      remoteUpdatedAt: r.updatedAt,
      differingFields,
      local: mine,
      remote: r.fields,
      discarded: winner === "local" ? r.fields : mine,
    });
  }
  return conflicts;
}

export function remoteToContact(remote: RemoteContact): Contact {
  return {
    id: newId("sync"),
    ownerId: null,
    status: "active",
    version: 1,
    createdAt: remote.updatedAt,
    updatedAt: remote.updatedAt,
    payload: { ...remote.fields, tags: [], ocrConfidence: null, ocrLowConfidenceFields: [] },
  };
}

/** 同步需要的 store 操作（由 useStore.getState() 提供；獨立成介面方便測試） */
export interface SyncStore {
  contacts: Contact[];
  importContacts(contacts: Contact[]): ImportResult;
  updateContact(id: ID, payload: ContactPayload): { ok: boolean; error?: string };
}

export interface SyncOutcome {
  provider: { id: string; label: string; isMock: boolean };
  /** 遠端新聯絡人匯入本機的結果（遵守 plan.maxContacts） */
  pulled: ImportResult;
  /** 以遠端版本更新的本機聯絡人數 */
  updatedLocal: number;
  pushed: PushResult;
  /** 已依規則自動解決、但需要使用者確認的衝突（含被捨棄的版本） */
  conflicts: SyncConflict[];
}

/**
 * 雙向同步一次：
 *   1. pull；配對本機與遠端；
 *   2. 兩邊都改過 → 記入衝突，較新者勝；只有遠端改過 → 更新本機；
 *   3. 遠端獨有 → 經 store.importContacts 匯入（去重、遵守免費層上限）；
 *   4. push：本機獨有者新增到遠端、本機較新者更新遠端。
 */
export async function syncContacts(
  provider: ContactSyncProvider,
  getStore: () => SyncStore,
  options: { now?: () => ISODate } = {},
): Promise<SyncOutcome> {
  const lastSyncedAt = provider.lastSyncedAt;
  const remote = await provider.pull();
  const before = getStore().contacts;
  const conflicts = await provider.listConflicts(before);
  const remoteWins = new Set(conflicts.filter((c) => c.winner === "remote").map((c) => c.localId));
  const localWins = new Set(conflicts.filter((c) => c.winner === "local").map((c) => c.localId));

  const { pairs, remoteOnly } = pairContacts(before, remote);
  let updatedLocal = 0;
  for (const { local, remote: r } of pairs) {
    if (diffFields(fieldsOf(local.payload), r.fields).length === 0) continue;
    const remoteChanged = changedSince(r.updatedAt, lastSyncedAt);
    const localChanged = changedSince(local.updatedAt, lastSyncedAt);
    const takeRemote = remoteWins.has(local.id) || (!localWins.has(local.id) && remoteChanged && !localChanged);
    if (!takeRemote) continue;
    const result = getStore().updateContact(local.id, { ...local.payload, ...r.fields });
    if (result.ok) updatedLocal += 1;
  }

  const pulled = getStore().importContacts(remoteOnly.map(remoteToContact));
  const pushed = await provider.push(getStore().contacts);
  provider.markSynced((options.now ?? (() => new Date().toISOString()))());

  return {
    provider: { id: provider.id, label: provider.label, isMock: provider.isMock },
    pulled,
    updatedLocal,
    pushed,
    conflicts,
  };
}
