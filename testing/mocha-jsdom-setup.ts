// Global jsdom + helper setup for mocha TS tests
// @ts-ignore - ambient types may not be installed in minimal test env
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!doctype html><html><head></head><body></body></html>",
  {
    url: "http://localhost/",
    pretendToBeVisual: true,
  }
);

// Expose globals
// @ts-ignore
global.window = dom.window;
// @ts-ignore
global.document = dom.window.document;
// @ts-ignore
global.navigator = { userAgent: "node.js" };
// @ts-ignore
global.localStorage = {
  _s: {} as Record<string, string>,
  getItem(k: string) {
    return this._s[k] || null;
  },
  setItem(k: string, v: string) {
    this._s[k] = v;
  },
  removeItem(k: string) {
    delete this._s[k];
  },
};
// Provide matchMedia mocks
// @ts-ignore
global.window.matchMedia = (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});

// Simple cookie shim
Object.defineProperty(document, "cookie", {
  get() {
    return (dom.window as unknown as { _cookie?: string })._cookie || "";
  },
  set(v: string) {
    (dom.window as unknown as { _cookie?: string })._cookie = v;
  },
});

export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}
