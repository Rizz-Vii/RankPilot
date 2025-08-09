"use client";
// Content Briefs Dashboard
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { useContentBriefMetrics } from '@/hooks/useContentBriefMetrics';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export const metadata = { title: 'Content Briefs' };

export default function ContentBriefsPage() {
  const [months, setMonths] = useState(6);
  const live = useContentBriefMetrics(months);
  const isMobile = useIsMobile();
  // Fallback to marketing mock metrics until dedicated content mocks are added
  const mock = getMockMetrics('marketing');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, rows: [], loading: live.loading }) as any;
  // Track under marketing grouping for now (extend analytics taxonomy later)
  useEffect(() => { trackDashboardView('marketing'); }, []);

  return (
    <FeatureGate feature="content_briefs" requiredTier="agency" showUpgrade>
      <div className="p-4 sm:p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">Content Briefs</h1>
          <p className="text-muted-foreground max-w-3xl">Track creation velocity, word targets and optimization progress across recent briefs.</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
        <section className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
          {data.kpis.map((k: any) => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={Number(k.value).toLocaleString()}
              delta={k.delta}
              deltaLabel="vs prev"
              trend={<TrendSparkline data={k.trend} />}
              intent={k.intent || 'neutral'}
              size={isMobile ? 'sm' : 'md'}
            />
          ))}
        </section>
  <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Briefs</h2>
          <LazyDataTable
            columns={[
              { key: 'title', header: 'Title', render: (r: any) => r.brief?.title || r.title || '(Untitled)' },
              { key: 'keyword', header: 'Primary Keyword', render: (r: any) => r.brief?.primaryKeyword || r.primaryKeyword || '-' },
              { key: 'target', header: 'Word Target', render: (r: any) => r.brief?.seoGuidelines?.targetWordCount || r.brief?.targetWordCount || '-' },
              { key: 'period', header: 'Period', render: (r: any) => r.period || '-' },
            ]}
            rows={live.rows}
            loading={live.loading}
            empty="No brief data"
          />
        </section>
      </div>
    </FeatureGate>
  );
}
