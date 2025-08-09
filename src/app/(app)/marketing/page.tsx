"use client";
// Marketing Dashboard Root
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

export const metadata = { title: 'Marketing Dashboard' };

export default function MarketingDashboardRoot() {
  const [months, setMonths] = useState(6);
  const live = useMarketingCampaignMetrics(months);
  const mock = getMockMetrics('marketing');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, quotas: mock.quotas, rows: [], loading:false }) as any;
    useEffect(() => { trackDashboardView('marketing'); }, []);
    return (
      <FeatureGate feature="marketing_email_campaigns" requiredTier="enterprise" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
          <p className="text-muted-foreground max-w-3xl">Full-funnel acquisition efficiency and campaign health. Using mock metrics until event + attribution feeds live.</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
        <section className="grid gap-4 md:grid-cols-4">
          {data.kpis.map((k:any) => (
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Growth Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Launch Campaign</p>
              <p className="text-xs text-muted-foreground">Create multi-channel campaign with AI asset generation.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Start</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Optimize Funnel</p>
              <p className="text-xs text-muted-foreground">Analyze step drop-offs and get AI recommendations.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Run Audit</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Generate Content</p>
              <p className="text-xs text-muted-foreground">Produce variant copy & creatives aligned to ICP & intent.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Generate</button>
            </div>
          </div>
        </section>
      </div>
      </FeatureGate>
    );
}
