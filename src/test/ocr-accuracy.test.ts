// GOAL.md M1 AC-003：OCR 準確度 — 文字層（parser）納入 npm test
// 測試集全部是 scripts/gen-ocr-fixtures.mjs 產生的合成假名片，沒有任何真實個資。
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCardHeuristic } from "@/lib/ocr/parse";
import {
  TEXT_LAYER_THRESHOLDS,
  checkThresholds,
  evaluateOcr,
  formatReport,
  type OcrEvalCase,
  type OcrTruth,
} from "@/lib/ocr/evaluate";
import { digitsOnly } from "@/lib/ocr/normalize";

interface TextCase {
  id: string;
  category: string;
  rawText: string;
  truth: OcrTruth;
}

const FIXTURE_DIR = join(process.cwd(), "src/test/fixtures/ocr");
const textCases = (JSON.parse(readFileSync(join(FIXTURE_DIR, "text-cases.json"), "utf8")) as { cases: TextCase[] }).cases;
const imageTruths = readdirSync(join(FIXTURE_DIR, "images"))
  .filter((f) => /^card-\d+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(FIXTURE_DIR, "images", f), "utf8")) as { id: string; image: string; truth: OcrTruth });

function assertFakeData(truth: OcrTruth, id: string) {
  expect(truth.name, `${id} name`).toMatch(/^(測試|Test) /);
  expect(truth.company, `${id} company`).toMatch(/範例|Example/);
  expect(truth.email, `${id} email`).toMatch(/@example\.com$/);
  // 0900-000-001～099 或 02-0000-0001～0099（可帶分機）
  expect(digitsOnly(truth.phone ?? ""), `${id} phone`).toMatch(/^(0900000(?!000)0\d{2}|02000000(?!00)\d{2})\d{0,5}$/);
}

describe("AC-003: OCR 合成測試集的組成", () => {
  it("AC-003: 文字層 ≥60 筆，五類各 ≥10 筆", () => {
    expect(textCases.length).toBeGreaterThanOrEqual(60);
    for (const category of ["zh-horizontal", "zh-vertical", "mixed", "english", "noisy"]) {
      const n = textCases.filter((c) => c.category === category).length;
      expect(n, category).toBeGreaterThanOrEqual(10);
    }
  });

  it("AC-003: 影像層 ≥30 張，每張都有 ground truth 與對應的 PNG", () => {
    expect(imageTruths.length).toBeGreaterThanOrEqual(30);
    const files = new Set(readdirSync(join(FIXTURE_DIR, "images")));
    for (const t of imageTruths) expect(files.has(t.image), t.id).toBe(true);
  });

  it("AC-003: 測試集只含明顯的假資料（測試／Test 姓名、保留號段、@example.com、範例／Example 公司）", () => {
    for (const c of textCases) assertFakeData(c.truth, c.id);
    for (const t of imageTruths) assertFakeData(t.truth, t.id);
    // 原始文字裡也不得出現 example.com 以外的 Email 網域
    for (const c of textCases) {
      const half = c.rawText.replace(/[！-～]/g, (ch) => String.fromCodePoint((ch.codePointAt(0) ?? 0) - 0xfee0));
      const domains = [...half.replace(/\s+/g, "").matchAll(/@([A-Za-z0-9.-]+)/g)].map((m) => m[1] ?? "");
      for (const d of domains) expect("example.com".startsWith(d) || d.startsWith("example.com"), `${c.id} ${d}`).toBe(true);
    }
  });
});

describe("AC-003: OCR 準確度 — 文字層門檻", () => {
  const evalCases: OcrEvalCase[] = textCases.map((c) => ({
    id: c.id,
    category: c.category,
    truth: c.truth,
    predicted: parseCardHeuristic(c.rawText).fields,
  }));
  const report = evaluateOcr(evalCases);

  it("AC-003: Email ≥98%、電話 ≥95%、姓名 ≥90%、公司 ≥90%、職稱 ≥85%、平均 ≥92%", () => {
    const failures = checkThresholds(report, TEXT_LAYER_THRESHOLDS);
    if (failures.length > 0) console.error(formatReport("OCR 文字層", report, TEXT_LAYER_THRESHOLDS));
    expect(failures).toEqual([]);
  });

  it("AC-003: 門檻常數與 GOAL.md 初版數字一致", () => {
    expect(TEXT_LAYER_THRESHOLDS).toEqual({ email: 0.98, phone: 0.95, name: 0.9, company: 0.9, title: 0.85, average: 0.92 });
  });
});
