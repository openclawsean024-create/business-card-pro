import "@testing-library/jest-dom/vitest";

// jsdom 29 + Node 22+ 預設不提供 window.localStorage。
// 既有測試大量使用 window.localStorage.clear() / getItem / setItem,補一個
// 輕量的 in-memory polyfill,避免每個 beforeEach 都重複 try/catch。
if (typeof window !== "undefined" && typeof window.localStorage === "undefined") {
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    get length(): number {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}