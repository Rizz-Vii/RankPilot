"use client";
// Sales - Outreach
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { fetchRecentSalesMetricsSnapshots } from '@/lib/services/sales-automation-snapshots';
import { ActionCard } from '@/components/shared/action-card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useProvenance } from '@/hooks/useProvenance';
import { NewSequenceModal } from '../_parts/new-sequence-modal';

export default function SalesOutreachPage() {
  const data = getMockMetrics('sales');
  const { user } = useAuth(); const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  const [snapMetrics, setSnapMetrics] = useState<any|null>(null); const [loadingSnap, setLoadingSnap] = useState(false); const [history, setHistory] = useState<any[]>([]);
  const { toast } = useToast();
  const { trigger, running } = useAutomationTrigger();
  const [seqOpen, setSeqOpen] = useState(false);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { trackDashboardView('sales'); }, []);
  useEffect(()=> { if(!userId) return; setLoadingSnap(true); let active=true; (async()=> { try { const m = await fetchRecentSalesMetricsSnapshots(userId, teamId,6); if(active){ if(m.length){ setSnapMetrics({ pipeline: m[0].pipeline, deals: m[0].totalDeals, won: m[0].closedWon, ts: m[0].createdAt?.toDate?.()||new Date() }); setHistory(m.map(s=> ({ pipeline: s.pipeline, ts: s.createdAt?.toDate?.()||new Date() }))); markLive(); } else { markFallback(); } } } finally { if(active) setLoadingSnap(false);} })(); return ()=> {active=false;}; }, [userId, teamId]);

  function runRefresh() { trigger('salesRefreshMetrics', { optimistic: () => setSnapMetrics((s: any) => s? { ...s, ts:new Date() }: s) }); }
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
          {data.kpis.map(k => (
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
