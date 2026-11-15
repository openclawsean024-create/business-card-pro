// GOAL.md M1 AC-001 / AC-002：OCR 模組共用型別
// 來源：business-card-manager `dashboard/card-list.tsx`（SPEC §10.1 第 1、2 項），
// 改寫為 adapter + 純函式；不保存 OCR 原始文字（SPEC §7 最小蒐集）。

/** OCR 會預填的聯絡人欄位（對應 ContactPayload 的同名欄位） */
export const OCR_FIELDS = ["name", "company", "title", "phone", "email"] as const;
export type OcrFieldKey = (typeof OCR_FIELDS)[number];

/** engine 回報的一行文字；confidence 為 0–1，engine 不提供時為 null */
export interface OcrLine {
  text: string;
  confidence: number | null;
}

export interface OcrEngineResult {
  /** 整張影像的原始文字（只在記憶體中使用，不寫入 store） */
  text: string;
  /** 整體信心 0–1；engine 不提供時為 null */
  confidence: number | null;
  lines: OcrLine[];
}

export interface OcrRecognizeOptions {
  /** 進度 0–1 */
  onProgress?: (ratio: number) => void;
  /** 使用者取消時中止辨識 */
  signal?: AbortSignal;
}

/**
 * OCR engine adapter。正式環境為 Tesseract.js（瀏覽器端執行，影像不上傳）；
 * 測試以 mock 實作注入，不需要網路或語言檔。
 */
export interface OcrEngine {
  /** 瀏覽器傳 File／Blob；Node 的評估腳本傳影像位元組 */
  recognize(image: Blob | Uint8Array, options?: OcrRecognizeOptions): Promise<OcrEngineResult>;
}

/** parseCardHeuristic 的輸出：只是預覽，必須經使用者確認才可存檔 */
export interface ParsedCard {
  fields: Record<OcrFieldKey, string | null>;
  /** 每欄信心 0–1；未辨識到的欄位為 0 */
  confidence: Record<OcrFieldKey, number>;
  /** 有值但信心低於門檻、需要使用者特別確認的欄位 */
  lowConfidenceFields: OcrFieldKey[];
  /** 已辨識欄位的平均信心 0–1；全部未辨識時為 0 */
  overallConfidence: number;
}

/** 低於此值的欄位列入 lowConfidenceFields */
export const LOW_CONFIDENCE_THRESHOLD = 0.75;
