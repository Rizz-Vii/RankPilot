"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      const payload = {
        message: err.message,
        stack: err.stack,
        componentStack: info?.componentStack,
        ts: Date.now(),
      };
      // Prefer beacon to avoid blocking; fall back to fetch.
      const body = JSON.stringify({ type: "client_error", payload });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/internal/metrics", body);
      } else {
        void fetch("/api/internal/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      }
      // Also surface to console with a clear tag for fast triage.
      console.error("[RB] Client ErrorBoundary caught:", payload);
    } catch {
      // Swallow
    }
  }

  override render() {
    // Don’t change UI; just log. Keep children to avoid masking issues.
    return this.props.children;
  }
}
