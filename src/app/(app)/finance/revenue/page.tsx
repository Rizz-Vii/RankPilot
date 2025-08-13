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
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { useProvenance } from '@/hooks/useProvenance';

export default function RevenueAnalyticsPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const { user } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  const [revSnap, setRevSnap] = useState<any|null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const { trigger, running } = useAutomationTrigger();
  useEffect(()=> { if(!userId) return; setLoadingSnap(true); (async()=> { try { const r = await fetchRecentFinanceRevenueSnapshots(userId, teamId,1); if(r.length) setRevSnap({ mrr:r[0].mrr, onTime:r[0].onTimePct, outstanding:r[0].outstanding, ts:r[0].createdAt?.toDate?.()||new Date(), period:r[0].period }); } finally { setLoadingSnap(false);} })(); }, [userId, teamId]);
  const mock = getMockMetrics('finance');
  const data = (live.kpis.length ? live : { kpis: allowFinanceMocks()? mock.kpis : [], rows: [], loading:false }) as any;
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { trackDashboardView('finance'); }, []);
  useEffect(()=> { if(live.kpis.length) markLive(); else markFallback(); }, [live.kpis.length, markLive, markFallback]);
  return (
    <FeatureGate feature="finance_revenue_analytics" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground max-w-3xl">MRR, churn & LTV trajectory with upcoming AI anomaly & retention models.</p>
          <PeriodSelector value={months} onChange={setMonths} />
  </header>
  <ProvenanceLegend />
        {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loadingSnap && revSnap && (
          <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs mb-2" aria-label="Latest revenue snapshot">
            <div className="space-y-1"><p className="font-medium">Last Revenue Snapshot</p><p className="text-muted-foreground">MRR {revSnap.mrr.toLocaleString()} · On-Time {revSnap.onTime.toFixed(1)}% · Outst. {revSnap.outstanding}</p></div>
            <time className="text-[10px] text-muted-foreground" dateTime={revSnap.ts.toISOString()}>{revSnap.ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map((k:any) => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Invoices</h2>
          <LazyDataTable
            columns={[{ key:'period', header:'Period'}, { key:'planTier', header:'Tier'}, { key:'amount', header:'Amount'}, { key:'status', header:'Status'}, { key:'issuedAt', header:'Issued', render:(r:any)=> r.issuedAt?.toDate?.()?.toISOString().slice(0,10)}, { key:'paidAt', header:'Paid', render:(r:any)=> r.paidAt? r.paidAt.toDate().toISOString().slice(0,10): '-' }]}
            rows={live.rows}
            loading={live.loading}
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
