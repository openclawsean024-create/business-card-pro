// GOAL.md M1 AC-005：Google 聯絡人 — mock 同步 adapter，零網路
// 只使用 MockGoogleContactsProvider（記憶體資料）與合成假資料；沒有 OAuth、沒有憑證。
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { useStore } from "@/lib/store";
import { emptyAppState, type Contact, type ContactPayload } from "@/lib/types";
import {
  MockGoogleContactsProvider,
  fieldsToPerson,
  personToRemote,
  type GooglePerson,
} from "@/lib/sync/mock-google";
import { detectConflicts, fieldsOf, matchKeys, pairContacts, syncContacts } from "@/lib/sync/sync";
import type { ContactSyncProvider } from "@/lib/sync/types";

const T0 = "2026-11-01T00:00:00.000Z"; // 上次同步
const T1 = "2026-11-05T00:00:00.000Z";
const T2 = "2026-11-10T00:00:00.000Z";

function payload(over: Partial<ContactPayload> = {}): ContactPayload {
  return {
    name: "測試 王小明",
    company: "範例科技股份有限公司",
    title: "業務經理",
    phone: "0900-000-001",
    email: "test01@example.com",
    address: null,
    website: null,
    notes: null,
    tags: ["客戶"],
    ocrConfidence: null,
    ocrLowConfidenceFields: [],
    ...over,
  };
}

let seq = 0;
function contact(over: Partial<ContactPayload> = {}, updatedAt = T0): Contact {
  seq += 1;
  return { id: `ct-sync-${seq}`, ownerId: null, status: "active", version: 1, createdAt: T0, updatedAt, payload: payload(over) };
}

function person(n: number, over: Partial<GooglePerson> = {}, updateTime = T0): GooglePerson {
  const id = String(n).padStart(2, "0");
  return {
    resourceName: `people/fake-${id}`,
    etag: `seed-${id}`,
    names: [{ displayName: `測試 遠端${id}` }],
    organizations: [{ name: "範例國際貿易有限公司", title: "專案經理" }],
    phoneNumbers: [{ value: `0900-000-0${id}` }],
    emailAddresses: [{ value: `remote${id}@example.com` }],
    metadata: { sources: [{ type: "CONTACT", updateTime }] },
    ...over,
  };
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("同步測試不得有任何網路呼叫");
  });
});
afterAll(() => {
  // AC-005：整個同步測試期間 fetch 呼叫次數為 0
  expect(fetchSpy).toHaveBeenCalledTimes(0);
  fetchSpy.mockRestore();
});
beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ ...emptyAppState() });
});

const store = () => useStore.getState();

describe("AC-005: ContactSyncProvider 介面與 mock provider", () => {
  it("AC-005: MockGoogleContactsProvider 實作 pull／push／listConflicts，並明確標示測試模式", async () => {
    const provider: ContactSyncProvider = new MockGoogleContactsProvider([person(11)]);
    expect(provider.isMock).toBe(true);
    expect(provider.label).toContain("測試模式");
    expect(provider.label).toContain("未連線 Google");
    expect(typeof provider.pull).toBe("function");
    expect(typeof provider.push).toBe("function");
    expect(typeof provider.listConflicts).toBe("function");
    expect(await provider.pull()).toHaveLength(1);
    expect(await provider.listConflicts([])).toEqual([]);
  });

  it("AC-005: pull 欄位對應 — People 形狀 → 本 app 欄位", async () => {
    const seed = person(12, {
      names: [{ displayName: "測試 林大華" }],
      organizations: [{ name: "範例設計工作室", title: "設計師" }],
      phoneNumbers: [{ value: "0900-000-012" }, { value: "02-0000-0012" }],
      emailAddresses: [{ value: "test12@example.com" }],
      addresses: [{ formattedValue: "100 台北市範例區測試路 12 號" }],
      urls: [{ value: "https://www.example.com" }],
      biographies: [{ value: "合成測試資料" }],
    }, T1);
    const [remote] = await new MockGoogleContactsProvider([seed]).pull();
    expect(remote).toEqual({
      remoteId: "people/fake-12",
      updatedAt: T1,
      fields: {
        name: "測試 林大華",
        company: "範例設計工作室",
        title: "設計師",
        phone: "0900-000-012",
        email: "test12@example.com",
        address: "100 台北市範例區測試路 12 號",
        website: "https://www.example.com",
        notes: "合成測試資料",
      },
    });
    // 缺欄位時為 null，不是空字串或 undefined
    expect(personToRemote({ resourceName: "people/x", etag: "e", metadata: { sources: [{ type: "CONTACT", updateTime: T0 }] } }).fields).toEqual({
      name: null, company: null, title: null, phone: null, email: null, address: null, website: null, notes: null,
    });
  });

  it("AC-005: push 欄位對應 — 本 app 欄位 → People 形狀；空欄位不輸出", async () => {
    const provider = new MockGoogleContactsProvider();
    const local = contact({ address: "100 台北市範例區測試路 1 號", website: "https://www.example.com", notes: "展會認識" }, T1);
    const result = await provider.push([local]);
    expect(result).toEqual({ created: 1, updated: 0, unchanged: 0 });
    const [created] = provider.snapshot();
    expect(created).toMatchObject({
      names: [{ displayName: "測試 王小明" }],
      organizations: [{ name: "範例科技股份有限公司", title: "業務經理" }],
      phoneNumbers: [{ value: "0900-000-001" }],
      emailAddresses: [{ value: "test01@example.com" }],
      addresses: [{ formattedValue: "100 台北市範例區測試路 1 號" }],
      urls: [{ value: "https://www.example.com" }],
      biographies: [{ value: "展會認識" }],
      metadata: { sources: [{ type: "CONTACT", updateTime: T1 }] },
    });
    const sparse = fieldsToPerson({ ...fieldsOf(payload({ company: null, title: null, phone: null })) }, "people/y", T0, "e");
    expect(sparse.organizations).toBeUndefined();
    expect(sparse.phoneNumbers).toBeUndefined();
    // 標籤與 OCR 中繼資料不同步
    expect(JSON.stringify(created)).not.toContain("客戶");
    expect(JSON.stringify(created)).not.toContain("ocr");
  });

  it("AC-005: push 不會重複新增 — 已存在者比對 Email／電話；內容相同為 unchanged，本機較新才更新", async () => {
    const provider = new MockGoogleContactsProvider();
    const local = contact({}, T1);
    await provider.push([local]);
    expect(await provider.push([local])).toEqual({ created: 0, updated: 0, unchanged: 1 });
    const edited = { ...local, updatedAt: T2, payload: payload({ title: "業務副理" }) };
    expect(await provider.push([edited])).toEqual({ created: 0, updated: 1, unchanged: 0 });
    expect(provider.snapshot()).toHaveLength(1);
    expect(provider.snapshot()[0]!.organizations?.[0]?.title).toBe("業務副理");
    // 已刪除的本機聯絡人不推送
    const deleted: Contact = { ...contact({ email: "gone@example.com", phone: "0900-000-090" }), status: "deleted" };
    expect(await provider.push([deleted])).toEqual({ created: 0, updated: 0, unchanged: 0 });
  });
});

describe("AC-005: 衝突規則 — 兩邊皆修改時以 updatedAt 較新者為準，另一版本列入衝突清單", () => {
  const remoteEdited = (updateTime: string) =>
    person(1, {
      names: [{ displayName: "測試 王小明" }],
      organizations: [{ name: "範例科技股份有限公司", title: "資深業務經理" }],
      phoneNumbers: [{ value: "0900-000-001" }],
      emailAddresses: [{ value: "TEST01@example.com" }],
    }, updateTime);

  it("AC-005: 遠端較新 → winner=remote，本機版本列為 discarded", async () => {
    const local = contact({ title: "業務副理" }, T1);
    const provider = new MockGoogleContactsProvider([remoteEdited(T2)], { lastSyncedAt: T0 });
    const conflicts = await provider.listConflicts([local]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      localId: local.id,
      remoteId: "people/fake-01",
      matchedBy: "email:test01@example.com",
      winner: "remote",
      localUpdatedAt: T1,
      remoteUpdatedAt: T2,
      differingFields: ["title", "email"],
    });
    expect(conflicts[0]!.discarded.title).toBe("業務副理");
    expect(conflicts[0]!.remote.title).toBe("資深業務經理");
  });

  it("AC-005: 本機較新 → winner=local，遠端版本列為 discarded", async () => {
    const local = contact({ title: "業務副理" }, T2);
    const provider = new MockGoogleContactsProvider([remoteEdited(T1)], { lastSyncedAt: T0 });
    const [conflict] = await provider.listConflicts([local]);
    expect(conflict!.winner).toBe("local");
    expect(conflict!.discarded.title).toBe("資深業務經理");
  });

  it("AC-005: 只有一邊修改、或內容相同 → 不是衝突", async () => {
    const provider = new MockGoogleContactsProvider([remoteEdited(T2)], { lastSyncedAt: T1 });
    // 本機在上次同步（T1）之前就沒再動過 → 只有遠端改過
    expect(await provider.listConflicts([contact({ title: "業務副理" }, T0)])).toEqual([]);
    // 內容相同（Email 大小寫不算差異以外的欄位都一樣）
    const same = new MockGoogleContactsProvider([person(1, { names: [{ displayName: "測試 王小明" }], organizations: [{ name: "範例科技股份有限公司", title: "業務經理" }], phoneNumbers: [{ value: "0900-000-001" }], emailAddresses: [{ value: "test01@example.com" }] }, T2)], { lastSyncedAt: T0 });
    expect(await same.listConflicts([contact({}, T1)])).toEqual([]);
    // 對不上任何人 → 不是衝突
    expect(detectConflicts([contact({ email: "other@example.com", phone: "0900-000-077" }, T2)], await provider.pull(), T0)).toEqual([]);
  });

  it("AC-005: 第一次同步（沒有上次同步時間）內容不同即列為衝突；配對以 Email 優先、其次電話", async () => {
    const byPhone = contact({ email: null, title: "業務副理" }, T1);
    const provider = new MockGoogleContactsProvider([remoteEdited(T2)]);
    expect(provider.lastSyncedAt).toBeNull();
    const [conflict] = await provider.listConflicts([byPhone]);
    expect(conflict!.matchedBy).toBe("tel:0900000001");
    expect(matchKeys(fieldsOf(payload({ email: " Test01@Example.com ", phone: "0900 000 001" })))).toEqual(["email:test01@example.com", "tel:0900000001"]);
    const { pairs, localOnly, remoteOnly } = pairContacts([byPhone, contact({ email: "solo@example.com", phone: null })], await provider.pull());
    expect(pairs).toHaveLength(1);
    expect(localOnly).toHaveLength(1);
    expect(remoteOnly).toHaveLength(0);
  });
});

describe("AC-005: syncContacts — pull、套用衝突結果、push", () => {
  it("AC-005: 遠端獨有 → 匯入本機；本機獨有 → 推到遠端；衝突依規則套用並回報", async () => {
    // 本機：甲（與遠端衝突、遠端較新）、乙（與遠端衝突、本機較新）、丙（本機獨有）
    store().importContacts([
      contact({ name: "測試 甲", email: "a@example.com", phone: "0900-000-021", title: "本機舊職稱" }, T1),
      contact({ name: "測試 乙", email: "b@example.com", phone: "0900-000-022", title: "本機新職稱" }, T2),
      contact({ name: "測試 丙", email: "c@example.com", phone: "0900-000-023" }, T1),
    ]);
    const provider = new MockGoogleContactsProvider(
      [
        person(21, { names: [{ displayName: "測試 甲" }], emailAddresses: [{ value: "a@example.com" }], phoneNumbers: [{ value: "0900-000-021" }], organizations: [{ name: "範例科技股份有限公司", title: "遠端新職稱" }] }, T2),
        person(22, { names: [{ displayName: "測試 乙" }], emailAddresses: [{ value: "b@example.com" }], phoneNumbers: [{ value: "0900-000-022" }], organizations: [{ name: "範例科技股份有限公司", title: "遠端舊職稱" }] }, T1),
        person(24),
      ],
      { lastSyncedAt: T0 },
    );

    const outcome = await syncContacts(provider, store, { now: () => "2026-11-16T00:00:00.000Z" });

    expect(outcome.provider).toEqual({ id: "mock-google-contacts", label: "Google 聯絡人（測試模式／未連線 Google）", isMock: true });
    expect(outcome.conflicts.map((c) => [c.local.name, c.winner])).toEqual([["測試 甲", "remote"], ["測試 乙", "local"]]);
    expect(outcome.pulled).toEqual({ imported: 1, duplicates: 0, notImported: 0, limit: 20 });
    expect(outcome.updatedLocal).toBe(1);
    expect(outcome.pushed).toEqual({ created: 1, updated: 1, unchanged: 2 });

    const byName = (name: string) => store().contacts.find((c) => c.payload.name === name)!;
    expect(byName("測試 甲").payload.title).toBe("遠端新職稱");
    // 套用遠端版本時保留本機才有的標籤
    expect(byName("測試 甲").payload.tags).toEqual(["客戶"]);
    expect(byName("測試 乙").payload.title).toBe("本機新職稱");
    expect(byName("測試 遠端24").payload.email).toBe("remote24@example.com");
    expect(store().contacts.filter((c) => c.status === "active")).toHaveLength(4);

    const remoteTitles = Object.fromEntries(provider.snapshot().map((p) => [p.names?.[0]?.displayName, p.organizations?.[0]?.title]));
    expect(remoteTitles["測試 乙"]).toBe("本機新職稱");
    expect(remoteTitles["測試 甲"]).toBe("遠端新職稱");
    expect(provider.snapshot()).toHaveLength(4);
    expect(provider.lastSyncedAt).toBe("2026-11-16T00:00:00.000Z");

    // 再同步一次：兩邊一致，沒有衝突也沒有新增
    const again = await syncContacts(provider, store);
    expect(again.conflicts).toEqual([]);
    expect(again.pulled.imported).toBe(0);
    expect(again.pushed).toEqual({ created: 0, updated: 0, unchanged: 4 });
  });

  it("AC-005: 只有遠端改過（非衝突）→ 更新本機，不列入衝突清單", async () => {
    store().importContacts([contact({ title: "舊職稱" }, T0)]);
    const provider = new MockGoogleContactsProvider(
      [person(1, { names: [{ displayName: "測試 王小明" }], emailAddresses: [{ value: "test01@example.com" }], phoneNumbers: [{ value: "0900-000-001" }], organizations: [{ name: "範例科技股份有限公司", title: "新職稱" }] }, T2)],
      { lastSyncedAt: T1 },
    );
    const outcome = await syncContacts(provider, store);
    expect(outcome.conflicts).toEqual([]);
    expect(outcome.updatedLocal).toBe(1);
    expect(store().contacts[0]!.payload.title).toBe("新職稱");
  });

  it("AC-006: mock 同步 pull 遵守 plan.maxContacts — 已有 19 筆、遠端 5 筆新聯絡人 → 20 筆，回報 4 筆未匯入", async () => {
    store().importContacts(
      Array.from({ length: 19 }, (_, i) => contact({ name: `測試 本機${i + 1}`, email: `local${i + 1}@example.com`, phone: `02-0000-00${String(i + 1).padStart(2, "0")}` })),
    );
    expect(store().contacts).toHaveLength(19);
    const provider = new MockGoogleContactsProvider([person(31), person(32), person(33), person(34), person(35)], { lastSyncedAt: T0 });

    const outcome = await syncContacts(provider, store);

    expect(outcome.pulled).toEqual({ imported: 1, duplicates: 0, notImported: 4, limit: 20 });
    expect(store().contacts.filter((c) => c.status === "active")).toHaveLength(20);
  });
});
