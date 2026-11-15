// GOAL.md M1 AC-001／AC-008：合併 business-card-manager 的護欄
// 把 GOAL.md 的驗證指令寫成測試，確保之後不會不小心帶入伺服器端依賴或讓 CI 假綠燈。
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out", "coverage", ".vercel"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(ROOT, full));
  }
  return out;
}

const repoFiles = walk(ROOT);
const srcFiles = repoFiles.filter((f) => f.startsWith("src/") && /\.(ts|tsx|js|mjs)$/.test(f));

describe("AC-001: 合併 manager 的 OCR 與拍照輸入，不帶入伺服器端依賴", () => {
  it("AC-001: package.json 沒有 Prisma／登入／Stripe／bcrypt／Telegram 依賴", () => {
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const exact = ["@prisma/client", "prisma", "next-auth", "stripe", "bcryptjs", "bcrypt", "telegraf", "node-telegram-bot-api"];
    const bad = names.filter((n) => exact.includes(n) || n.startsWith("@auth/") || n.startsWith("@prisma/") || n.startsWith("@stripe/"));
    expect(bad).toEqual([]);
  });

  it("AC-001: next.config.ts 維持 output: \"export\"（static export、local-only）", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    expect(config).toMatch(/output:\s*"export"/);
  });

  it("AC-001: 沒有 API route、server actions、Prisma schema 或資料庫檔", () => {
    expect(existsSync(join(ROOT, "src/app/api"))).toBe(false);
    expect(existsSync(join(ROOT, "prisma"))).toBe(false);
    const directive = new RegExp(`["']use ${"server"}["']`);
    const serverActions = srcFiles.filter((f) => directive.test(readFileSync(join(ROOT, f), "utf8")));
    expect(serverActions).toEqual([]);
    const dataFiles = repoFiles.filter((f) => /\.(db|sqlite|sqlite3)$/i.test(f) || /(^|\/)\.env(\.|$)/.test(f));
    expect(dataFiles.filter((f) => !f.endsWith(".env.example"))).toEqual([]);
  });

  it("AC-001: OCR 模組在 src/lib/ocr，Tesseract 是 npm 依賴而不是執行時插入的 CDN <script>", () => {
    for (const f of ["engine.ts", "parse.ts", "types.ts", "index.ts"]) {
      expect(existsSync(join(ROOT, "src/lib/ocr", f)), f).toBe(true);
    }
    expect(existsSync(join(ROOT, "src/components/OcrCapture.tsx"))).toBe(true);
    expect(pkg.dependencies["tesseract.js"]).toBeTruthy();
    const appFiles = srcFiles.filter((f) => !f.startsWith("src/test/"));
    const injectsScript = appFiles.filter((f) => /createElement\(\s*["']script["']\s*\)/.test(readFileSync(join(ROOT, f), "utf8")));
    expect(injectsScript).toEqual([]);
  });

  it("AC-001: 不保存 OCR 原始文字（manager 的 ocrRawText／ocrEngine／sourceMeta 欄位不搬）", () => {
    const types = readFileSync(join(ROOT, "src/lib/types.ts"), "utf8");
    for (const field of ["ocrRawText", "ocrEngine", "sourceMeta"]) expect(types).not.toContain(field);
  });
});

describe("AC-008: 品質門檻", () => {
  it("AC-008: CI 的 test 步驟不會吞掉測試失敗", () => {
    const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
    const testLines = ci.split("\n").filter((l) => /npm (run )?test\b/.test(l));
    expect(testLines.length).toBeGreaterThan(0);
    for (const line of testLines) expect(line).not.toMatch(/\|\|/);
  });

  it("AC-008: quality gate 依序執行 npm ci → typecheck → test → build → lint", () => {
    const gate = readFileSync(join(ROOT, "scripts/quality-gate.sh"), "utf8");
    const order = ["npm ci --legacy-peer-deps", "npm run typecheck", "npm test", "npm run build", "npm run lint"].map((cmd) => gate.indexOf(cmd));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(gate).toMatch(/set -euo pipefail/);
  });

  it("AC-008: test:coverage 需要的 @vitest/coverage-v8 已列入 devDependencies", () => {
    expect(pkg.scripts["test:coverage"]).toBe("vitest run --coverage");
    expect(pkg.devDependencies["@vitest/coverage-v8"]).toBeTruthy();
  });

  it("AC-008: M1 之前的 9 個測試檔都還在", () => {
    const existing = [
      "a11y-axe.test.tsx",
      "a11y.test.tsx",
      "calendar.test.ts",
      "domain.test.ts",
      "interactions.test.tsx",
      "layout.test.tsx",
      "onboarding.test.tsx",
      "store.test.ts",
      "workstation.test.tsx",
    ];
    for (const f of existing) expect(existsSync(join(ROOT, "src/test", f)), f).toBe(true);
  });
});
