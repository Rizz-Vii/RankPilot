// src/app/(app)/performance/page.tsx
"use client";

import { PerformanceDashboard } from "@/components/performance-dashboard";
import { ToolPageHeader } from "@/components/tool-page-header";
import Breadcrumb from "@/components/breadcrumb";

// Unified layout now mirrors Dashboard & Insights pages for consistency

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8" data-testid="performance-page">
      <Breadcrumb />
      <ToolPageHeader
        title="System Performance"
        description="Operational metrics for AI and caching subsystems."
        badges={[{ label: "Ops", variant: "outline" }]}
        showBreadcrumb={false}
      />
      <PerformanceDashboard />
      <section className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border" aria-label="Performance notes">
        <p><strong>Auto-Refresh:</strong> Metrics update every 10s while the panel is active. Pause to reduce API usage.</p>
        <p><strong>Health Status:</strong> Derived from error frequency & latency thresholds (p95 & failure ratio).</p>
      </section>
    </div>
  );
}
