// 桌面工作台整合測試:Sidebar / drawer / today queue 分組 + PulseCard
import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import {
  buildRhythm,
  getTodayProgress,
  getUpcomingQueue,
} from "@/lib/domain";
import HomePage from "@/app/page";

beforeEach(() => {
  if (typeof window !== "undefined") window.localStorage.clear();
  useStore.setState({ ...emptyAppState() });
});

describe("domain helpers", () => {
  it("getTodayProgress 區分 done 與 pending", () => {
    const today = new Date();
    const todayIso = today.toISOString();
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000).toISOString();

    const followups = [
      { id: "fu-done-today", contactId: "c1", status: "done" as const, nextStep: "x", dueDate: todayIso, completedAt: todayIso, nextCommitment: null, createdAt: todayIso, updatedAt: todayIso },
      { id: "fu-pending-today", contactId: "c1", status: "pending" as const, nextStep: "x", dueDate: todayIso, completedAt: null, nextCommitment: null, createdAt: todayIso, updatedAt: todayIso },
      { id: "fu-pending-overdue", contactId: "c2", status: "pending" as const, nextStep: "x", dueDate: yesterday, completedAt: null, nextCommitment: null, createdAt: yesterday, updatedAt: yesterday },
      { id: "fu-pending-tomorrow", contactId: "c3", status: "pending" as const, nextStep: "x", dueDate: tomorrow, completedAt: null, nextCommitment: null, createdAt: tomorrow, updatedAt: tomorrow },
    ];
    const p = getTodayProgress(followups, today);
    expect(p.done).toBe(1);
    expect(p.total).toBe(3);
  });

  it("getUpcomingQueue 只抓未到期且在 windowDays 內", () => {
    const today = new Date();
    const todayIso = today.toISOString();
    const in3 = new Date(today.getTime() + 3 * 24 * 3600 * 1000).toISOString();
    const in10 = new Date(today.getTime() + 10 * 24 * 3600 * 1000).toISOString();
    const c = { id: "c1", ownerId: null, status: "active" as const, version: 1, createdAt: todayIso, updatedAt: todayIso, payload: { name: "A", company: null, title: null, phone: null, email: null, address: null, website: null, notes: null, tags: [], ocrConfidence: null, ocrLowConfidenceFields: [] } };
    const followups = [
      { id: "fu-3", contactId: "c1", status: "pending" as const, nextStep: "x", dueDate: in3, completedAt: null, nextCommitment: null, createdAt: todayIso, updatedAt: todayIso },
      { id: "fu-10", contactId: "c1", status: "pending" as const, nextStep: "x", dueDate: in10, completedAt: null, nextCommitment: null, createdAt: todayIso, updatedAt: todayIso },
      { id: "fu-today", contactId: "c1", status: "pending" as const, nextStep: "x", dueDate: todayIso, completedAt: null, nextCommitment: null, createdAt: todayIso, updatedAt: todayIso },
    ];
    const up = getUpcomingQueue(followups, [c], today, 7);
    expect(up).toHaveLength(1);
    expect(up[0]?.id).toBe("fu-3");
  });

  it("buildRhythm 回傳 14 天,今天標記 isToday", () => {
    const points = buildRhythm([], [], new Date(), 14);
    expect(points).toHaveLength(14);
    expect(points[points.length - 1]?.isToday).toBe(true);
  });
});

describe("Sidebar (md+) should always render", () => {
  it("桌機寬度下,aside[aria-label=側邊導覽] 出現,含本機模式 + 容量條", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    render(<HomePage />);
    const aside = screen.getByRole("complementary", { name: "側邊導覽" });
    expect(aside).toBeTruthy();
    expect(within(aside).getByText(/本機模式已啟用/)).toBeInTheDocument();
    expect(within(aside).getByText(/名片庫容量/)).toBeInTheDocument();
    // 容量 progressbar
    const cap = within(aside).getByRole("progressbar", { name: "名片庫容量" });
    expect(cap).toBeTruthy();
  });

  it("點 Sidebar 的『聯絡人』, store.ui.activeTab 切到 contacts", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    const user = userEvent.setup();
    render(<HomePage />);
    const aside = screen.getByRole("complementary", { name: "側邊導覽" });
    const btn = within(aside).getByRole("button", { name: /聯絡人/ });
    await user.click(btn);
    expect(useStore.getState().ui.activeTab).toBe("contacts");
  });
});

describe("PulseCard + Today grouping", () => {
  it("今日 tab 同時顯示 PulseCard 進度條 + 三組 queue 區塊", () => {
    const today = new Date();
    const inFuture = new Date(today.getTime() + 3 * 24 * 3600 * 1000);
    useStore.setState({
      ...emptyAppState(),
      contacts: [
        { id: "c1", ownerId: null, status: "active", version: 1, createdAt: today.toISOString(), updatedAt: today.toISOString(), payload: { name: "陳", company: null, title: null, phone: null, email: null, address: null, website: null, notes: null, tags: [], ocrConfidence: null, ocrLowConfidenceFields: [] } },
        { id: "c2", ownerId: null, status: "active", version: 1, createdAt: today.toISOString(), updatedAt: today.toISOString(), payload: { name: "王", company: null, title: null, phone: null, email: null, address: null, website: null, notes: null, tags: [], ocrConfidence: null, ocrLowConfidenceFields: [] } },
      ],
      followups: [
        { id: "fu-over", contactId: "c1", status: "pending", nextStep: "寄 DM", dueDate: new Date(today.getTime() - 24 * 3600 * 1000).toISOString(), completedAt: null, nextCommitment: null, createdAt: today.toISOString(), updatedAt: today.toISOString() },
        { id: "fu-today", contactId: "c2", status: "pending", nextStep: "拜訪", dueDate: today.toISOString(), completedAt: null, nextCommitment: null, createdAt: today.toISOString(), updatedAt: today.toISOString() },
        { id: "fu-up", contactId: "c1", status: "pending", nextStep: "致電", dueDate: inFuture.toISOString(), completedAt: null, nextCommitment: null, createdAt: today.toISOString(), updatedAt: today.toISOString() },
      ],
    });
    render(<HomePage />);
    expect(screen.getByRole("region", { name: /今日回訪節奏/ })).toBeTruthy();
    expect(screen.getByTestId("queue-list-overdue")).toBeTruthy();
    expect(screen.getByTestId("queue-list-today")).toBeTruthy();
    expect(screen.getByTestId("queue-list-upcoming")).toBeTruthy();
  });
});

describe("ContactDetailDrawer", () => {
  it("點聯絡人 → drawer 開啟,ESC 關閉", async () => {
    useStore.getState().addContact({
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
    render(<HomePage />);
    // 切到 contacts tab 才能看到 row 按鈕
    act(() => {
      useStore.getState().updateUI({ activeTab: "contacts" });
    });
    const open = await screen.findByLabelText(/查看 王小明 詳細資料/);
    const user = userEvent.setup();
    await user.click(open);
    const dialog = screen.getByRole("dialog", { name: /王小明/ });
    expect(dialog).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /王小明/ })).toBeNull();
  });

  it("點今日 queue 項目也會開 drawer", async () => {
    const today = new Date();
    useStore.getState().addContact(
      {
        name: "陳柏翰",
        company: "拓遠",
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
      { nextStep: "寄 DM", dueDate: today.toISOString() },
    );
    render(<HomePage />);
    const item = screen.getByTestId("queue-item-today");
    // 整列可 click → 內部 button 在內
    const detailBtn = within(item).getByRole("button", { name: /查看/ });
    const user = userEvent.setup();
    await user.click(detailBtn);
    expect(screen.getByRole("dialog", { name: /陳柏翰/ })).toBeTruthy();
  });
});
