"use client";
// Sales Dashboard Root
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export default function SalesDashboardRoot() {
  const data = getMockMetrics('sales');
  useEffect(() => { trackDashboardView('sales'); }, []);
  return (
    <FeatureGate feature="sales_pipeline" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground max-w-3xl">Pipeline momentum, conversion velocity, and forecasting performance. Data currently mock—replace with live aggregation service.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map(k => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={k.value.toLocaleString()}
              delta={k.delta}
              deltaLabel="vs last period"
              trend={<TrendSparkline data={k.trend} />}
              intent={k.intent || 'neutral'}
            />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Add Deal</p>
              <p className="text-xs text-muted-foreground">Capture a new qualified opportunity with AI stage prediction.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Review Stalled</p>
              <p className="text-xs text-muted-foreground">List of deals exceeding median stage duration.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Open List</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Forecast Snapshot</p>
              <p className="text-xs text-muted-foreground">Generate updated probability-weighted forecast model.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Run</button>
            </div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
