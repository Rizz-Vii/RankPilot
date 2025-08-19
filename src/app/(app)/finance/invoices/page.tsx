"use client";
// Finance - Invoices
import React, { useEffect, useState } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
import { allowFinanceMocks } from '@/lib/flags/finance';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useFinanceInvoiceMetrics } from '@/hooks/useFinanceInvoiceMetrics';
import { fetchRecentFinanceRevenueSnapshots } from '@/lib/services/finance-automation-snapshots';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/shared/action-card';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { useProvenance } from '@/hooks/useProvenance';

export default function InvoicesPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const { user } = useAuth();
  const userId = user?.uid; const teamId = (user as any)?.teamId as string|undefined;
  interface RevenueSnapshotLite { mrr:number; onTime:number; outstanding:number; ts:Date; period?:string }
  const [revSnap, setRevSnap] = useState<RevenueSnapshotLite|null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const { trigger, running } = useAutomationTrigger();
  useEffect(()=> { if(!userId) return; setLoadingSnap(true); void (async()=> { try { const r = await fetchRecentFinanceRevenueSnapshots(userId, teamId,1); if(r.length){ const first:any = r[0]; setRevSnap({ mrr:first.mrr, onTime:first.onTimePct, outstanding:first.outstanding, ts:first.createdAt?.toDate?.()||new Date(), period:first.period }); } } finally { setLoadingSnap(false);} })(); }, [userId, teamId]);
  const { data: mock } = useMockDomainMetrics('finance', allowFinanceMocks());
  const data = (live.kpis.length ? live : { kpis: allowFinanceMocks()? (mock?.kpis || []) : [], rows: [], loading: false });
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { trackDashboardView('finance'); }, []);
  useEffect(()=> { if(live.kpis.length) markLive(); else markFallback(); }, [live.kpis.length, markLive, markFallback]);
  return (
    <FeatureGate feature="finance_invoices" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground max-w-3xl">Historical invoices, receipts, and billing document exports.</p>
          <PeriodSelector value={months} onChange={setMonths} />
  </header>
  <ProvenanceLegend />
  {/* Banner: show during mock fallback when mocks allowed and either KPIs not loaded or no invoice rows. */}
  {allowFinanceMocks() && (!live.rows.length) && (
          <Alert className="border-warning/30 bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning-foreground" aria-live="polite" aria-label="Finance mock data banner">
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <p>
                Finance metrics are currently served from mock data (FINANCE_MOCK_MODE). This banner disappears once live metrics load or mocks are disabled.
              </p>
            </div>
          </Alert>
        )}
        {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loadingSnap && revSnap && (
          <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs mb-2" aria-label="Latest revenue snapshot">
            <div className="space-y-1"><p className="font-medium">Last Revenue Snapshot</p><p className="text-muted-foreground">MRR {revSnap.mrr.toLocaleString()} · On-Time {revSnap.onTime.toFixed(1)}% · Outst. {revSnap.outstanding}</p></div>
            <time className="text-[10px] text-muted-foreground" dateTime={revSnap.ts.toISOString()}>{revSnap.ts.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</time>
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map(k => (
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Workbench</h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ActionCard title="Download CSV" desc="Export invoice history" action="Export" />
            <ActionCard title="Generate Receipt" desc="Create receipt copy" action="Generate" />
            <ActionCard title="Update Billing" desc="Modify payment details" action="Update" />
            <ActionCard title="Refresh Metrics" desc="Force revenue snapshot" action="Run" onClick={()=> trigger('financeRevenueSnapshot')} loading={!!running['financeRevenueSnapshot']} loadingLabel="Refreshing" />
            <ActionCard title="Aging Digest" desc="Queue invoice aging digest" action="Run" onClick={()=> trigger('financeInvoiceAgingDigest')} loading={!!running['financeInvoiceAgingDigest']} loadingLabel="Queuing" />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
