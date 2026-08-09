import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import HomePage from "@/app/page";

describe("Onboarding hint (首次訪問)", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
    useStore.setState({ ...emptyAppState() });
  });

  it("沒有聯絡人 + 沒被 dismiss → 顯示", async () => {
    render(<HomePage />);
    // 等 hydration
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByRole("region", { name: /新使用者指引/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 步開始使用名片王 Pro/)).toBeInTheDocument();
  });

  it("點「我先看看」 → dismiss 後不再顯示", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await new Promise((r) => setTimeout(r, 50));

    const dismissBtn = screen.getByRole("button", { name: /我先看看/ });
    await user.click(dismissBtn);

    expect(
      screen.queryByRole("region", { name: /新使用者指引/ }),
    ).not.toBeInTheDocument();
    // localStorage 應該標記 dismissed
    expect(window.localStorage.getItem("bcp-onboarding-dismissed")).toBe("1");
  });

  it("點「開始新增第一位聯絡人」 → 切到 contacts tab + dismiss", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await new Promise((r) => setTimeout(r, 50));

    const ctaBtn = screen.getByRole("button", { name: /開始新增第一位聯絡人/ });
    await user.click(ctaBtn);

    expect(useStore.getState().ui.activeTab).toBe("contacts");
    expect(window.localStorage.getItem("bcp-onboarding-dismissed")).toBe("1");
  });

  it("有 1 個聯絡人 → 不顯示(已有資料)", async () => {
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
    await new Promise((r) => setTimeout(r, 50));

    expect(
      screen.queryByRole("region", { name: /新使用者指引/ }),
    ).not.toBeInTheDocument();
  });

  it("已被 dismiss → 重 render 也不顯示", async () => {
    window.localStorage.setItem("bcp-onboarding-dismissed", "1");
    render(<HomePage />);
    await new Promise((r) => setTimeout(r, 50));

    expect(
      screen.queryByRole("region", { name: /新使用者指引/ }),
    ).not.toBeInTheDocument();
  });
});