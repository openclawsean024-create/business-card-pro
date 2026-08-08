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