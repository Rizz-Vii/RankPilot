// Centralized body class mutation utility to avoid race conditions between theme & i18n systems
// Provides idempotent operations and ordered application.

export type ClassSection = "base" | "flags" | "lang" | "theme";

interface BodyClassState {
  base: Set<string>;
  flags: Set<string>;
  lang: Set<string>;
  theme: Set<string>;
}

const state: BodyClassState = {
  base: new Set(["font-body", "antialiased", "h-full"]),
  flags: new Set(),
  lang: new Set(["lang-en"]),
  theme: new Set(["theme-dark"]),
};

function rebuild() {
  const ordered = [
    ...state.base,
    ...state.flags,
    ...state.lang,
    ...state.theme,
  ];
  document.body.className = ordered.join(" ");
}

export function setLanguageClass(code: string, dir: "ltr" | "rtl") {
  state.lang.forEach((c) => {
    if (c.startsWith("lang-")) state.lang.delete(c);
  });
  state.lang.add(`lang-${code}`);
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
  rebuild();
}

export function setThemeClass(theme: string, highContrast: boolean) {
  state.theme.forEach((c) => {
    if (c.startsWith("theme-")) state.theme.delete(c);
  });
  state.theme.add(`theme-${highContrast ? "high-contrast" : theme}`);
  rebuild();
}

export function setFlag(flag: string, enabled: boolean) {
  if (enabled) state.flags.add(flag);
  else state.flags.delete(flag);
  rebuild();
}

export function getBodyClassSnapshot() {
  return document.body.className;
}
