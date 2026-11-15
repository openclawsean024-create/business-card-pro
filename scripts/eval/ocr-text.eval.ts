// GOAL.md M1 AC-003：`npm run eval:ocr` — 文字層（parser）準確度評估
// 零網路依賴：只讀 src/test/fixtures/ocr/text-cases.json（合成假名片）。
// 輸出各欄位準確率；任何一項未達門檻則測試失敗、指令 exit 1。
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCardHeuristic } from "../../src/lib/ocr/parse";
import {
  TEXT_LAYER_THRESHOLDS,
  checkThresholds,
  evaluateOcr,
  formatReport,
  type OcrEvalCase,
  type OcrTruth,
} from "../../src/lib/ocr/evaluate";

interface TextCase {
  id: string;
  category: string;
  rawText: string;
  truth: OcrTruth;
}

it("AC-003: OCR 文字層準確度達 GOAL.md 門檻", () => {
  // OCR_TEXT_CASES 可指向另一組由產生器（--seed/--out）產生的檔案，用來檢查 parser 是否過度貼合
  const file = process.env.OCR_TEXT_CASES ?? join(process.cwd(), "src/test/fixtures/ocr/text-cases.json");
  const { cases } = JSON.parse(readFileSync(file, "utf8")) as { cases: TextCase[] };
  const evalCases: OcrEvalCase[] = cases.map((c) => ({
    id: c.id,
    category: c.category,
    truth: c.truth,
    predicted: parseCardHeuristic(c.rawText).fields,
  }));
  const report = evaluateOcr(evalCases);
  console.log(`\n${formatReport("OCR 文字層（parser）", report, TEXT_LAYER_THRESHOLDS)}`);
  if (report.misses.length > 0) {
    console.log("未命中：");
    for (const m of report.misses) console.log(`  ${m.id} ${m.field}: 預期「${m.expected}」 實得「${m.actual}」`);
  }
  const failures = checkThresholds(report, TEXT_LAYER_THRESHOLDS);
  console.log(failures.length === 0 ? "結果：通過" : `結果：未達門檻 → ${failures.join("；")}`);
  expect(failures).toEqual([]);
});
