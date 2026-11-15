// GOAL.md M1 AC-003：欄位正規化（去空白、全形轉半形、電話只比數字、Email 轉小寫）
import type { OcrFieldKey } from "./types";

/** 全形 ASCII（U+FF01–U+FF5E）與全形空白（U+3000）轉半形 */
export function toHalfWidth(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x3000) out += " ";
    else if (code >= 0xff01 && code <= 0xff5e) out += String.fromCodePoint(code - 0xfee0);
    else out += ch;
  }
  return out;
}

/** 只留數字（電話比對與去重用） */
export function digitsOnly(input: string): string {
  return toHalfWidth(input).replace(/\D+/g, "");
}

/** 逐欄位比對用的正規化；null／空字串一律視為 "" */
export function normalizeField(field: OcrFieldKey, value: string | null | undefined): string {
  if (!value) return "";
  const half = toHalfWidth(value).replace(/\s+/g, "");
  if (field === "phone") return half.replace(/\D+/g, "");
  if (field === "email") return half.toLowerCase();
  return half;
}
