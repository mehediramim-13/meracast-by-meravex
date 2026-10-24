import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 22 exposes an experimental `localStorage` global that is undefined
// unless the process runs with --localstorage-file. Zustand's persist middleware
// reads the global, so point it at jsdom's implementation before app modules
// are imported by the test files.
if (typeof window !== "undefined") {
  const memory = new Map<string, string>();
  const fallback: Storage = {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: (key) => memory.get(key) ?? null,
    key: (index) => Array.from(memory.keys())[index] ?? null,
    removeItem: (key) => {
      memory.delete(key);
    },
    setItem: (key, value) => {
      memory.set(key, String(value));
    },
  };

  let storage: Storage = fallback;
  try {
    if (window.localStorage) storage = window.localStorage;
  } catch {
    // jsdom can reject localStorage for opaque origins; the memory fallback is enough.
  }

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
