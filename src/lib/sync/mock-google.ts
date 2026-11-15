// GOAL.md M1 AC-005：MockGoogleContactsProvider — 記憶體資料、零網路
//
// 這不是 Google 的 client：沒有 OAuth、沒有 fetch、沒有任何憑證。
// 資料形狀仿照 Google People API 的 Person（names、organizations、phoneNumbers…），
// 目的是在 M1 先把欄位對應與衝突規則固定下來；M3 接真實 API 時換掉這個 provider 即可。
import type { Contact, ISODate } from "../types";
import { detectConflicts, diffFields, fieldsOf, matchKeys, pairContacts } from "./sync";
import type { ContactSyncProvider, PushResult, RemoteContact, SyncConflict, SyncFields } from "./types";

/** People API Person 的子集（只列出本 app 會對應的欄位） */
export interface GooglePerson {
  resourceName: string;
  etag: string;
  names?: Array<{ displayName: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  phoneNumbers?: Array<{ value: string }>;
  emailAddresses?: Array<{ value: string }>;
  addresses?: Array<{ formattedValue: string }>;
  urls?: Array<{ value: string }>;
  biographies?: Array<{ value: string }>;
  metadata: { sources: Array<{ type: "CONTACT"; updateTime: ISODate }> };
}

const blank = (v: string | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** pull 的欄位對應：Person → 本 app 欄位 */
export function personToRemote(person: GooglePerson): RemoteContact {
  const org = person.organizations?.[0];
  return {
    remoteId: person.resourceName,
    updatedAt: person.metadata.sources[0]?.updateTime ?? new Date(0).toISOString(),
    fields: {
      name: blank(person.names?.[0]?.displayName),
      company: blank(org?.name),
      title: blank(org?.title),
      phone: blank(person.phoneNumbers?.[0]?.value),
      email: blank(person.emailAddresses?.[0]?.value),
      address: blank(person.addresses?.[0]?.formattedValue),
      website: blank(person.urls?.[0]?.value),
      notes: blank(person.biographies?.[0]?.value),
    },
  };
}

/** push 的欄位對應：本 app 欄位 → Person；空欄位不輸出 */
export function fieldsToPerson(fields: SyncFields, resourceName: string, updateTime: ISODate, etag: string): GooglePerson {
  const person: GooglePerson = { resourceName, etag, metadata: { sources: [{ type: "CONTACT", updateTime }] } };
  if (fields.name) person.names = [{ displayName: fields.name }];
  if (fields.company || fields.title) {
    person.organizations = [{ ...(fields.company ? { name: fields.company } : {}), ...(fields.title ? { title: fields.title } : {}) }];
  }
  if (fields.phone) person.phoneNumbers = [{ value: fields.phone }];
  if (fields.email) person.emailAddresses = [{ value: fields.email }];
  if (fields.address) person.addresses = [{ formattedValue: fields.address }];
  if (fields.website) person.urls = [{ value: fields.website }];
  if (fields.notes) person.biographies = [{ value: fields.notes }];
  return person;
}

export class MockGoogleContactsProvider implements ContactSyncProvider {
  readonly id = "mock-google-contacts";
  readonly label = "Google 聯絡人（測試模式／未連線 Google）";
  readonly isMock = true;

  private people = new Map<string, GooglePerson>();
  private syncedAt: ISODate | null;
  private seq = 0;

  constructor(seed: GooglePerson[] = [], options: { lastSyncedAt?: ISODate | null } = {}) {
    for (const person of seed) this.people.set(person.resourceName, structuredClone(person));
    this.syncedAt = options.lastSyncedAt ?? null;
  }

  get lastSyncedAt(): ISODate | null {
    return this.syncedAt;
  }

  async pull(): Promise<RemoteContact[]> {
    return [...this.people.values()].map(personToRemote);
  }

  async push(contacts: Contact[]): Promise<PushResult> {
    const result: PushResult = { created: 0, updated: 0, unchanged: 0 };
    const remote = await this.pull();
    const { pairs, localOnly } = pairContacts(contacts, remote);
    for (const { local, remote: r } of pairs) {
      const mine = fieldsOf(local.payload);
      const newer = new Date(local.updatedAt).getTime() >= new Date(r.updatedAt).getTime();
      if (diffFields(mine, r.fields).length === 0 || !newer) {
        result.unchanged += 1;
        continue;
      }
      this.people.set(r.remoteId, fieldsToPerson(mine, r.remoteId, local.updatedAt, this.nextEtag()));
      result.updated += 1;
    }
    for (const local of localOnly) {
      const mine = fieldsOf(local.payload);
      // 沒有 Email 也沒有電話的聯絡人下次無法配對，不推送以免每次同步都重複新增
      if (matchKeys(mine).length === 0) {
        result.unchanged += 1;
        continue;
      }
      const resourceName = `people/mock-${String(this.people.size + 1).padStart(4, "0")}-${this.seq}`;
      this.people.set(resourceName, fieldsToPerson(mine, resourceName, local.updatedAt, this.nextEtag()));
      result.created += 1;
    }
    return result;
  }

  async listConflicts(local: Contact[]): Promise<SyncConflict[]> {
    return detectConflicts(local, await this.pull(), this.syncedAt);
  }

  markSynced(at: ISODate): void {
    this.syncedAt = at;
  }

  /** 測試用：目前的記憶體資料（複本） */
  snapshot(): GooglePerson[] {
    return [...this.people.values()].map((p) => structuredClone(p));
  }

  private nextEtag(): string {
    this.seq += 1;
    return `mock-etag-${this.seq}`;
  }
}
