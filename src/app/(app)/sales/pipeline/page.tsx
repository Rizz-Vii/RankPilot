"use client";
// Sales - Pipeline
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export const metadata = { title: 'Sales Pipeline' };

export default function SalesPipelinePage() {
  const data = getMockMetrics('sales');
  useEffect(() => { trackDashboardView('sales'); }, []);
  return (
    <FeatureGate feature="sales_pipeline" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground max-w-3xl">Stage health, velocity, and conversion yield. Kanban + AI stage prediction coming soon.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        {data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map(q => (
                <div key={q.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{q.label}</span>
                    <span className="text-xs text-muted-foreground">{q.used}/{q.limit}</span>
                  </div>
                  <QuotaBar used={q.used} limit={q.limit} />
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pipeline Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Add Opportunity</p>
              <p className="text-xs text-muted-foreground">Create new opportunity with AI-enriched firmographics.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Stage Audit</p>
              <p className="text-xs text-muted-foreground">Run velocity + bottleneck analysis for current quarter.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Analyze</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">AI Forecast</p>
              <p className="text-xs text-muted-foreground">Generate probability-weighted forecast snapshot.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Run</button>
            </div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
