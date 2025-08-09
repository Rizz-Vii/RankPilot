"use client";
// Enterprise Marketing - Marketing Content Generation
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useState } from 'react';
import { useMarketingCampaignMetrics } from '@/hooks/useMarketingCampaignMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export default function MarketingContentGenerationPage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, rows: [], loading:false }) as any;
  useEffect(() => { trackDashboardView('marketing'); }, []);
  return (
    <FeatureGate feature="marketing_content_generation" requiredTier="enterprise" showUpgrade>
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Marketing Content Generation</h1>
          <p className="text-muted-foreground max-w-3xl">Multi-format asset generation with upcoming tone guardrails & compliance checks.</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map((k:any) => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Campaigns</h2>
          <LazyDataTable
            columns={[{ key:'name', header:'Name' }, { key:'channel', header:'Channel' }, { key:'impressions', header:'Impr.' }, { key:'ctr', header:'CTR %' }, { key:'leads', header:'Leads' }, { key:'roi', header:'ROI %' }]}
            rows={live.rows}
            loading={live.loading}
            empty="No campaign data"
          />
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Content Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Generate Asset</p><p className="text-xs text-muted-foreground">Create new copy or visual.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Generate</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Variant Testing</p><p className="text-xs text-muted-foreground">Produce A/B variants.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Tone Adjust</p><p className="text-xs text-muted-foreground">Refine tone & style.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Adjust</button></div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
