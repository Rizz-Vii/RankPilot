"use client";
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { fetchMarketingMetrics, subscribeMarketingMetrics, AggregatedMarketingMetrics } from '@/lib/services/marketing-metrics.service';
import { MarketingContextProvider } from './_parts/marketing-context';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { DownloadCloud, RefreshCw, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdaptiveProgress } from '@/components/ui/adaptive-progress';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { CampaignDetailModal } from './_parts/campaign-detail-modal';
import { ChannelBreakdownModal } from './_parts/channel-breakdown-modal';

// NOTE: Removed explicit .js extensions so Next/TypeScript can resolve the .tsx source files correctly.
const ImpressionsLeadsTrend = dynamic(()=> import('./_parts/impressions-leads-trend').then(m=> m.default), { ssr:false, loading: ()=> <Skeleton shimmer className="h-[260px] w-full" /> });
const ChannelPerformance = dynamic(()=> import('./_parts/channel-performance').then(m=> m.default), { ssr:false, loading: ()=> <Skeleton shimmer className="h-[260px] w-full" /> });

interface Summary { impr:number; leads:number; ctr:number; roi:number; }

export default function MarketingDashboardRoot(){
  const mock = getMockMetrics('marketing');
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  const [months, setMonths] = useState(6);
  const [metrics, setMetrics] = useState<AggregatedMarketingMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [campaignModal, setCampaignModal] = useState(false);
  const [channelModal, setChannelModal] = useState(false);

  useEffect(()=> { trackDashboardView('marketing'); }, []);
  useEffect(()=> { if(typeof window==='undefined') return; const stored = window.localStorage.getItem('marketingMonths'); if(stored){ const n = parseInt(stored,10); if([3,6,9,12].includes(n)) setMonths(n); } }, []);
  useEffect(()=> { if(typeof window!=='undefined') window.localStorage.setItem('marketingMonths', String(months)); }, [months]);

  useEffect(()=> {
    if(!userId && !authLoading){ setInitialLoading(false); return; }
    if(!userId) return;
    setRefreshing(true);
    let unsub: (()=>void)|undefined; let active = true;
    (async ()=> {
      try { const res = await fetchMarketingMetrics(userId, months, teamId); if(active){ setMetrics(res); setInitialLoading(false);} } catch{} finally { if(active) setRefreshing(false); }
      unsub = subscribeMarketingMetrics(userId, months, (m)=> { setMetrics(m); setInitialLoading(false); }, teamId);
    })();
    return ()=> { active=false; if(unsub) unsub(); };
  }, [userId, teamId, months, dataVersion, authLoading]);

  const summary: Summary = useMemo(()=> {
    const ks = metrics?.kpis || mock.kpis;
    const impr = ks.find(k=> k.key==='impr')?.value || 0;
    const leads = ks.find(k=> k.key==='leads')?.value || 0;
    const ctr = ks.find(k=> k.key==='ctr')?.value || 0;
    const roi = ks.find(k=> k.key==='roi')?.value || 0;
    return { impr, leads, ctr, roi };
  }, [metrics, mock.kpis]);

  function handleRefresh(){ setDataVersion(v=> v+1); }
  function exportSnapshot(format:'json'|'csv'){
    const rows = (metrics?.kpis || mock.kpis).map(k=> ({ key:k.key, label:k.label, value:k.value, delta:k.delta }));
    if(format==='json') { const blob = new Blob([JSON.stringify({ generatedAt:new Date().toISOString(), rows }, null,2)], { type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='marketing-snapshot.json'; a.click(); URL.revokeObjectURL(url); return; }
    const header='key,label,value,delta'; const body = rows.map(r=> [r.key,r.label,r.value,r.delta??''].join(',')); const blob = new Blob([[header,...body].join('\n')], { type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='marketing-snapshot.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <FeatureGate feature="marketing_email_campaigns" requiredTier="enterprise" showUpgrade>
      <MarketingContextProvider data={metrics} months={months} refreshing={refreshing}>
        <div className="p-6 space-y-10">
          <header className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
                <p className="text-muted-foreground max-w-3xl">Full-funnel acquisition efficiency and campaign health with realtime attribution.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[3,6,9,12].map(m=> (<Button key={m} size="sm" variant={months===m? 'default':'outline'} onClick={()=> setMonths(m)} aria-pressed={months===m}>{m}m</Button>))}
                <Button size="sm" variant="outline" onClick={()=> exportSnapshot('json')} className="gap-1" aria-label="Export marketing snapshot JSON"><DownloadCloud className="h-4 w-4" />JSON</Button>
                <Button size="sm" variant="outline" onClick={()=> exportSnapshot('csv')} className="gap-1" aria-label="Export marketing snapshot CSV"><DownloadCloud className="h-4 w-4" />CSV</Button>
                <Button size="sm" onClick={handleRefresh} disabled={refreshing} className={cn('gap-1', refreshing && 'animate-pulse')} aria-live="polite" aria-busy={refreshing}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{refreshing? 'Refreshing':'Refresh'}</Button>
                <Button size="sm" variant="outline" onClick={()=> setCampaignModal(true)} className="gap-1" aria-label="Open campaign detail"><BarChart3 className="h-4 w-4"/>Campaigns</Button>
                <Button size="sm" variant="outline" onClick={()=> setChannelModal(true)} className="gap-1" aria-label="Open channel breakdown"><BarChart3 className="h-4 w-4"/>Channels</Button>
              </div>
            </div>
            <div className="sr-only" role="status" aria-live="polite">Marketing summary: impressions {summary.impr.toLocaleString()}, leads {summary.leads.toLocaleString()}, CTR {summary.ctr} percent, ROI {summary.roi} percent.</div>
          </header>

          <section aria-label="Key performance indicators" className="grid gap-4 md:grid-cols-4">
            {initialLoading && Array.from({length:4}).map((_,i)=> (<Skeleton key={i} className="h-32 rounded-xl" shimmer aria-label="Loading metric" />))}
            {!initialLoading && (()=> {
              type Ext = typeof mock.kpis[number] & { target?: number; invertTarget?: boolean };
              const base = (metrics?.kpis || mock.kpis) as typeof mock.kpis;
              const targetMap: Record<string,{target?:number; invertTarget?:boolean}> = {};
              metrics?.kpis?.forEach(k=> { (targetMap as any)[k.key] = { target: (k as any).target, invertTarget: (k as any).invertTarget }; });
              const extended: Ext[] = base.map(k=> ({ ...k, ...(targetMap[k.key]||{}) }));
              return extended.map(k=> { const pct = k.target? (k.invertTarget? (k.target/(k.value||1))*100 : (k.value/(k.target||1))*100): null; const good = pct!=null? (k.invertTarget? pct<=100 : pct>=100): false; return (
                <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} badge={k.target? (<Badge variant={good? 'default':'outline'} className="text-[10px]">{pct!.toFixed(0)}% target</Badge>): undefined} footer={k.target? <AdaptiveProgress value={Math.min(100,pct!)} invert={!!k.invertTarget} aria-label={`${k.label} target progress`} />: undefined} /> ); });
            })()}
          </section>

          <section className="grid gap-6 md:grid-cols-2" aria-label="Marketing analytics modules">
            <div className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Impressions & Leads</h2><ImpressionsLeadsTrend key={dataVersion} /></div>
            <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Channel Performance</h2><Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={()=> setChannelModal(true)}>Details</Button></div><ChannelPerformance key={dataVersion} /></div>
          </section>

          <section className="space-y-3" aria-label="Recent campaigns table">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Campaigns</h2>
            <LazyDataTable columns={[{ key:'name', header:'Name' }, { key:'channel', header:'Channel' }, { key:'impressions', header:'Impr.' }, { key:'ctr', header:'CTR %' }, { key:'leads', header:'Leads' }, { key:'roi', header:'ROI %' }]} rows={(metrics?.campaigns|| []).slice(0,40).map(c=> { const ctr = c.impressions? (c.clicks||0)/c.impressions*100:0; const roi = c.spend? ((c.revenue||0) - (c.spend||0))/(c.spend||0)*100:0; return { ...c, ctr: Number(ctr.toFixed(2)), roi: Number(roi.toFixed(1)) }; })} loading={initialLoading} empty="No campaign data" />
          </section>

          {mock.quotas && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {mock.quotas.map(q=> (
                  <div key={q.key} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium"><span>{q.label}</span><span className="text-xs text-muted-foreground">{q.used}/{q.limit}</span></div>
                    <QuotaBar used={q.used} limit={q.limit} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4" aria-label="Growth actions">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Growth Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <ActionCard title="Launch Campaign" desc="Create multi-channel campaign with AI asset generation." actionLabel="Start" />
              <ActionCard title="Optimize Funnel" desc="Analyze step drop-offs and get AI recommendations." actionLabel="Run Audit" />
              <ActionCard title="Generate Content" desc="Produce variant copy & creatives aligned to ICP & intent." actionLabel="Generate" />
            </div>
          </section>
        </div>
        <CampaignDetailModal open={campaignModal} onOpenChange={setCampaignModal} />
        <ChannelBreakdownModal open={channelModal} onOpenChange={setChannelModal} />
      </MarketingContextProvider>
    </FeatureGate>
  );
}

interface ActionCardProps { title:string; desc:string; actionLabel:string; }
function ActionCard({ title, desc, actionLabel }: ActionCardProps){
  return (
    <div className="rounded-xl border p-4 bg-background/50 space-y-2 focus-within:ring-2 focus-within:ring-primary/40 transition" tabIndex={-1}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={actionLabel + ' action'}>{actionLabel}</button>
    </div>
  );
}
