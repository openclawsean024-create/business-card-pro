// `npm run eval:ocr` / `npm run eval:ocr:images` 專用設定（GOAL.md M1 AC-003）。
// 與 vitest.config.ts 分開：評估檔（*.eval.ts）不會被 `npm test` 收進去，
// 影像層評估需要 Node 環境與較長的逾時。CJS 寫法理由同 vitest.config.ts。
const { defineConfig } = require("vitest/config");
const path = require("node:path");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["scripts/eval/**/*.eval.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    reporters: ["default"],
    silent: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
