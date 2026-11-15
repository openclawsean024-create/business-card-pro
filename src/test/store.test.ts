// store 整合測試: §3.1 FR-001 ~ FR-010 對應
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";
import { emptyAppState, STORAGE_KEY } from "@/lib/types";

beforeEach(() => {
  if (typeof window !== "undefined") window.localStorage.clear();
  // 重置 store 到初始狀態
  useStore.setState({ ...emptyAppState() });
});

describe("FR-001 / FR-008: 手動建立聯絡人 + 本地資料模式", () => {
  it("手動建立聯絡人成功, ownerId 為 null(本地模式)", () => {
    const r = useStore.getState().addContact({
      name: "王小明",
      company: "國泰",
      title: null,
      phone: null,
      email: null,
      address: null,
      website: null,
      notes: null,
      tags: [],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    });
    expect(r.contact.ownerId).toBeNull();
    expect(useStore.getState().contacts).toHaveLength(1);
  });
  it("建立時同時建 exchange + followup", () => {
    const r = useStore.getState().addContact(
      {
        name: "林大華",
        company: "台積",
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      { source: "活動", context: "展會", nextStep: "寄 DM", dueDate: new Date().toISOString() },
    );
    expect(useStore.getState().exchanges).toHaveLength(1);
    expect(useStore.getState().followups).toHaveLength(1);
    expect(r.followup).toBeTruthy();
  });
  it("AC-001: 姓名公司都空時 throw", () => {
    expect(() =>
      useStore.getState().addContact({
        name: null,
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      }),
    ).toThrow(/AC-001/);
  });
  it("免費層 20 張上限會 throw", () => {
    for (let i = 0; i < 20; i++) {
      useStore.getState().addContact({
        name: `p-${i}`,
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      });
    }
    expect(() =>
      useStore.getState().addContact({
        name: "第21個",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      }),
    ).toThrow();
  });
});

describe("FR-003: 完成回訪產生互動紀錄", () => {
  it("completeFollowup 標記 done + 寫入 interactions", () => {
    const r = useStore.getState().addContact(
      {
        name: "張三",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      { nextStep: "call", dueDate: new Date().toISOString() },
    );
    expect(r.followup).toBeTruthy();
    useStore.getState().completeFollowup(r.followup!.id, "已致電", "下週見面");
    const fu = useStore.getState().followups[0];
    expect(fu?.status).toBe("done");
    expect(fu?.completedAt).toBeTruthy();
    expect(useStore.getState().interactions).toHaveLength(1);
    expect(useStore.getState().interactions[0]?.summary).toBe("已致電");
  });
});

describe("FR-009 / AC-009: 刪除聯絡人同步清除", () => {
  it("deleteContact 移除所有相關", () => {
    const r = useStore.getState().addContact(
      {
        name: "李四",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      { nextStep: "x", dueDate: new Date().toISOString() },
    );
    useStore.getState().deleteContact(r.contact.id);
    const s = useStore.getState();
    expect(s.contacts[0]?.status).toBe("deleted");
    expect(s.followups).toHaveLength(0);
    expect(s.exchanges).toHaveLength(0);
  });
});

describe("localStorage 持久化", () => {
  it("subscribe 寫入 STORAGE_KEY", () => {
    useStore.getState().addContact({
      name: "persist-test",
      company: null,
      title: null,
      phone: null,
      email: null,
      address: null,
      website: null,
      notes: null,
      tags: [],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.contacts[0]?.payload.name).toBe("persist-test");
  });
});

// ── GOAL.md M1 AC-006：免費層上限不可被匯入繞過 ──────────────────────────────
import { parseContactsFile } from "@/lib/google-contacts";
import { describeImport } from "@/lib/contact-import";
import type { Contact } from "@/lib/types";

function fakeContact(n: number): Contact {
  const id = String(n).padStart(2, "0");
  return {
    id: `ct-limit-${id}`,
    ownerId: null,
    status: "active",
    version: 1,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    payload: {
      name: `測試 聯絡人${id}`,
      company: "範例科技股份有限公司",
      title: null,
      phone: `0900-000-0${id}`,
      email: `test${id}@example.com`,
      address: null,
      website: null,
      notes: null,
      tags: [],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    },
  };
}

function seedContacts(count: number) {
  for (let i = 1; i <= count; i++) {
    useStore.getState().addContact(fakeContact(i).payload);
  }
}

describe("AC-006: 免費層上限不可被匯入繞過 (FR-010)", () => {
  it("AC-006: 已有 19 筆時匯入 5 筆 → 結果為 20 筆、回報 4 筆未匯入", () => {
    seedContacts(19);
    const incoming = [41, 42, 43, 44, 45].map(fakeContact);
    const result = useStore.getState().importContacts(incoming);
    expect(result).toEqual({ imported: 1, duplicates: 0, notImported: 4, limit: 20 });
    const active = useStore.getState().contacts.filter((c) => c.status === "active");
    expect(active).toHaveLength(20);
    // 依檔案順序匯入到上限為止
    expect(active.some((c) => c.payload.email === "test41@example.com")).toBe(true);
    expect(active.some((c) => c.payload.email === "test42@example.com")).toBe(false);
    expect(describeImport(result)).toBe("匯入 1 筆；4 筆因超過方案上限 20 張未匯入");
  });

  it("AC-006: CSV 匯入（本 app 格式與 Google CSV）都不能超過上限", () => {
    seedContacts(19);
    const appCsv = [
      "# business-card-pro export",
      "# schema-version: 2",
      "name,company,title,phone,email,address,website,notes,tags,lastInteraction",
      ...[51, 52, 53, 54, 55].map((n) => `測試 匯入${n},範例貿易有限公司,,0900-000-0${n},import${n}@example.com,,,,,`),
    ].join("\n");
    const first = useStore.getState().importContacts(parseContactsFile(appCsv).contacts);
    expect(first).toEqual({ imported: 1, duplicates: 0, notImported: 4, limit: 20 });

    const googleCsv = [
      "First Name,Last Name,Organization Name,E-mail 1 - Value,Phone 1 - Value",
      ...[61, 62, 63].map((n) => `Test Import${n},,Example Trading Inc.,g${n}@example.com,0900-000-0${n}`),
    ].join("\r\n");
    const second = useStore.getState().importContacts(parseContactsFile(googleCsv).contacts);
    expect(second).toEqual({ imported: 0, duplicates: 0, notImported: 3, limit: 20 });
    expect(useStore.getState().contacts.filter((c) => c.status === "active")).toHaveLength(20);
  });

  it("AC-006: vCard 匯入也遵守上限", () => {
    seedContacts(18);
    const vcf = [71, 72, 73, 74]
      .map((n) => ["BEGIN:VCARD", "VERSION:3.0", `FN:測試 名片${n}`, "ORG:範例設計工作室", `TEL;TYPE=CELL:0900-000-0${n}`, `EMAIL:v${n}@example.com`, "END:VCARD"].join("\r\n"))
      .join("\r\n");
    const result = useStore.getState().importContacts(parseContactsFile(vcf).contacts);
    expect(result).toEqual({ imported: 2, duplicates: 0, notImported: 2, limit: 20 });
    expect(useStore.getState().contacts.filter((c) => c.status === "active")).toHaveLength(20);
  });

  it("AC-006: 重複的資料不佔名額；已刪除的聯絡人不計入上限", () => {
    seedContacts(20);
    const victim = useStore.getState().contacts.find((c) => c.payload.email === "test20@example.com")!;
    useStore.getState().deleteContact(victim.id);
    // 19 筆 active；匯入 3 筆，其中第 1 筆與既有 test01@ 重複
    const result = useStore.getState().importContacts([fakeContact(1), fakeContact(81), fakeContact(82)].map((c, i) => ({ ...c, id: `ct-dup-${i}` })));
    expect(result).toEqual({ imported: 1, duplicates: 1, notImported: 1, limit: 20 });
    expect(useStore.getState().contacts.filter((c) => c.status === "active")).toHaveLength(20);
  });

  it("AC-006: 匯入後手動新增仍受上限限制", () => {
    seedContacts(15);
    useStore.getState().importContacts([91, 92, 93, 94, 95, 96, 97].map(fakeContact));
    expect(useStore.getState().contacts.filter((c) => c.status === "active")).toHaveLength(20);
    expect(() => useStore.getState().addContact(fakeContact(98).payload)).toThrow(/上限/);
  });
});
