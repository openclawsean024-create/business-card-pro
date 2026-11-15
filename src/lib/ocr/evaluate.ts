// GOAL.md M1 AC-003：OCR 準確度評估（文字層與影像層共用）
// 指標：逐欄位比對「正規化後完全相符」；平均＝五個欄位準確率的算術平均。
import { normalizeField } from "./normalize";
import { OCR_FIELDS, type OcrFieldKey } from "./types";

export type OcrTruth = Record<OcrFieldKey, string | null>;

export interface OcrEvalCase {
  id: string;
  category: string;
  truth: OcrTruth;
  predicted: Record<OcrFieldKey, string | null>;
}

export interface FieldScore {
  correct: number;
  total: number;
  accuracy: number;
}

export interface OcrEvalReport {
  total: number;
  perField: Record<OcrFieldKey, FieldScore>;
  average: number;
  byCategory: Record<string, { total: number; average: number }>;
  /** 比對失敗的欄位，供除錯與 STATUS.md 記錄 */
  misses: Array<{ id: string; field: OcrFieldKey; expected: string; actual: string }>;
}

export type OcrThresholds = Partial<Record<OcrFieldKey, number>> & { average: number };

/** GOAL.md AC-003 初版門檻 — 文字層（parser，CI 必跑） */
export const TEXT_LAYER_THRESHOLDS: OcrThresholds = {
  email: 0.98,
  phone: 0.95,
  name: 0.9,
  company: 0.9,
  title: 0.85,
  average: 0.92,
};

/** GOAL.md AC-003 初版門檻 — 影像層（Tesseract 端到端，本機執行） */
export const IMAGE_LAYER_THRESHOLDS: OcrThresholds = {
  email: 0.9,
  phone: 0.85,
  name: 0.75,
  average: 0.8,
};

export function isFieldCorrect(field: OcrFieldKey, expected: string | null, actual: string | null): boolean {
  return normalizeField(field, expected) === normalizeField(field, actual);
}

function scoreOf(cases: OcrEvalCase[]): { perField: Record<OcrFieldKey, FieldScore>; average: number } {
  const perField = {} as Record<OcrFieldKey, FieldScore>;
  let sum = 0;
  for (const field of OCR_FIELDS) {
    const correct = cases.filter((c) => isFieldCorrect(field, c.truth[field], c.predicted[field])).length;
    const accuracy = cases.length === 0 ? 0 : correct / cases.length;
    perField[field] = { correct, total: cases.length, accuracy };
    sum += accuracy;
  }
  return { perField, average: sum / OCR_FIELDS.length };
}

export function evaluateOcr(cases: OcrEvalCase[]): OcrEvalReport {
  const { perField, average } = scoreOf(cases);
  const byCategory: OcrEvalReport["byCategory"] = {};
  for (const category of new Set(cases.map((c) => c.category))) {
    const subset = cases.filter((c) => c.category === category);
    byCategory[category] = { total: subset.length, average: scoreOf(subset).average };
  }
  const misses: OcrEvalReport["misses"] = [];
  for (const c of cases) {
    for (const field of OCR_FIELDS) {
      if (!isFieldCorrect(field, c.truth[field], c.predicted[field])) {
        misses.push({ id: c.id, field, expected: c.truth[field] ?? "", actual: c.predicted[field] ?? "" });
      }
    }
  }
  return { total: cases.length, perField, average, byCategory, misses };
}

/** 回傳未達門檻的項目；空陣列表示全部通過 */
export function checkThresholds(report: OcrEvalReport, thresholds: OcrThresholds): string[] {
  const failures: string[] = [];
  for (const field of OCR_FIELDS) {
    const min = thresholds[field];
    if (min === undefined) continue;
    const got = report.perField[field].accuracy;
    if (got < min) failures.push(`${field}: ${pct(got)} < ${pct(min)}`);
  }
  if (report.average < thresholds.average) {
    failures.push(`average: ${pct(report.average)} < ${pct(thresholds.average)}`);
  }
  return failures;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatReport(title: string, report: OcrEvalReport, thresholds: OcrThresholds): string {
  const rows = OCR_FIELDS.map((field) => {
    const s = report.perField[field];
    const min = thresholds[field];
    return `  ${field.padEnd(8)} ${pct(s.accuracy).padStart(6)}  (${s.correct}/${s.total})  門檻 ${min === undefined ? "—" : pct(min)}`;
  });
  const cats = Object.entries(report.byCategory).map(
    ([name, c]) => `  ${name.padEnd(14)} ${pct(c.average).padStart(6)}  (${c.total} 筆)`,
  );
  return [
    `${title} — ${report.total} 筆`,
    ...rows,
    `  ${"average".padEnd(8)} ${pct(report.average).padStart(6)}  門檻 ${pct(thresholds.average)}`,
    "依類別（五欄平均）：",
    ...cats,
  ].join("\n");
}
