"use client";

import { useEffect, useCallback } from "react";
import { useUI } from "@/context/UIContext";

interface KeyboardNavConfig {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableShortcuts?: boolean;
}

export function useKeyboardNavigation(config: KeyboardNavConfig = {}) {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableShortcuts = true,
  } = config;

  const { setLastFocusedElement, scrollToTop } = useUI();

  const handleTab = useCallback((e: KeyboardEvent) => {
    if (e.key === "Tab") {
      const focusable = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Store last focused element
      if (document.activeElement instanceof HTMLElement) {
        setLastFocusedElement(document.activeElement);
      }

      // Handle shortcuts
      if (enableShortcuts && e.ctrlKey) {
        switch (e.key) {
          case "Home":
            e.preventDefault();
            scrollToTop();
            break;
          // Add more shortcuts as needed
        }
      }
    },
    [enableShortcuts, scrollToTop, setLastFocusedElement]
  );

  useEffect(() => {
    if (enableShortcuts) {
      document.addEventListener("keydown", handleKeyDown);
    }
    if (enableTabNavigation) {
      document.addEventListener("keydown", handleTab);
    }

    return () => {
      if (enableShortcuts) {
        document.removeEventListener("keydown", handleKeyDown);
      }
      if (enableTabNavigation) {
        document.removeEventListener("keydown", handleTab);
      }
    };
  }, [enableShortcuts, enableTabNavigation, handleKeyDown, handleTab]);

  return null;
}
