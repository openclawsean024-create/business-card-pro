// GOAL.md M1 AC-001 / AC-002：OCR 模組入口
import { createTesseractEngine } from "./engine";
import { parseCardHeuristic } from "./parse";
import type { OcrEngine, OcrRecognizeOptions, ParsedCard } from "./types";

export * from "./types";
export { parseCardHeuristic } from "./parse";
export { createTesseractEngine, TESSERACT_LANGS } from "./engine";

let override: OcrEngine | null = null;
let cached: OcrEngine | null = null;

/** 測試或其他環境注入自訂 engine；傳 null 還原為預設的 Tesseract engine */
export function setOcrEngine(engine: OcrEngine | null): void {
  override = engine;
}

export function getOcrEngine(): OcrEngine {
  if (override) return override;
  cached ??= createTesseractEngine();
  return cached;
}

/**
 * 影像 → 預覽欄位。只回傳 ParsedCard：不保存影像、不保存 OCR 原始文字、不建立聯絡人。
 */
export async function recognizeCard(
  image: Blob,
  engine: OcrEngine = getOcrEngine(),
  options: OcrRecognizeOptions = {},
): Promise<ParsedCard> {
  const result = await engine.recognize(image, options);
  return parseCardHeuristic(result.text, { lines: result.lines });
}
