// §3.4 AC-001 ~ AC-010 對應的單元測試
import { describe, it, expect } from "vitest";
import {
  validateContactPayload,
  isFollowupDueToday,
  isFollowupOverdue,
  getTodayQueue,
  matchesSearch,
  listContacts,
  cascadeDeleteContact,
  followupFromExchange,
  lastInteractionDate,
  getTimeline,
} from "@/lib/domain";
import {
  buildVCard,
  exportVCards,
  exportCSV,
  parseCSV,
  CSV_FIELDS,
  EXPORT_SCHEMA_VERSION,
} from "@/lib/export";
import type {
  AppState,
  Contact,
  ContactPayload,
  ExchangeEvent,
  Followup,
  Interaction,
} from "@/lib/types";
import { emptyAppState } from "@/lib/types";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? "ct-1",
    ownerId: null,
    status: "active",
    version: 1,
    createdAt: now,
    updatedAt: now,
    payload: {
      name: "王小明",
      company: "國泰人壽",
      title: "業務副理",
      phone: "0912-345-678",
      email: "ming@example.com",
      address: null,
      website: null,
      notes: null,
      tags: ["保險"],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    },
    ...overrides,
  };
}

function makeFollowup(overrides: Partial<Followup> = {}): Followup {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? "fu-1",
    contactId: "ct-1",
    status: "pending",
    nextStep: "寄 DM",
    dueDate: now,
    completedAt: null,
    nextCommitment: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeBaseState(overrides: Partial<AppState> = {}): AppState {
  return { ...emptyAppState(), ...overrides };
}

describe("AC-001: 建立聯絡人必填姓名或公司其中一項", () => {
  it("通過: 只填姓名", () => {
    const p: ContactPayload = {
      name: "王小明",
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
    };
    expect(validateContactPayload(p)).toBeNull();
  });
  it("通過: 只填公司", () => {
    const p: ContactPayload = {
      name: null,
      company: "台積電",
      title: null,
      phone: null,
      email: null,
      address: null,
      website: null,
      notes: null,
      tags: [],
      ocrConfidence: null,
      ocrLowConfidenceFields: [],
    };
    expect(validateContactPayload(p)).toBeNull();
  });
  it("失敗: 姓名公司都空", () => {
    const p: ContactPayload = {
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
    };
    expect(validateContactPayload(p)).toMatch(/AC-001/);
  });
});

describe("AC-002: 交換事件可建 follow-up + dueDate", () => {
  it("followupFromExchange 產生 status=pending 與正確 dueDate", () => {
    const ex: ExchangeEvent = {
      id: "ex-1",
      contactId: "ct-1",
      source: "名片",
      context: "會議",
      notes: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const due = "2026-12-01T00:00:00.000Z";
    const fu = followupFromExchange(ex, "ct-1", "寄 DM", due);
    expect(fu.status).toBe("pending");
    expect(fu.dueDate).toBe(due);
    expect(fu.nextStep).toBe("寄 DM");
    expect(fu.contactId).toBe("ct-1");
  });
});

describe("AC-003: 今日 queue 只顯示未完成且到期事件", () => {
  const today = new Date("2026-08-08T10:00:00Z");
  it("排除已完成", () => {
    const fu = makeFollowup({ status: "done", dueDate: today.toISOString() });
    expect(getTodayQueue([fu], [], today)).toHaveLength(0);
  });
  it("包含今天到期的 pending", () => {
    const fu = makeFollowup({ dueDate: today.toISOString() });
    expect(getTodayQueue([fu], [], today)).toHaveLength(1);
  });
  it("包含昨天逾期的 pending", () => {
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const fu = makeFollowup({ dueDate: yesterday.toISOString() });
    expect(getTodayQueue([fu], [], today)).toHaveLength(1);
    expect(isFollowupOverdue(fu, today)).toBe(true);
  });
  it("排除未到期的未來事件", () => {
    const future = new Date(today.getTime() + 5 * 24 * 3600 * 1000);
    const fu = makeFollowup({ dueDate: future.toISOString() });
    expect(getTodayQueue([fu], [], today)).toHaveLength(0);
  });
  it("isFollowupDueToday 邊界: 23:59 vs 隔天 00:00", () => {
    const lateToday = new Date("2026-08-08T15:59:00Z");
    const tomorrow = new Date("2026-08-09T00:00:00Z");
    expect(isFollowupDueToday(makeFollowup({ dueDate: lateToday.toISOString() }), today)).toBe(true);
    expect(isFollowupDueToday(makeFollowup({ dueDate: tomorrow.toISOString() }), today)).toBe(false);
  });
});

describe("AC-004: 完成回訪後保留時間戳與備註", () => {
  it("getTimeline 包含完成 follow-up 與 summary", () => {
    const c = makeContact();
    const now = new Date().toISOString();
    const fu: Followup = {
      id: "fu-1",
      contactId: c.id,
      status: "done",
      nextStep: "寄 DM",
      dueDate: now,
      completedAt: now,
      nextCommitment: null,
      createdAt: now,
      updatedAt: now,
    };
    const it: Interaction = {
      id: "it-1",
      contactId: c.id,
      kind: "call",
      summary: "已寄 DM, 約下週見",
      nextCommitment: "下週見面",
      occurredAt: now,
      createdAt: now,
    };
    const state = makeBaseState({ contacts: [c], followups: [fu], interactions: [it] });
    const tl = getTimeline(c.id, state);
    expect(tl.length).toBeGreaterThanOrEqual(2);
    const fuEntry = tl.find((x) => x.kind === "followup-done");
    expect(fuEntry).toBeTruthy();
    if (fuEntry && fuEntry.kind === "followup-done") {
      expect(fuEntry.completedAt).toBe(now);
      expect(fuEntry.nextStep).toBe("寄 DM");
    }
    const itEntry = tl.find((x) => x.kind === "call");
    expect(itEntry).toBeTruthy();
    if (itEntry && itEntry.kind === "call") {
      expect(itEntry.summary).toBe("已寄 DM, 約下週見");
    }
  });
});

describe("AC-006: vCard 匯出可通過基本驗證", () => {
  it("BEGIN/END/VERSION/FN 都在", () => {
    const c = makeContact();
    const vcf = buildVCard(c, c.updatedAt);
    expect(vcf).toMatch(/^BEGIN:VCARD/);
    expect(vcf).toMatch(/END:VCARD$/);
    expect(vcf).toMatch(/VERSION:3.0/);
    expect(vcf).toMatch(/FN:/);
  });
  it("escape 換行/逗號/分號", () => {
    const c = makeContact({
      payload: { ...makeContact().payload, notes: "line1\nline2; with, comma" },
    });
    const vcf = buildVCard(c, c.updatedAt);
    expect(vcf).toContain("\\n");
    expect(vcf).toContain("\\;");
    expect(vcf).toContain("\\,");
  });
});

describe("AC-007: CSV 匯出包含原始欄位與最後互動日期", () => {
  it("header 包含 lastInteraction", () => {
    expect(CSV_FIELDS).toContain("lastInteraction");
  });
  it("完整匯出可 parse 回來", () => {
    const c = makeContact({ id: "ct-1" });
    const now = new Date().toISOString();
    const state = makeBaseState({
      contacts: [c],
      interactions: [
        {
          id: "it-1",
          contactId: c.id,
          kind: "call",
          summary: "通過電話",
          nextCommitment: null,
          occurredAt: now,
          createdAt: now,
        },
      ],
      followups: [],
    });
    const csv = exportCSV([c], state);
    expect(csv).toMatch(/^# business-card-pro export/);
    // 動態跟著 EXPORT_SCHEMA_VERSION(2026-08-16 bump 到 2,新增 kind enum)
    expect(csv).toMatch(new RegExp(`^# schema-version: ${EXPORT_SCHEMA_VERSION}$`, "m"));
    expect(csv).toMatch(/^# exported-at: /m);
    const { contacts: parsed, meta } = parseCSV(csv);
    expect(meta.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(meta.exportedAt).not.toBeNull();
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.payload.name).toBe("王小明");
    expect(parsed[0]?.payload.company).toBe("國泰人壽");
  });

  it("schema-version 不符時, parseCSV 仍回 data + meta 給 caller 判斷", () => {
    // 模擬未來升級的 v2 CSV
    const futureCsv = `# business-card-pro export
# schema-version: 99
# schema-doc: https://example.com/v99
# exported-at: 2030-01-01T00:00:00.000Z
name,company
張三,新公司`;
    const { contacts, meta } = parseCSV(futureCsv);
    expect(contacts).toHaveLength(1);
    expect(meta.schemaVersion).toBe(99);
    // caller 可以根據 meta.schemaVersion !== EXPORT_SCHEMA_VERSION 來決定要不要 warn user
  });
});

describe("AC-008: 搜尋姓名、公司、標籤與最近互動", () => {
  const state = makeBaseState({
    contacts: [
      makeContact({ id: "ct-1", payload: { ...makeContact().payload, name: "王小明", company: "國泰", tags: ["保險"] } }),
      makeContact({ id: "ct-2", payload: { ...makeContact().payload, name: "林大華", company: "台積電", tags: ["科技"] } }),
    ],
  });
  it("依姓名", () => {
    expect(listContacts({ ...state, ui: { ...state.ui, searchQuery: "小" } })).toHaveLength(1);
  });
  it("依公司", () => {
    expect(listContacts({ ...state, ui: { ...state.ui, searchQuery: "台積" } })).toHaveLength(1);
  });
  it("依標籤", () => {
    expect(listContacts({ ...state, ui: { ...state.ui, searchQuery: "保險" } })).toHaveLength(1);
  });
  it("依最近互動 (notes)", () => {
    const c2 = makeContact({ id: "ct-3", payload: { ...makeContact().payload, name: "張三", notes: "昨天見面" } });
    const s2 = makeBaseState({ contacts: [c2] });
    expect(listContacts({ ...s2, ui: { ...s2.ui, searchQuery: "昨天" } })).toHaveLength(1);
  });
});

describe("AC-009: 刪除聯絡人同步刪除照片與互動內容", () => {
  it("cascadeDeleteContact 刪除所有相關", () => {
    const c = makeContact();
    const now = new Date().toISOString();
    const state = makeBaseState({
      contacts: [c],
      cardImages: [{ id: "img-1", contactId: c.id, dataUrl: "data:", createdAt: now }],
      exchanges: [
        { id: "ex-1", contactId: c.id, source: "名片", context: "會議", notes: null, occurredAt: now, createdAt: now },
      ],
      followups: [makeFollowup({ contactId: c.id })],
      interactions: [
        { id: "it-1", contactId: c.id, kind: "call", summary: "x", nextCommitment: null, occurredAt: now, createdAt: now },
      ],
      consents: [{ id: "cs-1", contactId: c.id, scope: "store", grantedAt: now }],
    });
    const after = cascadeDeleteContact(state, c.id);
    expect(after.contacts[0]?.status).toBe("deleted");
    expect(after.cardImages).toHaveLength(0);
    expect(after.exchanges).toHaveLength(0);
    expect(after.followups).toHaveLength(0);
    expect(after.interactions).toHaveLength(0);
    expect(after.consents).toHaveLength(0);
  });
});

describe("AC-010: 免費 pilot 不會因名片數上限阻擋資料匯出", () => {
  it("exportCSV/VCards 永遠可以呼叫,不受 plan 限制", () => {
    const c = makeContact();
    const state = makeBaseState({ contacts: [c], plan: { ownerId: "x", tier: "free", maxContacts: 20, cloudSync: false } });
    // 超過上限仍然可匯出(只擋 addContact)
    const csv = exportCSV([c, c, c, c, c, c], state);
    expect(csv).toContain("# business-card-pro");
    expect(exportVCards([c, c], state)).toContain("BEGIN:VCARD");
  });
});

describe("matchesSearch 邊界", () => {
  it("空白查詢回傳全部", () => {
    const c = makeContact();
    expect(matchesSearch(c, "")).toBe(true);
    expect(matchesSearch(c, "   ")).toBe(true);
  });
  it("不分大小寫", () => {
    const c = makeContact({ payload: { ...makeContact().payload, name: "Alice" } });
    expect(matchesSearch(c, "alice")).toBe(true);
  });
});

describe("lastInteractionDate 與時間線排序", () => {
  it("回傳最新互動時間", () => {
    const c = makeContact();
    const oldDate = "2026-01-01T00:00:00.000Z";
    const newDate = "2026-08-01T00:00:00.000Z";
    const state = makeBaseState({
      contacts: [c],
      interactions: [
        { id: "it-old", contactId: c.id, kind: "call", summary: "old", nextCommitment: null, occurredAt: oldDate, createdAt: oldDate },
        { id: "it-new", contactId: c.id, kind: "call", summary: "new", nextCommitment: null, occurredAt: newDate, createdAt: newDate },
      ],
    });
    expect(lastInteractionDate(c.id, state)).toBe(newDate);
  });
  it("沒互動回傳 null", () => {
    expect(lastInteractionDate("none", makeBaseState())).toBeNull();
  });
});