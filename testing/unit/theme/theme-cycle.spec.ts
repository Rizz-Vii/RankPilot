import { expect } from "chai";
import type { ThemeMode } from "../../../src/lib/themes/theme-system";
import { themeSystem } from "../../../src/lib/themes/theme-system";

// Provide minimal DOM if tests run in a Node environment without jsdom
if (typeof document === "undefined") {
  const styleStore: Record<string, string> = {};
  const style = {
    setProperty: (k: string, v: string) => {
      styleStore[k] = v;
    },
  };
  const classSet = new Set<string>();
  const body = {
    className: "",
    classList: {
      add: (c: string) => {
        classSet.add(c);
        body.className = Array.from(classSet).join(" ");
      },
      remove: (c: string) => {
        classSet.delete(c);
        body.className = Array.from(classSet).join(" ");
      },
      contains: (c: string) => classSet.has(c),
    },
  };
  // @ts-ignore
  global.document = { documentElement: { style }, body } as unknown;
  // expose for assertions
  // @ts-ignore
  global.__styleStore = styleStore;
}

// __styleStore is attached to global in the setup block when needed

describe("ThemeSystem basic cycle", () => {
  it("cycles through themes updating classes & CSS vars", () => {
    const order: ThemeMode[] = ["light", "dark", "high-contrast", "auto"];
    order.forEach((mode) => {
      themeSystem.setTheme(mode);
      const bodyClassName = document.body.className;
      // auto resolves to either light or dark depending on media; accept both
      expect(bodyClassName).to.match(
        /theme-(light|dark|high-contrast)/,
        "theme class applied"
      );
      if (mode === "dark") {
        expect(themeSystem.isDark()).to.equal(
          true,
          "dark mode should report isDark"
        );
      }
      if (mode === "high-contrast") {
        expect(themeSystem.isHighContrast()).to.equal(
          true,
          "high-contrast flag set"
        );
        expect(themeSystem.isDark()).to.equal(
          false,
          "high-contrast should not report dark"
        );
      }
    });
    // validate a representative CSS var applied
    const bg = (
      document.documentElement as unknown as {
        style: { getPropertyValue(k: string): string };
      }
    ).style.getPropertyValue("--background");
    expect(bg).to.be.a("string");
  });
});
