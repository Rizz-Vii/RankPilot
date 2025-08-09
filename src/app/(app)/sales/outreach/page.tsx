"use client";
// Sales - Outreach
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export default function SalesOutreachPage() {
  const data = getMockMetrics('sales');
  useEffect(() => { trackDashboardView('sales'); }, []);
  return (
    <FeatureGate feature="sales_outreach" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Outbound Outreach</h1>
          <p className="text-muted-foreground max-w-3xl">Sequence generation performance & communication velocity. AI template optimization coming soon.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outreach Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">New Sequence</p><p className="text-xs text-muted-foreground">Generate AI-personalized sequence.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Optimize Copy</p><p className="text-xs text-muted-foreground">Refine messaging for top sequences.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Optimize</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Import Leads</p><p className="text-xs text-muted-foreground">Bulk import + enrichment pipeline.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Import</button></div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
