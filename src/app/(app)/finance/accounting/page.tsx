"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { useAuth } from '@/context/AuthContext';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { fetchRecentAccountingSnapshots } from '@/lib/services/accounting-automation-snapshots';
import { ActionCard } from '@/components/shared/action-card';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useProvenance } from '@/hooks/useProvenance';

interface PnLFigures { revenue:number; cogs:number; grossProfit:number; opex:number; netIncome:number; }
interface BSFigures { assets:number; liabilities:number; equity:number; }

export default function AccountingPage(){
  const { user } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  const [loading, setLoading] = useState(false);
  const [pnlSnap, setPnlSnap] = useState<any|null>(null);
  const [bsSnap, setBsSnap] = useState<any|null>(null);
  const [recentPnL, setRecentPnL] = useState<any[]>([]);
  const { trigger, running } = useAutomationTrigger();

  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(()=> { trackDashboardView('finance'); }, []);

  useEffect(()=> { if(!userId) return; setLoading(true); (async()=> { try { const snaps = await fetchRecentAccountingSnapshots(userId, teamId, undefined, 8); setPnlSnap(snaps.find(s=> s.type==='pnl')||null); setBsSnap(snaps.find(s=> s.type==='balance_sheet')||null); setRecentPnL(snaps.filter(s=> s.type==='pnl')); if(snaps.length) markLive(); else markFallback(); } finally { setLoading(false); } })(); }, [userId, teamId, markLive, markFallback]);

  function run(action: 'financeAccountingSeedSampleJournals'|'financeAccountingGeneratePnL'|'financeAccountingGenerateBalanceSheet'|'financeAccountingReconcile') {
    trigger(action, { optimistic: ()=> { if(action==='financeAccountingGeneratePnL'){ setPnlSnap((s:any)=> s? { ...s, createdAt:{ toDate:()=> new Date() } } : s); } if(action==='financeAccountingGenerateBalanceSheet'){ setBsSnap((s:any)=> s? { ...s, createdAt:{ toDate:()=> new Date() } } : s); } }, label: action });
  }

  const kpis = useMemo(()=> {
    if(!pnlSnap) return [] as any[];
    const f = pnlSnap.figures as PnLFigures;
    const grossMargin = f.revenue? (f.grossProfit / f.revenue)*100 : 0;
    const netMargin = f.revenue? (f.netIncome / f.revenue)*100 : 0;
    const opexRatio = f.revenue? (f.opex / f.revenue)*100 : 0;
    return [
      { key:'gross_margin', label:'Gross Margin %', value: Number(grossMargin.toFixed(1)), delta:0, trend: recentPnL.map(p=> { const pf = p.figures as PnLFigures; return pf.revenue? ((pf.revenue - pf.cogs)/pf.revenue)*100 : 0; }) },
      { key:'net_margin', label:'Net Margin %', value: Number(netMargin.toFixed(1)), delta:0, trend: recentPnL.map(p=> { const pf = p.figures as PnLFigures; return pf.revenue? (pf.netIncome / pf.revenue)*100 : 0; }) },
      { key:'opex_ratio', label:'OpEx Ratio %', value: Number(opexRatio.toFixed(1)), delta:0, trend: recentPnL.map(p=> { const pf = p.figures as PnLFigures; return pf.revenue? (pf.opex / pf.revenue)*100 : 0; }) },
    ];
  }, [pnlSnap, recentPnL]);

  return (
    <FeatureGate feature="finance_accounting" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground max-w-3xl">P&L / Balance Sheet snapshots and reconciliation helpers.</p>
  </header>
  <ProvenanceLegend />
        {loading && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loading && (pnlSnap || bsSnap) && (
          <div className="grid gap-3 md:grid-cols-2" aria-label="Latest accounting snapshots">
            {pnlSnap && (
              <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="font-medium">Last P&L Snapshot</p>
                  <p className="text-muted-foreground">Rev {(pnlSnap.figures.revenue||0).toLocaleString()} · GP {(pnlSnap.figures.grossProfit||0).toLocaleString()} · Net {(pnlSnap.figures.netIncome||0).toLocaleString()}</p>
                </div>
                <time className="text-[10px] text-muted-foreground" dateTime={(pnlSnap.createdAt?.toDate?.()||new Date()).toISOString()}>{(pnlSnap.createdAt?.toDate?.()||new Date()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
              </div>
            )}
            {bsSnap && (
              <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="font-medium">Last Balance Sheet</p>
                  <p className="text-muted-foreground">Assets {(bsSnap.figures.assets||0).toLocaleString()} · Liab {(bsSnap.figures.liabilities||0).toLocaleString()} · Equity {(bsSnap.figures.equity||0).toLocaleString()}</p>
                </div>
                <time className="text-[10px] text-muted-foreground" dateTime={(bsSnap.createdAt?.toDate?.()||new Date()).toISOString()}>{(bsSnap.createdAt?.toDate?.()||new Date()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
              </div>
            )}
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {kpis.map(k => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last" trend={<TrendSparkline data={k.trend} />} intent={k.intent||'neutral'} />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accounting Workbench</h2>
          <div className="grid gap-4 md:grid-cols-6">
            <ActionCard title="Seed Journals" desc="Add sample ledger entries" action="Seed" onClick={()=> run('financeAccountingSeedSampleJournals')} loading={!!running['financeAccountingSeedSampleJournals']} loadingLabel="Seeding" />
            <ActionCard title="Generate P&L" desc="Store latest P&L snapshot" action="Run" onClick={()=> run('financeAccountingGeneratePnL')} loading={!!running['financeAccountingGeneratePnL']} loadingLabel="Running" />
            <ActionCard title="Balance Sheet" desc="Store balance sheet snapshot" action="Run" onClick={()=> run('financeAccountingGenerateBalanceSheet')} loading={!!running['financeAccountingGenerateBalanceSheet']} loadingLabel="Running" />
            <ActionCard title="Reconcile" desc="Invoice vs payments diff" action="Run" onClick={()=> run('financeAccountingReconcile')} loading={!!running['financeAccountingReconcile']} loadingLabel="Reconciling" />
            <ActionCard title="Export Journal" desc="Download journal CSV" action="Export" />
            <ActionCard title="Variance Scan" desc="Detect margin anomalies" action="Scan" />
          </div>
        </section>
        <div className="mt-6 text-xs text-muted-foreground">Phase 4 enabled: P&L / Balance Sheet derive from journal ledger when entries exist. Seed journals to begin.</div>
      </div>
    </FeatureGate>
  );
}
