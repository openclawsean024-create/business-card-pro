// GOAL.md M1 AC-001：OCR engine adapter
//
// 來源：business-card-manager `dashboard/card-list.tsx` 的 Tesseract.js 流程
// （`eng+chi_tra`、進度回報）。搬入時的改動（SPEC §10.1 第 1 項）：
//   - 由 `<script>` 動態載入 CDN 全域物件，改為 npm 依賴 + 動態 import；
//   - 包成 OcrEngine 介面，測試以 mock 注入，不需要網路；
//   - 只回傳辨識結果，不再自動存檔（存檔由使用者在表單確認）。
//
// 影像只在本機（瀏覽器 Web Worker）辨識，不會上傳。
// Tesseract.js 預設會從 jsDelivr CDN 下載 worker、WASM 核心與語言檔（eng、chi_tra）；
// 下載的是辨識程式與模型，請求中不含影像。OCR 入口的告知文字必須說明這一點（AC-007）。

import type { OcrEngine, OcrEngineResult, OcrLine, OcrRecognizeOptions } from "./types";

/** 沿用 manager 的語言組合：英文 + 繁體中文 */
export const TESSERACT_LANGS = "eng+chi_tra";

/**
 * 保留字距：欄位之間的寬間隔會輸出成多個空白（parser 用來切欄位），
 * 中文字之間也不會被插入多餘空白。manager 原本沒有設定，
 * 在合成影像測試集上會把「姓名　　職稱」黏成一行、把中文詞拆開。
 */
export const TESSERACT_PARAMS: Record<string, string> = { preserve_interword_spaces: "1" };

interface TesseractLine {
  text: string;
  confidence: number;
}
interface TesseractPage {
  text: string;
  confidence: number;
  blocks: Array<{ paragraphs: Array<{ lines: TesseractLine[] }> }> | null;
}
interface TesseractWorker {
  recognize(
    image: unknown,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ): Promise<{ data: TesseractPage }>;
  setParameters(params: Record<string, string>): Promise<unknown>;
  terminate(): Promise<unknown>;
}
interface TesseractModule {
  createWorker(
    langs: string,
    oem: number,
    options: Record<string, unknown>,
  ): Promise<TesseractWorker>;
}

export interface TesseractEngineOptions {
  langs?: string;
  /** 測試或 Node 評估腳本可注入載入方式 */
  loader?: () => Promise<TesseractModule>;
  /** 額外的 worker 選項（例如 Node 評估時的 cachePath）；未指定時使用 Tesseract.js 預設（CDN） */
  workerOptions?: Record<string, unknown>;
}

function abortError(): Error {
  const err = new Error("已取消辨識");
  err.name = "AbortError";
  return err;
}

async function defaultLoader(): Promise<TesseractModule> {
  const mod = (await import("tesseract.js")) as unknown as TesseractModule & { default?: TesseractModule };
  return typeof mod.createWorker === "function" ? mod : (mod.default as TesseractModule);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function toEngineResult(page: TesseractPage): OcrEngineResult {
  const lines: OcrLine[] = [];
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text.trim();
        if (text) lines.push({ text, confidence: clamp01(line.confidence / 100) });
      }
    }
  }
  return {
    text: page.text ?? "",
    confidence: typeof page.confidence === "number" ? clamp01(page.confidence / 100) : null,
    lines,
  };
}

export function createTesseractEngine(options: TesseractEngineOptions = {}): OcrEngine {
  const langs = options.langs ?? TESSERACT_LANGS;
  return {
    async recognize(image: Blob | Uint8Array, opts: OcrRecognizeOptions = {}): Promise<OcrEngineResult> {
      if (opts.signal?.aborted) throw abortError();
      const tesseract = await (options.loader ?? defaultLoader)();
      const worker = await tesseract.createWorker(langs, 1, {
        ...options.workerOptions,
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            opts.onProgress?.(clamp01(m.progress));
          }
        },
      });
      await worker.setParameters(TESSERACT_PARAMS);
      let onAbort: (() => void) | null = null;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(abortError());
        opts.signal?.addEventListener("abort", onAbort, { once: true });
      });
      try {
        if (opts.signal?.aborted) throw abortError();
        const { data } = await Promise.race([
          worker.recognize(image, {}, { text: true, blocks: true }),
          aborted,
        ]);
        return toEngineResult(data);
      } finally {
        if (onAbort) opts.signal?.removeEventListener("abort", onAbort);
        // 取消時 terminate 會中止進行中的辨識；影像資料隨 worker 一併釋放
        void worker.terminate().catch(() => undefined);
      }
    },
  };
}
