"use client";
// Sales - Outreach
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { ActionCard } from '@/components/shared/action-card';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
import { useProvenance } from '@/hooks/useProvenance';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { fetchRecentSalesMetricsSnapshots } from '@/lib/services/sales-automation-snapshots';
import { useEffect, useState } from 'react';
import { NewSequenceModal } from '../_parts/new-sequence-modal';

export default function SalesOutreachPage() {
  const { data } = useMockDomainMetrics('sales', true);
  const { user } = useAuth();
  const userId = user?.uid;
  const teamId: string | undefined = ((): string | undefined => {
    if (!user || typeof user !== 'object') return undefined;
    const possible = (user as unknown as { teamId?: unknown }).teamId;
    return typeof possible === 'string' ? possible : undefined;
  })();
  interface OutreachHistory { pipeline: number; ts: Date }
  interface SalesMetricsSnapshot { pipeline: number; deals: number; won: number; ts: Date }
  const [snapMetrics, setSnapMetrics] = useState<SalesMetricsSnapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState<boolean>(false);
  const [history, setHistory] = useState<OutreachHistory[]>([]);
  const { trigger, running } = useAutomationTrigger();
  const [seqOpen, setSeqOpen] = useState(false);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { trackDashboardView('sales'); }, []);
  function toDateLike(v: unknown): Date {
    if (v instanceof Date) return v;
    if (v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>)) {
      const fn = (v as { toDate?: () => unknown }).toDate;
      if (typeof fn === 'function') {
        const d = fn();
        if (d instanceof Date) return d;
      }
    }
    return new Date();
  }
  useEffect(() => {
    if (!userId) return;
    setLoadingSnap(true);
    let active = true;
    void (async () => {
      try {
        const snapsRaw = await fetchRecentSalesMetricsSnapshots(userId, teamId, 6);
        if (!active) return;
        const toNum = (v: unknown) => (typeof v === 'number' ? v : 0);
        if (Array.isArray(snapsRaw) && snapsRaw.length) {
          const first = snapsRaw[0];
          setSnapMetrics({
            pipeline: toNum(first.pipeline),
            deals: toNum(first.totalDeals),
            won: toNum(first.closedWon),
            ts: toDateLike(first.createdAt)
          });
          setHistory(
            snapsRaw.map((s) => ({
              pipeline: toNum(s.pipeline),
              ts: toDateLike(s.createdAt)
            }))
          );
          markLive();
        } else {
          markFallback();
        }
      } finally {
        if (active) setLoadingSnap(false);
      }
    })();
    return () => { active = false; };
  }, [userId, teamId, markLive, markFallback]);

  function runRefresh() { void trigger('salesRefreshMetrics', { optimistic: () => setSnapMetrics(s => s ? { ...s, ts: new Date() } : s) }); }
  return (
    <FeatureGate feature="sales_outreach" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-10">
        <NewSequenceModal open={seqOpen} onOpenChange={setSeqOpen} onCreated={()=> {/* no immediate metric impact */}} />
  <ToolPageHeader
          title="Outbound Outreach"
          description="Sequence performance, reply velocity & optimization insights across outbound motions."
          badges={[{ label: teamId? 'Team Scope':'User Scope', variant:'outline'}]}
        >
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={()=> setSeqOpen(true)}>New Sequence</Button>
            <Button size="sm" variant="outline">Optimize Copy</Button>
            <Button size="sm" variant="default">Import Leads</Button>
          </div>
        </ToolPageHeader>
  <ProvenanceLegend />
        {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loadingSnap && snapMetrics && (
          <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs" aria-label="Latest metrics snapshot">
            <div className="space-y-1"><p className="font-medium">Last Metrics Snapshot</p><p className="text-muted-foreground">Pipeline {snapMetrics.pipeline.toLocaleString()} · Deals {snapMetrics.deals} · Won {snapMetrics.won}</p>
              {history.length>1 && (
                <div className="flex gap-1 items-end mt-1" aria-label="Pipeline mini history">
                  {history.slice(0,8).reverse().map((h,i)=> { const max = Math.max(...history.map(x=> x.pipeline)); const pct = max? Math.max(4, Math.round((h.pipeline / max)*32)) : 4; return <span key={i} className="inline-block w-1.5 rounded-sm bg-primary/70" style={{height: pct}} aria-hidden="true" />; })}
                </div>
              )}
            </div>
            <time className="text-[10px] text-muted-foreground" dateTime={snapMetrics.ts.toISOString()}>{snapMetrics.ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {(data?.kpis || []).map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outreach Workbench</h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ActionCard title="New Sequence" desc="AI-personalized multi-step" action="Create" onClick={()=> setSeqOpen(true)} />
            <ActionCard title="Optimize Copy" desc="Improve open & reply rates" action="Optimize" />
            <ActionCard title="Import Leads" desc="Bulk import + enrichment" action="Import" />
            <ActionCard title="Reply Analysis" desc="Sentiment & intent signals" action="Analyze" />
            <ActionCard title="Refresh Metrics" desc="Force metrics snapshot" action="Run" onClick={runRefresh} loading={!!running['salesRefreshMetrics']} loadingLabel="Refreshing" />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
