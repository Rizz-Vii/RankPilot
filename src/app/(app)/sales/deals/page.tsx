"use client";
// Sales - Deals
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useSalesDealsMetrics } from '@/hooks/useSalesDealsMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export default function SalesDealsPage() {
  const fallback = getMockMetrics('sales');
  const metrics = useSalesDealsMetrics();
  useEffect(() => { trackDashboardView('sales'); }, []);
  return (
    <FeatureGate feature="sales_deals" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground max-w-3xl">Active deal pipeline, probability distribution, and momentum indicators.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {(metrics.kpis.length ? metrics.kpis : fallback.kpis).map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Deal Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Add Deal</p><p className="text-xs text-muted-foreground">Register new deal with AI stage probability.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Reforecast</p><p className="text-xs text-muted-foreground">Run updated win-probability model.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Run</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Stalled Deals</p><p className="text-xs text-muted-foreground">List deals exceeding median stage duration.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Open</button></div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
