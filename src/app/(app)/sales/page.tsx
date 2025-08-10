"use client";
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DownloadCloud, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchSalesMetrics, AggregatedSalesMetrics, subscribeSalesMetrics, SalesDealDoc, ForecastSnapshotDoc } from '@/lib/services/sales-metrics.service';
import { SalesContextProvider } from './_parts/sales-context';
import { Badge } from '@/components/ui/badge';
import { AdaptiveProgress } from '@/components/ui/adaptive-progress';
import { StageDrilldownModal } from './_parts/stage-drilldown-modal';
import { ForecastVarianceModal } from './_parts/forecast-variance-modal';
import { useAuth } from '@/context/AuthContext';

const FunnelChart = dynamic(() => import('./_parts/funnel-stage-conversion.js').then(m => m.default), { ssr: false, loading: () => <Skeleton shimmer className="h-[260px] w-full" /> });
const ForecastVariance = dynamic(() => import('./_parts/forecast-variance.js').then(m => m.default), { ssr: false, loading: () => <Skeleton shimmer className="h-[260px] w-full" /> });
const PipelineCoverage = dynamic(() => import('./_parts/pipeline-coverage.js').then(m => m.default), { ssr: false, loading: () => <Skeleton shimmer className="h-[260px] w-full" /> });
const StageVelocity = dynamic(() => import('./_parts/stage-velocity.js').then(m => m.default), { ssr: false, loading: () => <Skeleton shimmer className="h-[260px] w-full" /> });

interface SalesKpiSummary { totalPipeline: number; weightedForecast: number; winRate: number; velocityDays: number; }

export default function SalesDashboardRoot() {
  const mock = getMockMetrics('sales');
  const [range, setRange] = useState<'30d' | '90d' | 'ytd'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [metrics, setMetrics] = useState<AggregatedSalesMetrics | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deals, setDeals] = useState<SalesDealDoc[] | undefined>();
  const [forecast, setForecast] = useState<ForecastSnapshotDoc[] | undefined>();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;
  const teamId = (user as any)?.teamId as string | undefined;
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [varianceOpen, setVarianceOpen] = useState(false);

  useEffect(() => { trackDashboardView('sales'); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('salesRange');
    if (stored === '30d' || stored === '90d' || stored === 'ytd') setRange(stored);
  }, []);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('salesRange', range); }, [range]);

  useEffect(() => {
    if (!userId && !authLoading) { setInitialLoading(false); return; }
    if (!userId) return;
    setRefreshing(true);
    let unsub: (() => void) | undefined;
    let active = true;
    (async () => {
      try {
        const res = await fetchSalesMetrics(userId, range, teamId);
        if (active) { setMetrics(res); setInitialLoading(false); }
      } catch { /* ignore */ }
      finally { if (active) setRefreshing(false); }
      unsub = subscribeSalesMetrics(userId, range, (m, ctx) => {
        setMetrics(m); setDeals(ctx.deals); setForecast(ctx.forecast); setInitialLoading(false);
      }, teamId);
    })();
    return () => { active = false; if (unsub) unsub(); };
  }, [userId, teamId, range, dataVersion, authLoading]);

  const summary: SalesKpiSummary = useMemo(() => {
    const ksource = metrics?.kpis || mock.kpis;
    const totalPipeline = ksource.find(k => /pipeline/i.test(k.key))?.value || 0;
    const weightedForecast = ksource.find(k => /forecast/i.test(k.key))?.value || Math.round(totalPipeline * 0.62);
    const winRate = ksource.find(k => /win/i.test(k.key))?.value || 27;
    const velocityDays = ksource.find(k => /velocity|cycle|avg_cycle/i.test(k.key))?.value || 34;
    return { totalPipeline, weightedForecast, winRate, velocityDays };
  }, [metrics, mock.kpis, dataVersion]);

  function handleRefresh() { setDataVersion(v => v + 1); }

  function exportSnapshot(format: 'json' | 'csv') {
    const rows = (metrics?.kpis || mock.kpis).map(k => ({ key: k.key, label: k.label, value: k.value, delta: k.delta }));
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sales-snapshot.json'; a.click(); URL.revokeObjectURL(url); return;
    }
    const header = 'key,label,value,delta';
    const body = rows.map(r => [r.key, r.label, r.value, r.delta ?? ''].join(','));
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sales-snapshot.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <FeatureGate feature="sales_pipeline" requiredTier="starter" showUpgrade>
      <SalesContextProvider data={metrics} range={range} refreshing={refreshing} deals={deals} forecast={forecast}>
        <div className="p-6 space-y-10">
          <ToolPageHeader
            title="Sales Dashboard"
            description="Pipeline momentum, stage conversion efficiency, forecast variance, and revenue predictability intelligence."
            badges={[{ label: teamId ? 'Team Scope' : 'User Scope', variant: 'outline' }, { label: 'Realtime', variant: 'secondary' }]}
          >
            <div className="flex gap-2">
              {(['30d', '90d', 'ytd'] as const).map(r => (
                <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} onClick={() => setRange(r)} aria-pressed={range === r} aria-label={`Select ${r} range`}>
                  {r.toUpperCase()}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => exportSnapshot('json')} className="gap-1" aria-label="Export sales snapshot JSON">
                <DownloadCloud className="h-4 w-4" /> JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportSnapshot('csv')} className="gap-1" aria-label="Export sales snapshot CSV">
                <DownloadCloud className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={handleRefresh} disabled={refreshing} className={cn('gap-1', refreshing && 'animate-pulse')} aria-live="polite" aria-busy={refreshing} aria-label="Refresh sales metrics">
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{refreshing ? 'Refreshing' : 'Refresh'}
              </Button>
            </div>
          </ToolPageHeader>

          <div className="sr-only" role="status" aria-live="polite">
            Sales summary: total pipeline {summary.totalPipeline.toLocaleString()}, weighted forecast {summary.weightedForecast.toLocaleString()}, win rate {summary.winRate} percent, average cycle {summary.velocityDays} days.
          </div>

          <section aria-label="Key performance indicators" className="grid gap-4 md:grid-cols-4">
            {initialLoading && Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" shimmer aria-label="Loading metric" />
            ))}
            {!initialLoading && (() => {
              type Ext = typeof mock.kpis[number] & { target?: number; invertTarget?: boolean };
              const base = (metrics?.kpis || mock.kpis) as typeof mock.kpis;
              const targetMap: Record<string, { target?: number; invertTarget?: boolean }> = {};
              metrics?.kpis?.forEach(k => { (targetMap as any)[k.key] = { target: (k as any).target, invertTarget: (k as any).invertTarget }; });
              const extended: Ext[] = base.map(k => ({ ...k, ...(targetMap[k.key] || {}) }));
              return extended.map(k => {
                const pctToTarget = k.target ? (k.invertTarget ? (k.target / (k.value || 1)) * 100 : (k.value / k.target) * 100) : null;
                const alertState = pctToTarget != null ? (k.invertTarget ? pctToTarget <= 100 : pctToTarget >= 100) : false;
                return (
                  <MetricCard
                    key={k.key}
                    label={k.label}
                    value={k.value.toLocaleString()}
                    delta={k.delta}
                    deltaLabel="vs last period"
                    trend={<TrendSparkline data={k.trend} />}
                    intent={k.intent || 'neutral'}
                    badge={k.target ? (<Badge variant={alertState ? 'default' : 'outline'} className="text-[10px]">{pctToTarget!.toFixed(0)}% target</Badge>) : undefined}
                    footer={k.target ? <AdaptiveProgress value={Math.min(100, pctToTarget!)} invert={false} aria-label={`${k.label} target progress`} /> : undefined}
                  />
                );
              });
            })()}
          </section>

          <section className="grid gap-6 md:grid-cols-2" aria-label="Pipeline analytics modules">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stage Conversion Funnel</h2>
              <FunnelChart key={dataVersion} onStageClick={(s: string) => setSelectedStage(s)} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Forecast Variance</h2>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setVarianceOpen(true)} aria-label="Open forecast variance table">Details</Button>
              </div>
              <ForecastVariance key={dataVersion} />
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pipeline Coverage & Health</h2>
              <PipelineCoverage key={dataVersion} />
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stage Velocity Distribution</h2>
              <StageVelocity key={dataVersion} />
            </div>
          </section>

          <section className="space-y-4" aria-label="Recommended next actions">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Next Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <ActionCard title="Add Deal" desc="Capture a new qualified opportunity with AI stage prediction." actionLabel="Create" />
              <ActionCard title="Review Stalled" desc="List deals exceeding median stage duration threshold." actionLabel="Open List" />
              <ActionCard title="Forecast Snapshot" desc="Generate updated probability-weighted forecast model." actionLabel="Run" />
            </div>
          </section>
        </div>
        <StageDrilldownModal stage={selectedStage} onOpenChange={(o) => !o && setSelectedStage(null)} />
        <ForecastVarianceModal open={varianceOpen} onOpenChange={setVarianceOpen} />
      </SalesContextProvider>
    </FeatureGate>
  );
}

interface ActionCardProps { title: string; desc: string; actionLabel: string; }
function ActionCard({ title, desc, actionLabel }: ActionCardProps) {
  return (
    <div className="rounded-xl border p-4 bg-background/50 space-y-2 focus-within:ring-2 focus-within:ring-primary/40 transition" tabIndex={-1}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={actionLabel + ' action'}>{actionLabel}</button>
    </div>
  );
}
