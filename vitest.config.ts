// vitest 4 + Node 26: 用 CJS 寫法才能被 configLoader 正確讀取 test.environment 欄位
// (原本的 ESM 寫法會被靜默忽略,jsdom 不會掛載)
const { defineConfig } = require("vitest/config");
const react = require("@vitejs/plugin-react");
const path = require("node:path");

module.exports = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});