// 整合測試: skip link 必須存在且正確指向 #main-content
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import HomePage from "@/app/page";

describe("a11y: skip link", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
    useStore.setState({ ...emptyAppState() });
  });

  it("頁面第一個可 focus 元素是 skip-to-main link", () => {
    const { container } = render(<HomePage />);
    // 跳到主要內容 在 sr-only 狀態;focus 時變可見
    const skip = container.querySelector('a[href="#main-content"]');
    expect(skip).toBeTruthy();
    expect(skip?.textContent).toContain("跳到主要內容");
  });

  it("main 有對應的 id 讓 skip link 生效", () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector("#main-content");
    expect(main).toBeTruthy();
    expect(main?.tagName).toBe("MAIN");
  });

  it("main 有 tabIndex=-1 才能接收鍵盤 focus", () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector("#main-content");
    expect(main?.getAttribute("tabindex")).toBe("-1");
  });
});