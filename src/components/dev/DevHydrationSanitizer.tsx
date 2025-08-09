"use client";

import { useEffect } from "react";

/**
 * DevHydrationSanitizer
 * In development, some browser extensions inject attributes (e.g., __gchrome_uniqueid)
 * onto form elements before React hydrates, causing mismatch warnings.
 * This component removes known problematic attributes on mount.
 */
export function DevHydrationSanitizer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      const selectors = ["input", "textarea", "select"];
      const nodes = document.querySelectorAll<HTMLElement>(selectors.join(","));
      nodes.forEach((el) => {
        // Remove Chrome extension unique id attribute if present
        if (el.hasAttribute("__gchrome_uniqueid")) {
          el.removeAttribute("__gchrome_uniqueid");
        }
      });
    } catch {
      // noop
    }
  }, []);

  return null;
}
