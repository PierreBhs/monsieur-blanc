import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

const testStorage = (() => {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key: string) {
      return items.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(items.keys())[index] ?? null;
    },
    removeItem(key: string) {
      items.delete(key);
    },
    setItem(key: string, value: string) {
      items.set(key, String(value));
    },
  } satisfies Storage;
})();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testStorage,
});

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: testStorage,
});

// jsdom has no ResizeObserver; the FitText component observes its parent on
// mount. A no-op stub lets components that use it render under test.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;
}

// Unmount React trees rendered during a test so they don't leak into the next one.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
