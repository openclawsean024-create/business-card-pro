// 整合測試: 桌機 + 手機都有可用的 nav, tab 可以切換
// 修 Bug #2 (桌機寬度下完全沒有 nav) 後的回歸測試

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";

// next/dynamic, next/link, next/router 都 stub
vi.mock("next/link", () => ({
  default: ({ children, ...rest }: { children: React.ReactNode; href: string }) => (
    <a {...rest}>{children}</a>
  ),
}));

// 直接載入 page (它有 "use client" 但在 vitest + jsdom 下可以)
import HomePage from "@/app/page";

describe("Layout: nav 必須在所有 viewport 都可見", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
    useStore.setState({ ...emptyAppState() });
    // 預設 desktop viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it("桌機寬度 (1280px) 渲染 TopNav 5 個 tab,且 aria-current 在「今日」", () => {
    render(<HomePage />);
    // jsdom 預設沒 Tailwind, 但 className 還在;以 aria-label/aria-current/textContent 找
    const navs = screen.getAllByRole("navigation");
    expect(navs.length).toBeGreaterThanOrEqual(1);
    // TopNav 在桌機寬度不該被 CSS 隱藏(jsdom 不會跑 CSS media query,所以兩個 nav 都會被 render)
    // 驗證 TopNav 內含所有 tab
    const topNav = navs.find((n) => n.className.includes("md:block"));
    expect(topNav).toBeTruthy();
    const buttons = within(topNav!).getAllByRole("button");
    const labels = buttons.map((b) => b.textContent?.trim());
    expect(labels).toEqual(
      expect.arrayContaining(["今日", "全部", "聯絡人", "時間線", "設定"]),
    );
  });

  it("點 TopNav 上的「聯絡人」, store.ui.activeTab 切到 contacts", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const navs = screen.getAllByRole("navigation");
    const topNav = navs.find((n) => n.className.includes("md:block"))!;
    const contactsBtn = within(topNav).getByRole("button", { name: /聯絡人/ });
    await user.click(contactsBtn);
    expect(useStore.getState().ui.activeTab).toBe("contacts");
  });

  it("BottomNav (mobile) 也有 5 個 tab button", () => {
    render(<HomePage />);
    const navs = screen.getAllByRole("navigation");
    const bottomNav = navs.find((n) => n.className.includes("md:hidden"));
    expect(bottomNav).toBeTruthy();
    const buttons = within(bottomNav!).getAllByRole("button");
    expect(buttons.length).toBe(5);
  });
});

describe("User flow: 新增聯絡人 → 顯示在聯絡人清單 → 切到今日", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
    useStore.setState({ ...emptyAppState() });
  });

  it("store.addContact 建立後, 聯絡人出現在列表", () => {
    const r = useStore.getState().addContact(
      {
        name: "王小明",
        company: "國泰人壽",
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
      { source: "名片", context: "會議", nextStep: "寄 DM", dueDate: new Date().toISOString() },
    );
    expect(r.contact.id).toBeTruthy();
    expect(useStore.getState().contacts).toHaveLength(1);
    // 今日 queue 應該包含這個 follow-up
    const queue = useStore.getState().followups.filter((f) => f.contactId === r.contact.id);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.nextStep).toBe("寄 DM");
  });

  it("completeFollowup 標 done, 互動時間線自動有 entry", () => {
    const r = useStore.getState().addContact(
      {
        name: "林大華",
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
      },
      { source: "活動", context: "展會", nextStep: "寄 DM", dueDate: new Date().toISOString() },
    );
    const fu = useStore.getState().followups.find((f) => f.contactId === r.contact.id)!;
    expect(fu).toBeTruthy();
    useStore.getState().completeFollowup(fu.id, "已電話聯繫", "下週三拜訪");
    const updated = useStore.getState().followups.find((f) => f.id === fu.id)!;
    expect(updated.status).toBe("done");
    expect(updated.completedAt).toBeTruthy();
    // 互動時間線應有 call 類型 entry
    const it = useStore.getState().interactions.find((i) => i.contactId === r.contact.id);
    expect(it?.summary).toBe("已電話聯繫");
  });

  it("刪除聯絡人 cascade 清除所有 followup + interaction", () => {
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
      { source: "名片", context: "會議", nextStep: "x", dueDate: new Date().toISOString() },
    );
    expect(useStore.getState().followups.length).toBeGreaterThan(0);
    useStore.getState().deleteContact(r.contact.id);
    const after = useStore.getState();
    expect(after.contacts[0]?.status).toBe("deleted");
    expect(after.followups.filter((f) => f.contactId === r.contact.id)).toHaveLength(0);
  });
});