// GOAL.md M1 AC-003：`npm run eval:ocr:images` — 影像層（Tesseract 端到端）準確度評估
//
// 本機執行，不納入 `npm test`／CI：
//   - 第一次執行需要網路：Tesseract.js 會從 jsDelivr CDN 下載 eng、chi_tra 語言檔，
//     快取在 node_modules/.cache/tesseract（不提交）；之後可離線重跑。
//   - 只讀 src/test/fixtures/ocr/images 的合成假名片；不會送出任何影像。
// 走的是與 app 相同的 engine adapter 與 parser（createTesseractEngine → parseCardHeuristic）。
import { it, expect } from "vitest";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTesseractEngine, TESSERACT_LANGS } from "../../src/lib/ocr/engine";
import { parseCardHeuristic } from "../../src/lib/ocr/parse";
import {
  IMAGE_LAYER_THRESHOLDS,
  checkThresholds,
  evaluateOcr,
  formatReport,
  type OcrEvalCase,
  type OcrTruth,
} from "../../src/lib/ocr/evaluate";

interface ImageCase {
  id: string;
  template: string;
  image: string;
  truth: OcrTruth;
}

it("AC-003: OCR 影像層準確度達 GOAL.md 門檻", async () => {
  const dir = join(process.cwd(), "src/test/fixtures/ocr/images");
  const cachePath = join(process.cwd(), "node_modules/.cache/tesseract");
  mkdirSync(cachePath, { recursive: true });
  const cases = readdirSync(dir)
    .filter((f) => /^card-\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as ImageCase);
  expect(cases.length).toBeGreaterThanOrEqual(30);

  const engine = createTesseractEngine({ workerOptions: { cachePath } });
  const evalCases: OcrEvalCase[] = [];
  for (const c of cases) {
    const result = await engine.recognize(new Uint8Array(readFileSync(join(dir, c.image))));
    const parsed = parseCardHeuristic(result.text, { lines: result.lines });
    evalCases.push({ id: c.id, category: c.template, truth: c.truth, predicted: parsed.fields });
    if (process.env.OCR_EVAL_DEBUG) console.log(`--- ${c.id}\n${result.text}`);
  }

  const report = evaluateOcr(evalCases);
  console.log(`\n${formatReport(`OCR 影像層（Tesseract ${TESSERACT_LANGS} 端到端）`, report, IMAGE_LAYER_THRESHOLDS)}`);
  if (report.misses.length > 0) {
    console.log("未命中：");
    for (const m of report.misses) console.log(`  ${m.id} ${m.field}: 預期「${m.expected}」 實得「${m.actual}」`);
  }
  const failures = checkThresholds(report, IMAGE_LAYER_THRESHOLDS);
  console.log(failures.length === 0 ? "結果：通過" : `結果：未達門檻 → ${failures.join("；")}`);
  expect(failures).toEqual([]);
});
