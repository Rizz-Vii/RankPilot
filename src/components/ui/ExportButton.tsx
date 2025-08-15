"use client";

import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { exportChartClient } from '@/lib/visualizations/export-client';
// Optional Sentry: only import if available in runtime to avoid SSR issues
let Sentry: any = null;
try { Sentry = require('@sentry/nextjs'); } catch {}

type Props = {
  chartId: string;
  format: 'png' | 'svg' | 'pdf' | 'json';
  label?: string;
  config?: Partial<import('@/lib/visualizations/d3-visualization-engine').ChartExportConfig>;
  onDone?: (url: string) => void;
};

export function ExportButton({ chartId, format, label, config, onDone }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exportChartClient(chartId, { format, ...(config || {}) } as any, { openInNewTab: false });
      sonnerToast.success('Export ready', { description: `${format.toUpperCase()} generated` });
      onDone?.(res.exportUrl);
      // Fallback: open in new tab if no handler
      if (!onDone) window.open(res.exportUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      const msg = e?.message || 'Export failed';
      setError(msg);
      sonnerToast.error('Export failed', { description: msg });
      try { Sentry?.captureException?.(e, { level: 'error', tags: { feature: 'visualizations-export', format } }); } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? 'Exporting…' : (label || `Export ${format.toUpperCase()}`)}
      {error && (
        <span role="alert" className="ml-2 text-xs text-destructive">{error}</span>
      )}
    </button>
  );
}
