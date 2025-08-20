"use client";
import { useEffect, useState, useMemo } from 'react';
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
  const userId = user?.uid;
  const teamId = (user as { teamId?: string })?.teamId as string|undefined;
  const [loading, setLoading] = useState(false);
  interface BaseAccountingSnapshot { createdAt?: { toDate: () => Date }; }
  interface PnLSnapshot extends BaseAccountingSnapshot { type:'pnl'; figures: PnLFigures; }
  interface BalanceSheetSnapshot extends BaseAccountingSnapshot { type:'balance_sheet'; figures: BSFigures; }
  type AccountingSnapshot = PnLSnapshot | BalanceSheetSnapshot;
  const [pnlSnap, setPnlSnap] = useState<PnLSnapshot|null>(null);
  const [bsSnap, setBsSnap] = useState<BalanceSheetSnapshot|null>(null);
  const [recentPnL, setRecentPnL] = useState<PnLSnapshot[]>([]);
  const { trigger, running } = useAutomationTrigger();

  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(()=> { void trackDashboardView('finance'); }, []);

  useEffect(()=> { if(!userId) return; setLoading(true); void (async()=> { try {
  const rawSnaps = await fetchRecentAccountingSnapshots(userId, teamId, undefined, 8) as AccountingSnapshot[];
  // Narrow by presence of expected figure keys
  const pnl = rawSnaps.find(s=> s.type==='pnl' && s.figures && 'grossProfit' in s.figures);
  const bs = rawSnaps.find(s=> s.type==='balance_sheet' && s.figures && 'assets' in s.figures);
  setPnlSnap(pnl || null);
  setBsSnap(bs || null);
  setRecentPnL(rawSnaps.filter(s=> s.type==='pnl' && s.figures && 'grossProfit' in s.figures));
  if(rawSnaps.length) markLive(); else markFallback();
  } finally { setLoading(false); } })(); }, [userId, teamId, markLive, markFallback]);

  function run(action: 'financeAccountingSeedSampleJournals'|'financeAccountingGeneratePnL'|'financeAccountingGenerateBalanceSheet'|'financeAccountingReconcile') {
  void trigger(action, { optimistic: ()=> { if(action==='financeAccountingGeneratePnL'){ setPnlSnap((s)=> s? { ...s, createdAt:{ toDate:()=> new Date() } } : s); } if(action==='financeAccountingGenerateBalanceSheet'){ setBsSnap((s)=> s? { ...s, createdAt:{ toDate:()=> new Date() } } : s); } }, label: action });
  }

  const kpis = useMemo(()=> {
  if(!pnlSnap) return [] as { key:string; label:string; value:number; delta:number; trend:number[]; intent?: 'neutral'|'success'|'warning'|'accent'|'danger' }[];
  const f = pnlSnap.figures;
    const grossMargin = f.revenue? (f.grossProfit / f.revenue)*100 : 0;
    const netMargin = f.revenue? (f.netIncome / f.revenue)*100 : 0;
    const opexRatio = f.revenue? (f.opex / f.revenue)*100 : 0;
    return [
  { key:'gross_margin', label:'Gross Margin %', value: Number(grossMargin.toFixed(1)), delta:0, trend: recentPnL.map(p=> p.figures.revenue? ((p.figures.revenue - p.figures.cogs)/p.figures.revenue)*100 : 0) },
  { key:'net_margin', label:'Net Margin %', value: Number(netMargin.toFixed(1)), delta:0, trend: recentPnL.map(p=> p.figures.revenue? (p.figures.netIncome / p.figures.revenue)*100 : 0) },
  { key:'opex_ratio', label:'OpEx Ratio %', value: Number(opexRatio.toFixed(1)), delta:0, trend: recentPnL.map(p=> p.figures.revenue? (p.figures.opex / p.figures.revenue)*100 : 0) },
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
          {(() => {
            const runningMap = running as Record<string, boolean | undefined>;
            return (
          <div className="grid gap-4 md:grid-cols-6">
            <ActionCard title="Seed Journals" desc="Add sample ledger entries" action="Seed" onClick={()=> run('financeAccountingSeedSampleJournals')} loading={!!runningMap['financeAccountingSeedSampleJournals']} loadingLabel="Seeding" />
            <ActionCard title="Generate P&L" desc="Store latest P&L snapshot" action="Run" onClick={()=> run('financeAccountingGeneratePnL')} loading={!!runningMap['financeAccountingGeneratePnL']} loadingLabel="Running" />
            <ActionCard title="Balance Sheet" desc="Store balance sheet snapshot" action="Run" onClick={()=> run('financeAccountingGenerateBalanceSheet')} loading={!!runningMap['financeAccountingGenerateBalanceSheet']} loadingLabel="Running" />
            <ActionCard title="Reconcile" desc="Invoice vs payments diff" action="Run" onClick={()=> run('financeAccountingReconcile')} loading={!!runningMap['financeAccountingReconcile']} loadingLabel="Reconciling" />
            <ActionCard title="Export Journal" desc="Download journal CSV" action="Export" />
            <ActionCard title="Variance Scan" desc="Detect margin anomalies" action="Scan" />
          </div>
            );
          })()}
        </section>
        <div className="mt-6 text-xs text-muted-foreground">Phase 4 enabled: P&L / Balance Sheet derive from journal ledger when entries exist. Seed journals to begin.</div>
      </div>
    </FeatureGate>
  );
}
