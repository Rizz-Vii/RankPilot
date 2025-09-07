/**
 * Accessibility Announcer Component
 * Priority 3 Feature Implementation - DevReady Phase 3
 *
 * Provides ARIA live regions for dynamic content announcements
 */

import { accessibilityManager } from "@/lib/accessibility/accessibility-system";
import { useEffect, useRef } from "react";

export function AccessibilityAnnouncer() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = accessibilityManager.subscribe((announcement) => {
      const targetRef =
        announcement.priority === "assertive" ? assertiveRef : politeRef;
      if (targetRef.current) {
        targetRef.current.textContent = announcement.message;

        // Clear after a delay to avoid cluttering
        setTimeout(() => {
          if (targetRef.current) {
            targetRef.current.textContent = "";
          }
        }, 5000);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <div
        ref={politeRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      <div
        ref={assertiveRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      />
    </>
  );
}
