"use client";

import type { ChartExportConfig } from "@/lib/visualizations/d3-visualization-engine";
import { exportChartClient } from "@/lib/visualizations/export-client";
import { useCallback, useState } from "react";
import { toast as sonnerToast } from "sonner";
// Optional Sentry: dynamically imported client-side to avoid SSR require()
let Sentry: { captureException?: (...args: unknown[]) => void } | null = null;
if (typeof window !== "undefined") {
  import("@sentry/nextjs")
    .then((mod) => {
      Sentry = mod as unknown as {
        captureException?: (...args: unknown[]) => void;
      };
    })
    .catch(() => {
      /* ignore */
    });
}

type Props = {
  chartId: string;
  format: "png" | "svg" | "pdf" | "json";
  label?: string;
  config?: Partial<ChartExportConfig>;
  onDone?: (url: string) => void;
};

export function ExportButton({
  chartId,
  format,
  label,
  config,
  onDone,
}: Props): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exportChartClient(
        chartId,
        { format, ...(config || {}) },
        { openInNewTab: false }
      );
      sonnerToast.success("Export ready", {
        description: `${format.toUpperCase()} generated`,
      });
      onDone?.(res.exportUrl);
      // Fallback: open in new tab if no handler
      if (!onDone) {
        window.open(res.exportUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e: unknown) {
      let msg = "Export failed";
      if (typeof e === "object" && e && "message" in e) {
        const maybeMessage = (e as { message?: unknown }).message;
        if (typeof maybeMessage === "string") msg = maybeMessage;
      }
      setError(msg);
      sonnerToast.error("Export failed", { description: msg });
      try {
        Sentry?.captureException?.(e, {
          level: "error",
          tags: { feature: "visualizations-export", format },
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [chartId, config, format, onDone]);

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
      onClick={() => {
        void onClick();
      }}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? "Exporting…" : label || `Export ${format.toUpperCase()}`}
      {error && (
        <span role="alert" className="ml-2 text-xs text-destructive">
          {error}
        </span>
      )}
    </button>
  );
}
