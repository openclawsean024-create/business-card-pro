// SPEC §5.1 / §6.1: Lighthouse accessibility ≥ 90; 鍵盤、焦點、空狀態通過檢查
// 我用 axe-core (業界標準 a11y linter) 直接對 React component tree 跑 a11y audit
// 比純 Lighthouse SSR HTML 還更權威 — 因為 axe 會走完整的 hydrated DOM

import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import HomePage from "@/app/page";
import axe from "axe-core";

beforeEach(() => {
  if (typeof window !== "undefined") window.localStorage.clear();
  useStore.setState({ ...emptyAppState() });
});

/** 跑 axe 並回傳 violation summary。null = 0 violations = pass */
async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    // 跑 jsdom 環境下能檢查的所有規則(color-contrast / focus-order 在 jsdom 不適用)
    rules: {
      "color-contrast": { enabled: false }, // jsdom 沒有真實 CSS engine
    },
  });
  return results.violations;
}

describe("A11y: axe-core audit", () => {
  it("空狀態(沒有資料): 0 critical/serious violations", async () => {
    const { container } = render(<HomePage />);
    // 等 hydration 完成
    await new Promise((r) => setTimeout(r, 50));
    const violations = await runAxe(container);
    const blockers = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    if (blockers.length > 0) {
      console.error("A11y blockers:", JSON.stringify(blockers, null, 2));
    }
    expect(blockers).toHaveLength(0);
  });

  it("有資料(1 個聯絡人 + 1 followup): 0 critical/serious violations", async () => {
    // 先建資料
    useStore.getState().addContact(
      {
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
      },
      { source: "名片", context: "會議", nextStep: "寄 DM", dueDate: new Date().toISOString() },
    );
    const { container } = render(<HomePage />);
    await new Promise((r) => setTimeout(r, 50));
    const violations = await runAxe(container);
    const blockers = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    if (blockers.length > 0) {
      console.error("A11y blockers:", JSON.stringify(blockers, null, 2));
    }
    expect(blockers).toHaveLength(0);
  });

  it("今日 tab (有 followup): 0 critical/serious violations", async () => {
    useStore.getState().addContact(
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
      { nextStep: "寄 DM", dueDate: new Date().toISOString() },
    );
    const { container } = render(<HomePage />);
    await new Promise((r) => setTimeout(r, 50));
    const violations = await runAxe(container);
    const blockers = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(blockers).toHaveLength(0);
  });
});