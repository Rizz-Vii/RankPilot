"use client";
// Finance - Revenue Analytics
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { allowFinanceMocks } from '@/lib/flags/finance';
import { fetchRecentFinanceRevenueSnapshots } from '@/lib/services/finance-automation-snapshots';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/shared/action-card';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useFinanceInvoiceMetrics } from '@/hooks/useFinanceInvoiceMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import type { RevenueSnapshot } from '@/lib/finance/revenue-metrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { computeRevenueMetrics, SubscriptionEvent } from '@/lib/finance/revenue-metrics';
import { deriveSubscriptionEvents } from '@/lib/finance/derive-subscription-events';
import { useProvenance } from '@/hooks/useProvenance';

export default function RevenueAnalyticsPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const { user } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  interface FinanceRevenueSnapshot { mrr: number; onTime: number; outstanding: number; ts: Date; period: string; }
  const [revSnap, setRevSnap] = useState<FinanceRevenueSnapshot|null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const { trigger, running } = useAutomationTrigger();
  useEffect(()=> { if(!userId) return; setLoadingSnap(true); (async()=> { try { const r = await fetchRecentFinanceRevenueSnapshots(userId, teamId,1); if(r.length) { const first:any = r[0]; const ts = first.createdAt && typeof first.createdAt==='object' && first.createdAt.toDate? first.createdAt.toDate(): new Date(); setRevSnap({ mrr:first.mrr, onTime:first.onTimePct, outstanding:first.outstanding, ts, period:first.period }); } } finally { setLoadingSnap(false);} })(); }, [userId, teamId]);
  const mock = getMockMetrics('finance');
  type MetricIntent = 'neutral' | 'success' | 'warning' | 'accent' | 'danger';
  interface KpiItem { key: string; label: string; value: number; delta: number; trend: number[]; intent?: MetricIntent }
  interface InvoiceRow { period:string; planTier:string; amount:number; status:string; issuedAt?:{ toDate?:()=>Date }; paidAt?:{ toDate?:()=>Date }|null }
  interface InvoiceMetrics { kpis: KpiItem[]; rows: InvoiceRow[]; loading: boolean }
  const adaptInvoice = (r: any): InvoiceRow | null => {
    if(!r || typeof r !== 'object') return null;
    if(typeof r.period !== 'string' || typeof r.planTier !== 'string') return null;
    return {
      period: r.period,
      planTier: r.planTier,
      amount: typeof r.amount === 'number'? r.amount : 0,
      status: typeof r.status === 'string'? r.status : 'pending',
      issuedAt: r.issuedAt && typeof r.issuedAt === 'object'? r.issuedAt : undefined,
      paidAt: r.paidAt && typeof r.paidAt === 'object'? r.paidAt : undefined
    };
  };
  const data: InvoiceMetrics = live.kpis.length ? ({ kpis: live.kpis as KpiItem[], rows: (Array.isArray(live.rows)? live.rows.map(adaptInvoice).filter(Boolean) as InvoiceRow[]: []), loading: live.loading }) : { kpis: allowFinanceMocks()? (mock.kpis as KpiItem[]) : [], rows: [], loading:false };
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  const [derived, setDerived] = useState<RevenueSnapshot|null>(null);
  useEffect(() => { trackDashboardView('finance'); }, []);
  useEffect(()=> { if(live.kpis.length) markLive(); else markFallback(); }, [live.kpis.length, markLive, markFallback]);
  // Compute derived revenue metrics (MRR, ARR, churn, LTV) using invoice history approximation
  useEffect(()=> {
    if (!live.rows?.length) { setDerived(null); return; }
    try {
  const invoices = live.rows as any[];
  const subs: SubscriptionEvent[] = deriveSubscriptionEvents(invoices);
  const snapshot = computeRevenueMetrics(subs);
      setDerived(snapshot);
    } catch { setDerived(null); }
  }, [live.rows]);
  return (
    <FeatureGate feature="finance_revenue_analytics" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground max-w-3xl">MRR, churn & LTV trajectory with upcoming AI anomaly & retention models.</p>
          <PeriodSelector value={months} onChange={setMonths} />
  </header>
  <ProvenanceLegend />
        {/* Mock banner (harmonized): show when mocks enabled and either KPIs not loaded or no invoice rows available. */}
  {allowFinanceMocks() && (!live.rows.length) && (
          <div className="rounded-md border border-warning/30 bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning-foreground p-3 text-sm flex gap-3" aria-label="Finance mock data banner" aria-live="polite">
            <span className="font-medium">Mock Data</span>
            <span>Finance metrics are currently served from mock data (FINANCE_MOCK_MODE). This banner disappears once live metrics load or mocks are disabled.</span>
          </div>
        )}
        {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loadingSnap && revSnap && (
          <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs mb-2" aria-label="Latest revenue snapshot">
            <div className="space-y-1"><p className="font-medium">Last Revenue Snapshot</p><p className="text-muted-foreground">MRR {revSnap.mrr.toLocaleString()} · On-Time {revSnap.onTime.toFixed(1)}% · Outst. {revSnap.outstanding}</p></div>
            <time className="text-[10px] text-muted-foreground" dateTime={revSnap.ts.toISOString()}>{revSnap.ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map((k) => (
              <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        {derived && (
          <section className="grid gap-4 md:grid-cols-4" aria-label="Derived revenue metrics">
            <MetricCard key="mrr_formula" label="MRR (Derived)" value={derived.mrr.toLocaleString()} delta={0} deltaLabel="" trend={<TrendSparkline data={[derived.mrr]} />} intent="neutral" />
            <MetricCard key="arr_formula" label="ARR" value={derived.arr.toLocaleString()} delta={0} deltaLabel="" trend={<TrendSparkline data={[derived.arr]} />} intent="neutral" />
            <MetricCard key="churn_formula" label="Churn %" value={derived.churnRatePct} delta={0} deltaLabel="" trend={<TrendSparkline data={[derived.churnRatePct]} />} intent={derived.churnRatePct < 5 ? 'success':'warning'} />
            <MetricCard key="ltv_formula" label="LTV" value={derived.ltv? derived.ltv.toLocaleString(): '—'} delta={0} deltaLabel="" trend={<TrendSparkline data={[derived.ltv||0]} />} intent={derived.ltv? 'accent':'neutral'} />
          </section>
        )}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Invoices</h2>
          <LazyDataTable
              columns={[
                { key:'period', header:'Period'},
                { key:'planTier', header:'Tier'},
                { key:'amount', header:'Amount'},
                { key:'status', header:'Status'},
                { key:'issuedAt', header:'Issued', render:(r:InvoiceRow)=> (r.issuedAt && typeof r.issuedAt === 'object' && r.issuedAt.toDate)? r.issuedAt.toDate().toISOString().slice(0,10): '-'},
                { key:'paidAt', header:'Paid', render:(r:InvoiceRow)=> (r.paidAt && typeof r.paidAt === 'object' && r.paidAt.toDate)? r.paidAt.toDate().toISOString().slice(0,10): '-'}
              ]}
            rows={data.rows}
            loading={data.loading}
            empty="No invoice data"
          />
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue Workbench</h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ActionCard title="Run Cohort" desc="Generate churn cohort table" action="Generate" />
            <ActionCard title="Detect Anomalies" desc="Scan revenue series" action="Scan" />
            <ActionCard title="Update LTV Model" desc="Recalculate predictive LTV" action="Recalc" />
            <ActionCard title="Revenue Snapshot" desc="Force revenue snapshot" action="Run" onClick={()=> trigger('financeRevenueSnapshot')} loading={!!running['financeRevenueSnapshot']} loadingLabel="Running" />
            <ActionCard title="Aging Digest" desc="Queue invoice aging digest" action="Run" onClick={()=> trigger('financeInvoiceAgingDigest')} loading={!!running['financeInvoiceAgingDigest']} loadingLabel="Queuing" />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
