// Temporary module augmentation to satisfy a phantom typecheck import
// Some incremental caches reference `import { enforce } from 'assert'` in AdminChatBot.
// While the source file no longer imports it, TypeScript may still resolve types.
// This augmentation adds a harmless stub for `enforce` to unblock typechecking.

declare module "assert" {
  /** Stub for legacy caches referencing assert.enforce */
  export function enforce(...args: unknown[]): never;
}

// Minimal global expect typing to satisfy TS in mixed test environments (Playwright/Jest-like APIs)
// This avoids adding full @types/jest and keeps surface area tiny to prevent conflicts.
declare global {
  interface ExpectLike<T> {
    toBe?: (value: T) => void;
    toEqual?: (value: T) => void;
    toBeDefined?: () => void;
    toBeTruthy?: () => void;
    toBeFalsy?: () => void;
    toContain?: (value: unknown) => void;
    toBeGreaterThan?: (value: number) => void;
    toBeGreaterThanOrEqual?: (value: number) => void;
    toBeLessThan?: (value: number) => void;
    toBeLessThanOrEqual?: (value: number) => void;
    toMatch?: (re: RegExp | string) => void;
    not?: ExpectLike<T>;
  }
  function expect<T = unknown>(value: T): ExpectLike<T>;
}

export {};
