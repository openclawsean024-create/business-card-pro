// GOAL.md M1 AC-004：Google 聯絡人 — 檔案互通（CSV／vCard），全部使用合成假資料
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useStore } from "@/lib/store";
import { emptyAppState, type Contact, type ContactPayload } from "@/lib/types";
import { exportCSV, exportVCards } from "@/lib/export";
import {
  GOOGLE_CSV_FIELD_MAP,
  GOOGLE_CSV_HEADERS,
  exportGoogleCSV,
  isGoogleCSV,
  parseContactsFile,
  parseCsvRows,
  parseGoogleCSV,
  parseVCards,
} from "@/lib/google-contacts";
import { describeImport, planImport } from "@/lib/contact-import";

const FIXTURES = join(process.cwd(), "src/test/fixtures/google-contacts");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

function payload(over: Partial<ContactPayload> = {}): ContactPayload {
  return {
    name: "測試 王小明",
    company: "範例科技股份有限公司",
    title: "業務經理",
    phone: "0900-000-001",
    email: "test01@example.com",
    address: "100 台北市範例區測試路 1 號 2 樓",
    website: "https://www.example.com",
    notes: "展會認識, 想看「報價」\n第二行",
    tags: ["客戶", "展會"],
    ocrConfidence: null,
    ocrLowConfidenceFields: [],
    ...over,
  };
}

let seq = 0;
function contact(over: Partial<ContactPayload> = {}, extra: Partial<Contact> = {}): Contact {
  seq += 1;
  return {
    id: `ct-test-${seq}`,
    ownerId: null,
    status: "active",
    version: 1,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    payload: payload(over),
    ...extra,
  };
}

/** 比對時忽略 id／時間等每次匯入都會重新產生的欄位 */
const fieldsOnly = (c: Contact) => c.payload;

let fetchSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ ...emptyAppState() });
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("測試中不得有網路呼叫");
  });
});
afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

describe("AC-004(a): 匯出 Google 聯絡人可匯入的 CSV", () => {
  it("AC-004: 標頭為 Google CSV 欄位，且每個 app 欄位都有對照", () => {
    const csv = exportGoogleCSV([contact()]);
    const [header] = parseCsvRows(csv);
    expect(header).toEqual([...GOOGLE_CSV_HEADERS]);
    expect(GOOGLE_CSV_FIELD_MAP).toEqual({
      name: "First Name",
      company: "Organization Name",
      title: "Organization Title",
      phone: "Phone 1 - Value",
      email: "E-mail 1 - Value",
      address: "Address 1 - Formatted",
      website: "Website 1 - Value",
      notes: "Notes",
      tags: "Labels",
    });
    for (const column of Object.values(GOOGLE_CSV_FIELD_MAP)) expect(header).toContain(column);
  });

  it("AC-004: 欄位對照 — 每個值落在正確的 Google 欄位，多值以 ::: 分隔", () => {
    const rows = parseCsvRows(exportGoogleCSV([contact()]));
    const header = rows[0]!;
    const row = rows[1]!;
    const cell = (name: string) => row[header.indexOf(name)];
    expect(cell("First Name")).toBe("測試 王小明");
    expect(cell("Organization Name")).toBe("範例科技股份有限公司");
    expect(cell("Organization Title")).toBe("業務經理");
    expect(cell("Phone 1 - Value")).toBe("0900-000-001");
    expect(cell("Phone 1 - Label")).toBe("Mobile");
    expect(cell("E-mail 1 - Value")).toBe("test01@example.com");
    expect(cell("Address 1 - Formatted")).toBe("100 台北市範例區測試路 1 號 2 樓");
    expect(cell("Website 1 - Value")).toBe("https://www.example.com");
    expect(cell("Notes")).toBe("展會認識, 想看「報價」\n第二行");
    expect(cell("Labels")).toBe("客戶 ::: 展會 ::: * myContacts");
  });

  it("AC-004: 逗號、引號、換行正確跳脫；已刪除的聯絡人不匯出；市話標為 Work", () => {
    const csv = exportGoogleCSV([
      contact({ company: '範例 "引號", 有限公司', phone: "02-0000-0009", notes: null }),
      contact({ name: "測試 已刪除" }, { status: "deleted" }),
    ]);
    const rows = parseCsvRows(csv);
    expect(rows).toHaveLength(2);
    const header = rows[0]!;
    expect(rows[1]![header.indexOf("Organization Name")]).toBe('範例 "引號", 有限公司');
    expect(rows[1]![header.indexOf("Phone 1 - Label")]).toBe("Work");
    expect(csv).not.toContain("測試 已刪除");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("AC-004: 往返（export → import）後欄位一致", () => {
  it("AC-004: Google CSV 往返 — 九個欄位全部一致", () => {
    const originals = [
      contact(),
      contact({ name: "Test Alex Chen", company: "Example Trading Inc.", title: "Sales Manager", phone: "02-0000-0002", email: "alex.chen@example.com", address: null, website: null, notes: null, tags: [] }),
      contact({ name: null, company: "範例設計工作室", title: null, phone: null, email: "studio@example.com", tags: ["供應商"] }),
    ];
    const { contacts: back, skipped } = parseGoogleCSV(exportGoogleCSV(originals));
    expect(skipped).toBe(0);
    expect(back.map(fieldsOnly)).toEqual(originals.map(fieldsOnly));
  });

  it("AC-004: vCard 3.0 往返（本 app 匯出 → 匯入）— 欄位一致", () => {
    const originals = [
      contact(),
      contact({ name: "Test Alex Chen", company: "Example Trading Inc.", title: "Sales Manager", phone: "02-0000-0002", email: "alex.chen@example.com", address: null, website: null, notes: null, tags: [] }),
    ];
    const vcf = exportVCards(originals, { interactions: [], followups: [] });
    const { contacts: back } = parseVCards(vcf);
    expect(back.map(fieldsOnly)).toEqual(originals.map(fieldsOnly));
  });
});

describe("AC-004(b): 匯入 Google 聯絡人匯出的檔案", () => {
  it("AC-004: 新版 Google CSV — 姓名合併、多值取第一個、系統標籤略過", () => {
    const text = fixture("google-export-new.csv");
    expect(isGoogleCSV(text)).toBe(true);
    const { contacts, skipped } = parseGoogleCSV(text);
    expect(skipped).toBe(1);
    expect(contacts).toHaveLength(3);
    expect(contacts[0]!.payload).toEqual({
      name: "測試王小明",
      company: "範例科技股份有限公司",
      title: "業務經理",
      phone: "0900-000-001",
      email: "test01@example.com",
      address: "100 台北市範例區測試路 1 號 2 樓",
      website: "www.example.com",
      notes: "展會認識, 想看報價\n第二行備註",
      tags: ["客戶", "展會"],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    });
    expect(contacts[1]!.payload.name).toBe("Test Alex Chen");
    expect(contacts[1]!.payload.email).toBe("Alex.Chen@Example.com");
    expect(contacts[1]!.payload.tags).toEqual([]);
    expect(contacts[2]!.payload.name).toBeNull();
    expect(contacts[2]!.payload.company).toBe("範例設計工作室");
    expect(contacts[2]!.payload.tags).toEqual(["供應商"]);
    for (const c of contacts) {
      expect(c.status).toBe("active");
      expect(c.ownerId).toBeNull();
    }
  });

  it("AC-004: 舊版 Google CSV 標頭（Name／Organization 1 - Name／Group Membership）也能讀", () => {
    const text = fixture("google-export-legacy.csv");
    expect(isGoogleCSV(text)).toBe(true);
    const { contacts, skipped } = parseGoogleCSV(text);
    expect(skipped).toBe(0);
    expect(contacts.map((c) => c.payload.name)).toEqual(["測試 林大華", "Test Bella Lin"]);
    expect(contacts[0]!.payload).toMatchObject({
      company: "範例國際貿易有限公司",
      title: "專案經理",
      phone: "0900-000-004",
      email: "test04@example.com",
      website: "https://www.example.com",
      notes: "舊版匯出檔",
      tags: ["客戶"],
    });
    expect(contacts[1]!.payload).toMatchObject({ company: "Example Design Studio", title: "Product Designer", phone: "02-0000-0005" });
  });

  it("AC-004: vCard 3.0 — 群組前綴、行折疊、跳脫字元、手機優先、CATEGORIES", () => {
    const { contacts, skipped } = parseVCards(fixture("google-export.vcf"));
    expect(skipped).toBe(1);
    expect(contacts).toHaveLength(2);
    expect(contacts[0]!.payload).toEqual({
      name: "測試 王小明",
      company: "範例科技股份有限公司",
      title: "業務經理",
      phone: "0900-000-001",
      email: "test01@example.com",
      address: "測試路 1 號 2 樓 台北市 100 台灣",
      website: "https://www.example.com",
      notes: "展會認識, 想看報價\n第二行備註；這一行很長所以會被折疊成兩行",
      tags: ["客戶", "展會"],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    });
    // 沒有 FN 時由 N 組出姓名
    expect(contacts[1]!.payload).toMatchObject({
      name: "Test Alex Chen",
      company: "Example Trading Inc.",
      title: "Sales Manager",
      phone: "02-0000-0002",
      email: "alex.chen@example.com",
    });
  });

  it("AC-004: parseContactsFile 依內容自動判斷 vCard／Google CSV／本 app CSV", () => {
    expect(parseContactsFile(fixture("google-export.vcf")).format).toBe("vcard");
    expect(parseContactsFile(fixture("google-export-new.csv")).format).toBe("google-csv");
    const own = exportCSV([contact()], { interactions: [], followups: [] });
    // 多一列只有電話（沒有姓名也沒有公司）、一列全空、以及結尾空行
    const parsed = parseContactsFile(`${own}\n,,,0900-000-099,,,,,,\n,,,,,,,,,\n`);
    expect(parsed.format).toBe("app-csv");
    // 空白列不會變成空白聯絡人；沒有姓名與公司的列計入 skipped
    expect(parsed.contacts).toHaveLength(1);
    expect(parsed.skipped).toBe(1);
    // 備註裡的逗號與換行能完整讀回
    expect(parsed.contacts[0]!.payload).toEqual(payload());
  });
});

describe("AC-004(c): 匯入時以 Email（小寫）或電話（只取數字）去重並回報筆數", () => {
  it("AC-004: Email 大小寫不同、電話格式不同都視為重複", () => {
    const existing = [contact({ email: "test01@example.com", phone: "0900-000-001" })];
    const incoming = [
      contact({ name: "測試 重複甲", email: "TEST01@Example.com", phone: null }),
      contact({ name: "測試 重複乙", email: null, phone: "0900 000 001" }),
      contact({ name: "測試 重複丙", email: null, phone: "０９００－０００－００１" }),
      contact({ name: "測試 新的", email: "test02@example.com", phone: "0900-000-002" }),
    ];
    const plan = planImport(existing, incoming, 20);
    expect(plan.duplicates).toBe(3);
    expect(plan.toAdd.map((c) => c.payload.name)).toEqual(["測試 新的"]);
    expect(plan.overLimit).toBe(0);
  });

  it("AC-004: 同一批檔案內的重複也只留一筆；沒有 Email 與電話的聯絡人不會被誤判為重複", () => {
    const incoming = [
      contact({ name: "測試 甲", email: "same@example.com", phone: null }),
      contact({ name: "測試 乙", email: "SAME@example.com", phone: null }),
      contact({ name: "測試 丙", email: null, phone: null }),
      contact({ name: "測試 丁", email: null, phone: null }),
    ];
    const plan = planImport([], incoming, 20);
    expect(plan.duplicates).toBe(1);
    expect(plan.toAdd.map((c) => c.payload.name)).toEqual(["測試 甲", "測試 丙", "測試 丁"]);
  });

  it("AC-004: 已刪除的聯絡人不列入去重（刪除後可以重新匯入）", () => {
    const deleted = contact({ email: "gone@example.com" }, { status: "deleted" });
    const plan = planImport([deleted], [contact({ email: "gone@example.com", phone: null })], 20);
    expect(plan.duplicates).toBe(0);
    expect(plan.toAdd).toHaveLength(1);
  });

  it("AC-004: 重複匯入同一份 Google CSV — 第二次全部判為重複，store 不增加", () => {
    const text = fixture("google-export-new.csv");
    const first = useStore.getState().importContacts(parseContactsFile(text).contacts);
    expect(first).toEqual({ imported: 3, duplicates: 0, notImported: 0, limit: 20 });
    const second = useStore.getState().importContacts(parseContactsFile(text).contacts);
    expect(second).toEqual({ imported: 0, duplicates: 3, notImported: 0, limit: 20 });
    expect(useStore.getState().contacts).toHaveLength(3);
    expect(describeImport(second)).toBe("匯入 0 筆；3 筆重複（Email 或電話相同）未新增");
  });

  it("AC-004: Google CSV 與 vCard 是同一批人時，跨格式也會去重", () => {
    useStore.getState().importContacts(parseContactsFile(fixture("google-export-new.csv")).contacts);
    const result = useStore.getState().importContacts(parseContactsFile(fixture("google-export.vcf")).contacts);
    // vCard 的兩筆（test01@、alex.chen@）都已存在
    expect(result.imported).toBe(0);
    expect(result.duplicates).toBe(2);
  });
});
