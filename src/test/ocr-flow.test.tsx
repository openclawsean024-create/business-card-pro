// GOAL.md M1 AC-002／AC-007：OCR 只產生預覽、確認後才建立聯絡人；OCR 前顯示個資告知。
// 全程使用 mock engine 與假資料：不載入 Tesseract、不需要網路、沒有真實名片。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import { ContactFormModal } from "@/components/ContactFormModal";
import { createTesseractEngine, toEngineResult } from "@/lib/ocr/engine";
import type { OcrEngine, OcrEngineResult } from "@/lib/ocr/types";

const CARD_TEXT = [
  "範例科技股份有限公司",
  "測試 王小明  業務經理",
  "電話：02-0000-0001",
  "手機：0900-000-001",
  "Email：test01@example.com",
].join("\n");

/** 假的名片影像：只有幾個位元組，內容不重要（mock engine 不會解讀） */
function fakeImage(): File {
  return new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "fake-card.png", { type: "image/png" });
}

function mockEngine(result: Partial<OcrEngineResult> = {}) {
  const received: unknown[] = [];
  const engine: OcrEngine = {
    async recognize(image, options) {
      received.push(image);
      options?.onProgress?.(0.5);
      return { text: CARD_TEXT, confidence: 0.9, lines: [], ...result };
    },
  };
  return { engine, received };
}

function field(label: string): HTMLInputElement {
  return screen.getByRole("textbox", { name: label }) as HTMLInputElement;
}

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

describe("AC-007: OCR 前的個資告知", () => {
  it("AC-007: OCR 入口顯示告知 — 本機辨識、不上傳、預設不保存影像、他人個資、會下載辨識模型", () => {
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={mockEngine().engine} />);
    const notice = screen.getByTestId("ocr-privacy-notice");
    expect(notice).toBeVisible();
    expect(notice).toHaveTextContent("只在你的裝置上辨識");
    expect(notice).toHaveTextContent("不會上傳到伺服器");
    expect(notice).toHaveTextContent("預設不保存影像");
    expect(notice).toHaveTextContent("他人的個人資料");
    expect(notice).toHaveTextContent("只會存在這台裝置的瀏覽器");
    expect(notice).toHaveTextContent("僅用於業務聯繫");
    // Tesseract 語言檔從 CDN 下載 → 必須說明會下載辨識模型且不含影像
    expect(notice).toHaveTextContent("從 CDN 下載辨識程式與語言模型");
    expect(notice).toHaveTextContent("下載內容不含你的影像");
  });

  it("AC-007: 告知在選擇影像之前就出現，且兩個 OCR 按鈕都以 aria-describedby 指向它", () => {
    const { received } = mockEngine();
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={mockEngine().engine} />);
    expect(received).toHaveLength(0);
    for (const name of ["拍照掃描", "上傳圖片"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-describedby", "ocr-privacy-notice");
    }
  });

  it("AC-007: 編輯既有聯絡人時沒有 OCR 入口", () => {
    const { contact } = useStore.getState().addContact({
      name: "測試 王小明",
      company: "範例科技股份有限公司",
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
    render(<ContactFormModal contact={contact} onClose={() => {}} />);
    expect(screen.queryByTestId("ocr-capture")).toBeNull();
  });
});

describe("AC-002: OCR 只產生預覽，使用者確認後才建立聯絡人", () => {
  it("AC-002(a): 辨識完成後只預填表單，store 的聯絡人數不變、addContact 未被呼叫", async () => {
    const user = userEvent.setup();
    const addSpy = vi.spyOn(useStore.getState(), "addContact");
    const { engine } = mockEngine();
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={engine} />);

    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    await waitFor(() => expect(field("姓名").value).toBe("測試 王小明"));

    expect(field("公司").value).toBe("範例科技股份有限公司");
    expect(field("職稱").value).toBe("業務經理");
    expect(field("電話").value).toBe("0900-000-001");
    expect(field("Email").value).toBe("test01@example.com");
    expect(screen.getByTestId("ocr-preview-banner")).toHaveTextContent("尚未儲存");

    expect(useStore.getState().contacts).toHaveLength(0);
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("AC-002(a): 拍照入口（capture=environment）走同一個預覽流程", async () => {
    const user = userEvent.setup();
    const { engine, received } = mockEngine();
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={engine} />);
    const camera = screen.getByLabelText("拍照掃描名片");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).toHaveAttribute("accept", "image/*");

    await user.upload(camera, fakeImage());
    await waitFor(() => expect(field("姓名").value).toBe("測試 王小明"));
    expect(received).toHaveLength(1);
    expect(useStore.getState().contacts).toHaveLength(0);
  });

  it("AC-002(b): 按下確認後聯絡人數 +1，ocrConfidence 寫入實際數值", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ContactFormModal contact={null} onClose={onClose} ocrEngine={mockEngine().engine} />);
    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    await waitFor(() => expect(field("姓名").value).toBe("測試 王小明"));

    await user.click(screen.getByRole("button", { name: "確認並儲存" }));

    const contacts = useStore.getState().contacts;
    expect(contacts).toHaveLength(1);
    const payload = contacts[0]!.payload;
    expect(payload.name).toBe("測試 王小明");
    expect(payload.ocrConfidence).not.toBeNull();
    expect(payload.ocrConfidence!).toBeGreaterThan(0);
    expect(payload.ocrConfidence!).toBeLessThanOrEqual(1);
    expect(payload.ocrLowConfidenceFields).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC-002(b): 低信心欄位有視覺標示並列入 ocrLowConfidenceFields；使用者改過的欄位視為已確認", async () => {
    const user = userEvent.setup();
    // engine 回報「姓名／職稱」那一行的信心只有 0.4
    const { engine } = mockEngine({ lines: [{ text: "測試 王小明  業務經理", confidence: 0.4 }] });
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={engine} />);
    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    await waitFor(() => expect(field("姓名").value).toBe("測試 王小明"));

    expect(field("姓名")).toHaveAttribute("data-ocr-low", "true");
    expect(field("職稱")).toHaveAttribute("data-ocr-low", "true");
    expect(field("公司")).not.toHaveAttribute("data-ocr-low");
    expect(field("Email")).not.toHaveAttribute("data-ocr-low");
    const hint = screen.getByTestId("ocr-low-hint");
    expect(hint).toHaveTextContent("姓名");
    expect(hint).toHaveTextContent("職稱");
    expect(field("姓名")).toHaveAttribute("aria-describedby", "ocr-low-hint");

    // 使用者修正職稱 → 該欄標示消失
    await user.clear(field("職稱"));
    await user.type(field("職稱"), "業務副理");
    expect(field("職稱")).not.toHaveAttribute("data-ocr-low");

    await user.click(screen.getByRole("button", { name: "確認並儲存" }));
    const payload = useStore.getState().contacts[0]!.payload;
    expect(payload.title).toBe("業務副理");
    expect(payload.ocrLowConfidenceFields).toEqual(["name"]);
    expect(payload.ocrConfidence!).toBeLessThan(0.9);
  });

  it("AC-002(c): engine 丟錯時顯示錯誤、已填欄位不遺失，表單仍可手動送出", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing: OcrEngine = {
      async recognize() {
        throw new Error("mock engine failure");
      },
    };
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={failing} />);
    await user.type(field("姓名"), "測試 林大華");
    await user.type(field("公司"), "範例貿易有限公司");

    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    expect(await screen.findByRole("alert")).toHaveTextContent("辨識失敗");
    expect(field("姓名").value).toBe("測試 林大華");
    expect(field("公司").value).toBe("範例貿易有限公司");
    expect(useStore.getState().contacts).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "儲存" }));
    const contacts = useStore.getState().contacts;
    expect(contacts).toHaveLength(1);
    expect(contacts[0]!.payload.name).toBe("測試 林大華");
    expect(contacts[0]!.payload.ocrConfidence).toBeNull();
    warn.mockRestore();
  });

  it("AC-002(c): 使用者取消辨識時退回手動輸入，已填欄位不遺失，之後才回來的結果不會被套用", async () => {
    const user = userEvent.setup();
    let finish: (r: OcrEngineResult) => void = () => {};
    let signal: AbortSignal | undefined;
    const slow: OcrEngine = {
      recognize(_image, options) {
        signal = options?.signal;
        return new Promise<OcrEngineResult>((resolve) => {
          finish = resolve;
        });
      },
    };
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={slow} />);
    await user.type(field("公司"), "範例設計工作室");
    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());

    await user.click(await screen.findByRole("button", { name: "取消辨識" }));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText(/已取消辨識/)).toBeVisible();

    finish({ text: CARD_TEXT, confidence: 0.9, lines: [] });
    await new Promise((r) => setTimeout(r, 20));
    expect(field("公司").value).toBe("範例設計工作室");
    expect(field("姓名").value).toBe("");
    expect(screen.queryByTestId("ocr-preview-banner")).toBeNull();
    expect(useStore.getState().contacts).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "儲存" }));
    expect(useStore.getState().contacts).toHaveLength(1);
  });

  it("AC-002: 使用者已輸入的欄位不會被 OCR 結果覆蓋", async () => {
    const user = userEvent.setup();
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={mockEngine().engine} />);
    await user.type(field("姓名"), "測試 陳怡君");
    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    await waitFor(() => expect(field("公司").value).toBe("範例科技股份有限公司"));
    expect(field("姓名").value).toBe("測試 陳怡君");
  });

  it("AC-002(d): 流程結束後 localStorage 不含影像 data URL，store 也沒有名片影像", async () => {
    const user = userEvent.setup();
    const { engine, received } = mockEngine();
    render(<ContactFormModal contact={null} onClose={() => {}} ocrEngine={engine} />);
    await user.upload(screen.getByLabelText("上傳名片圖片"), fakeImage());
    await waitFor(() => expect(field("姓名").value).toBe("測試 王小明"));
    await user.click(screen.getByRole("button", { name: "確認並儲存" }));

    // 影像以 File／Blob 直接交給 engine，沒有轉成 data URL
    expect(received[0]).toBeInstanceOf(Blob);
    expect(useStore.getState().contacts).toHaveLength(1);
    expect(useStore.getState().cardImages).toHaveLength(0);

    expect(window.localStorage.length).toBeGreaterThan(0);
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)!;
      const value = window.localStorage.getItem(key) ?? "";
      expect(value).not.toMatch(/data:image\//);
      expect(value).not.toContain("fake-card.png");
      // OCR 原始文字也不保存（SPEC §7 最小蒐集）
      expect(value).not.toContain("ocrRawText");
    }
  });
});

describe("AC-001: OCR engine 以 adapter 注入，可在測試中替換", () => {
  it("AC-001: Tesseract adapter 用 eng+chi_tra 建立 worker、回報進度、把結果轉成 0–1 信心並結束 worker", async () => {
    const calls: string[] = [];
    let createArgs: unknown[] = [];
    const fakeTesseract = {
      async createWorker(...args: unknown[]) {
        createArgs = args;
        const logger = (args[2] as { logger: (m: { status: string; progress: number }) => void }).logger;
        return {
          async setParameters(params: Record<string, string>) {
            calls.push(`setParameters:${JSON.stringify(params)}`);
          },
          async recognize() {
            calls.push("recognize");
            logger({ status: "recognizing text", progress: 0.25 });
            return {
              data: {
                text: "範例科技股份有限公司\n測試 王小明\n",
                confidence: 88,
                blocks: [
                  {
                    paragraphs: [
                      {
                        lines: [
                          { text: "範例科技股份有限公司\n", confidence: 91 },
                          { text: "測試 王小明\n", confidence: 62 },
                        ],
                      },
                    ],
                  },
                ],
              },
            };
          },
          async terminate() {
            calls.push("terminate");
          },
        };
      },
    };
    const progress: number[] = [];
    const engine = createTesseractEngine({ loader: async () => fakeTesseract });
    const result = await engine.recognize(fakeImage(), { onProgress: (p) => progress.push(p) });

    expect(createArgs[0]).toBe("eng+chi_tra");
    expect(calls).toEqual(['setParameters:{"preserve_interword_spaces":"1"}', "recognize", "terminate"]);
    expect(progress).toEqual([0.25]);
    expect(result.confidence).toBeCloseTo(0.88);
    expect(result.lines).toEqual([
      { text: "範例科技股份有限公司", confidence: 0.91 },
      { text: "測試 王小明", confidence: 0.62 },
    ]);
  });

  it("AC-001: engine 沒有逐行資料時也能轉換（blocks 為 null）", () => {
    expect(toEngineResult({ text: "測試", confidence: 50, blocks: null })).toEqual({
      text: "測試",
      confidence: 0.5,
      lines: [],
    });
  });
});
