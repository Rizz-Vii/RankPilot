"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { fetchFinanceMetrics, subscribeFinanceMetrics, AggregatedFinanceMetrics } from '@/lib/services/finance-metrics.service';
import { FinanceContextProvider } from './_parts/finance-context';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { DownloadCloud, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AdaptiveProgress } from '@/components/ui/adaptive-progress';
import { InvoiceDetailModal } from './_parts/invoice-detail-modal';
import { OnTimeBreakdownModal } from './_parts/on-time-breakdown-modal';

import MrrTrend from './_parts/mrr-trend';
import InvoiceAging from './_parts/invoice-aging';

interface Summary { mrr: number; churn: number; ltv: number; onTime?: number; }

export default function FinanceDashboardRoot() {
  const mock = getMockMetrics('finance');
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  const [months, setMonths] = useState(6);
  const [metrics, setMetrics] = useState<AggregatedFinanceMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [showOnTime, setShowOnTime] = useState(false);

  useEffect(()=> { trackDashboardView('finance'); }, []);

  // Persist months selection
  useEffect(()=> { if(typeof window==='undefined') return; const stored = window.localStorage.getItem('financeMonths'); if(stored) { const num = parseInt(stored,10); if([3,6,9,12].includes(num)) setMonths(num as any); } }, []);
  useEffect(()=> { if(typeof window!=='undefined') window.localStorage.setItem('financeMonths', String(months)); }, [months]);

  useEffect(()=> {
    if(!userId && !authLoading){ setInitialLoading(false); return; }
    if(!userId) return;
    setRefreshing(true);
    let unsub: (()=>void)|undefined; let active = true;
    (async ()=> {
      try { const res = await fetchFinanceMetrics(userId, months, teamId); if(active) { setMetrics(res); setInitialLoading(false);} } catch{} finally { if(active) setRefreshing(false);} 
      unsub = subscribeFinanceMetrics(userId, months, (m)=> { setMetrics(m); setInitialLoading(false); }, teamId);
    })();
    return ()=> { active=false; if(unsub) unsub(); };
  }, [userId, teamId, months, dataVersion, authLoading]);

  const summary: Summary = useMemo(()=> {
    const ks = metrics?.kpis || mock.kpis;
    return {
      mrr: ks.find(k=> k.key==='mrr')?.value || 0,
      churn: ks.find(k=> /churn/i.test(k.key))?.value || 0,
      ltv: ks.find(k=> /ltv/i.test(k.key))?.value || 0,
      onTime: ks.find(k=> k.key==='on_time')?.value
    };
  }, [metrics, mock.kpis]);

  function handleRefresh(){ setDataVersion(v=> v+1); }
  function exportSnapshot(format: 'json'|'csv'){
    const rows = (metrics?.kpis || mock.kpis).map(k=> ({ key:k.key, label:k.label, value:k.value, delta:k.delta }));
    if(format==='json'){
      const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null,2)], { type:'application/json'});
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance-snapshot.json'; a.click(); URL.revokeObjectURL(url); return;
    }
    const header='key,label,value,delta'; const body = rows.map(r=> [r.key,r.label,r.value,r.delta??''].join(','));
    const blob = new Blob([[header,...body].join('\n')], { type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance-snapshot.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <FeatureGate feature="finance_billing_overview" requiredTier="starter" showUpgrade>
      <FinanceContextProvider data={metrics} months={months} refreshing={refreshing}>
        <div className="p-6 space-y-10">
          <header className="space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
                <p className="text-muted-foreground max-w-3xl">Subscription economics and capital efficiency with real-time invoice intelligence.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[3,6,9,12].map(m => (
                  <Button key={m} size="sm" variant={months===m? 'default':'outline'} onClick={()=> setMonths(m)} aria-pressed={months===m}>{m}m</Button>
                ))}
                <Button size="sm" variant="outline" onClick={()=> exportSnapshot('json')} className="gap-1" aria-label="Export finance snapshot JSON"><DownloadCloud className="h-4 w-4"/>JSON</Button>
                <Button size="sm" variant="outline" onClick={()=> exportSnapshot('csv')} className="gap-1" aria-label="Export finance snapshot CSV"><DownloadCloud className="h-4 w-4"/>CSV</Button>
                <Button size="sm" onClick={handleRefresh} disabled={refreshing} className={cn('gap-1', refreshing && 'animate-pulse')} aria-live="polite" aria-busy={refreshing}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{refreshing? 'Refreshing':'Refresh'}</Button>
              </div>
            </div>
            <div className="sr-only" role="status" aria-live="polite">Finance summary: MRR {summary.mrr.toLocaleString()}, churn {summary.churn} percent, LTV {summary.ltv.toLocaleString()}.</div>
          </header>

          <section aria-label="Key performance indicators" className="grid gap-4 md:grid-cols-4">
            {initialLoading && Array.from({length:4}).map((_,i)=> (<Skeleton key={i} className="h-32 rounded-xl" shimmer aria-label="Loading metric" />))}
            {!initialLoading && (()=> {
              type Ext = typeof mock.kpis[number] & { target?: number; invertTarget?: boolean };
              const base = (metrics?.kpis || mock.kpis) as typeof mock.kpis;
              const targetMap: Record<string,{target?:number; invertTarget?:boolean}> = {};
              metrics?.kpis?.forEach(k=> { (targetMap as any)[k.key] = { target: (k as any).target, invertTarget: (k as any).invertTarget }; });
              const extended: Ext[] = base.map(k=> ({ ...k, ...(targetMap[k.key]||{}) }));
              return extended.map(k=> {
                const pctToTarget = k.target!=null? (k.invertTarget? (k.target / (k.value||1))*100 : (k.value / (k.target||1))*100): null;
                const alertState = pctToTarget!=null? (k.invertTarget? pctToTarget <= 100 : pctToTarget >= 100): false;
                return (
                  <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} badge={k.target? (<Badge variant={alertState? 'default':'outline'} className="text-[10px]">{pctToTarget!.toFixed(0)}% target</Badge>): undefined} footer={k.target? <AdaptiveProgress value={Math.min(100, pctToTarget!)} invert={!!k.invertTarget} aria-label={`${k.label} target progress`} />: undefined} />
                );
              });
            })()}
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

          <section className="grid gap-6 md:grid-cols-2" aria-label="Finance analytics modules">
            <div className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MRR Trend</h2><MrrTrend /></div>
            <div className="space-y-3 flex flex-col"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Aging</h2><Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={()=> setShowUnpaid(true)}>Outstanding</Button></div><InvoiceAging /></div>
          </section>

          <section className="space-y-4" aria-label="Finance workbench actions">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance Workbench</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <ActionCard title="Record Invoice" desc="Draft and issue a customer invoice with tax logic." actionLabel="Create" onClick={()=> {}} />
              <ActionCard title="Update Runway" desc="Recalculate runway assumptions based on burn inputs." actionLabel="Recalculate" onClick={()=> {}} />
              <ActionCard title="On-Time Breakdown" desc="View on-time payment performance by tier." actionLabel="Open" onClick={()=> setShowOnTime(true)} />
            </div>
          </section>
        </div>
        <InvoiceDetailModal open={showUnpaid} onOpenChange={setShowUnpaid} filter="unpaid" />
        <OnTimeBreakdownModal open={showOnTime} onOpenChange={setShowOnTime} />
      </FinanceContextProvider>
    </FeatureGate>
  );
}

interface ActionCardProps { title: string; desc: string; actionLabel: string; onClick?: ()=>void; }
function ActionCard({ title, desc, actionLabel, onClick }: ActionCardProps){
  return (
    <div className="rounded-xl border p-4 bg-background/50 space-y-2 focus-within:ring-2 focus-within:ring-primary/40 transition" tabIndex={-1}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <button onClick={onClick} className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label={actionLabel + ' action'}>{actionLabel}</button>
    </div>
  );
}
