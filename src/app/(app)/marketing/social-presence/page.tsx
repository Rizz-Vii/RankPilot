"use client";
// Enterprise Marketing - Social Presence
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useState } from 'react';
import { useMarketingCampaignMetrics } from '@/hooks/useMarketingCampaignMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export const metadata = { title: 'Social Presence | Marketing Automation' };

export default function SocialPresencePage() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, quotas: mock.quotas, rows: [], loading:false }) as any;
  useEffect(() => { trackDashboardView('marketing'); }, []);
  return (
    <FeatureGate feature="marketing_social_presence" requiredTier="enterprise" showUpgrade>
      <div className="space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Social Presence</h1>
          <p className="text-muted-foreground max-w-3xl">Multi-channel scheduling, engagement velocity & AI content optimization (pipeline forthcoming).</p>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Social Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Schedule Post</p><p className="text-xs text-muted-foreground">Queue cross-channel post.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Schedule</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Optimize Copy</p><p className="text-xs text-muted-foreground">AI adjust for channel tone.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Optimize</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Analyze Trends</p><p className="text-xs text-muted-foreground">Fetch latest engagement trend.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Analyze</button></div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
