// Minimal standalone runner to validate ThemeSystem cycle without mocha.
import Module from "module";
import path from "path";

// Mock classListManager alias resolution before importing theme system
const originalResolve = (
  Module as unknown as { _resolveFilename: (...args: unknown[]) => string }
)._resolveFilename;
(
  Module as unknown as { _resolveFilename: (...args: unknown[]) => string }
)._resolveFilename = function (...args: unknown[]) {
  const [request] = args as [string, ...unknown[]];
  if (request === "@/lib/dom/classListManager") {
    return path.join(
      process.cwd(),
      "testing/unit/theme/__classListManagerMock__.ts"
    );
  }
  return originalResolve.apply(this, args as []);
};

// Provide minimal DOM if absent
if (typeof document === "undefined") {
  const styleStore: Record<string, string> = {};
  const style = {
    setProperty: (k: string, v: string) => {
      styleStore[k] = v;
    },
  };
  const classSet = new Set<string>();
  const fakeClassList: DOMTokenList = {
    length: 0,
    value: "",
    add: (...tokens: string[]) => {
      tokens.forEach((t) => classSet.add(t));
      // keep body.className in sync after body defined
      // @ts-ignore
      if (global.document?.body) {
        // @ts-ignore
        global.document.body.className = fakeClassList.value;
      }
    },
    remove: (...tokens: string[]) => {
      tokens.forEach((t) => classSet.delete(t));
      // @ts-ignore
      if (global.document?.body) {
        // @ts-ignore
        global.document.body.className = fakeClassList.value;
      }
    },
    contains: (token: string) => classSet.has(token),
    toggle: (token: string, force?: boolean) => {
      const has = classSet.has(token);
      const shouldHave = force === undefined ? !has : !!force;
      if (shouldHave) classSet.add(token);
      else classSet.delete(token);
      // @ts-ignore
      if (global.document?.body) {
        // @ts-ignore
        global.document.body.className = fakeClassList.value;
      }
      return shouldHave;
    },
    item: (index: number) => Array.from(classSet)[index] ?? null,
    replace: (oldToken: string, newToken: string) => {
      const had = classSet.delete(oldToken);
      classSet.add(newToken);
      // @ts-ignore
      if (global.document?.body) {
        // @ts-ignore
        global.document.body.className = fakeClassList.value;
      }
      return had;
    },
    supports: () => true,
    entries: function* () {
      for (const v of classSet.values()) yield [v, v] as [string, string];
    },
    forEach: (
      callback: (value: string, key: string, parent: DOMTokenList) => void
    ) => {
      for (const v of classSet.values()) callback(v, v, fakeClassList);
    },
    keys: function* () {
      for (const v of classSet.values()) yield v;
    },
    values: function* () {
      for (const v of classSet.values()) yield v;
    },
    [Symbol.iterator]: function* () {
      for (const v of classSet.values()) yield v;
    },
    toString: () => Array.from(classSet).join(" "),
  } as const as unknown as DOMTokenList;

  // Define read-only getters for value/length to satisfy DOMTokenList contract
  // @ts-ignore
  Object.defineProperty(fakeClassList, "value", {
    get() {
      return Array.from(classSet).join(" ");
    },
    configurable: true,
  });
  // @ts-ignore
  Object.defineProperty(fakeClassList, "length", {
    get() {
      return classSet.size;
    },
    configurable: true,
  });

  const body = {
    className: "",
    classList: fakeClassList,
  } as unknown as HTMLBodyElement;
  // @ts-ignore
  global.document = { documentElement: { style }, body } as unknown;
  // @ts-ignore
  global.__styleStore = styleStore;
  // Mock localStorage & document.cookie for persistence calls
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
  // @ts-ignore
  global.document.cookie = "";
}

// Ensure body exists before importing theme system
if (typeof document !== "undefined" && !document.body) {
  // @ts-ignore
  document.body = {
    className: "",
    classList:
      (global as any).document?.body?.classList ??
      ({
        add() {},
        remove() {},
        contains() {
          return false;
        },
        length: 0,
        value: "",
        item() {
          return null;
        },
        replace() {
          return false;
        },
        toggle() {
          return false;
        },
        supports() {
          return true;
        },
        entries() {
          return [][Symbol.iterator]();
        },
        forEach() {},
        keys() {
          return [][Symbol.iterator]();
        },
        values() {
          return [][Symbol.iterator]();
        },
        [Symbol.iterator]() {
          return [][Symbol.iterator]();
        },
        toString() {
          return "";
        },
      } as unknown as DOMTokenList),
  } as unknown as HTMLBodyElement;
}
// Force load theme system (which will then call applyTheme when constructed)
import type { ThemeMode } from "../../../src/lib/themes/theme-system";
import { themeSystem } from "../../../src/lib/themes/theme-system";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

try {
  const order: ThemeMode[] = ["light", "dark", "high-contrast", "auto"];
  // Kick initial application
  themeSystem.setTheme("light");
  for (const mode of order) {
    themeSystem.setTheme(mode);
    const bodyClass = document.body.className;
    console.log("After setTheme", mode, "->", bodyClass);
    if (!/theme-(light|dark|high-contrast)/.test(bodyClass)) {
      throw new Error(
        `Missing theme-* class after setting ${mode}: ${bodyClass}`
      );
    }
    if (mode === "dark") {
      assert(themeSystem.isDark(), "isDark() should be true in dark mode");
    }
    if (mode === "high-contrast") {
      assert(themeSystem.isHighContrast(), "isHighContrast() should be true");
      assert(!themeSystem.isDark(), "isDark() must be false in high-contrast");
    }
  }
  // Basic CSS var check
  // @ts-ignore
  const vars = global.__styleStore as Record<string, string> | undefined;
  if (vars) {
    assert(
      Object.keys(vars).some((k) => k === "--background"),
      "Expected --background variable to be set"
    );
  }
  console.log("Theme cycle runner: PASS");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Theme cycle runner: FAIL ->", msg);
  process.exitCode = 1;
}
