"use client";
// Finance - Revenue Analytics
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { MetricCard } from '@/components/metrics/MetricCard';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { ActionCard } from '@/components/shared/action-card';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useFinanceInvoiceMetrics } from '@/hooks/useFinanceInvoiceMetrics';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
import { useProvenance } from '@/hooks/useProvenance';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { deriveSubscriptionEvents } from '@/lib/finance/derive-subscription-events';
import type { RevenueSnapshot, SubscriptionEvent } from '@/lib/finance/revenue-metrics';
import { computeRevenueMetrics } from '@/lib/finance/revenue-metrics';
import { allowFinanceMocks } from '@/lib/flags/finance';
import { fetchRecentFinanceRevenueSnapshots } from '@/lib/services/finance-automation-snapshots';
import { useEffect, useState } from 'react';

// Top-level types moved out of the component to avoid re-creation on each render.
interface FinanceRevenueSnapshot { mrr: number; onTime: number; outstanding: number; ts: Date; period: string; }
type MetricIntent = 'neutral' | 'success' | 'warning' | 'accent' | 'danger';
interface KpiItem { key: string; label: string; value: number; delta: number; trend: number[]; intent?: MetricIntent }
interface InvoiceRow { period:string; planTier:string; amount:number; status:string; issuedAt?:{ toDate?:()=>Date }; paidAt?:{ toDate?:()=>Date }|null }
interface InvoiceMetrics { kpis: KpiItem[]; rows: InvoiceRow[]; loading: boolean }

export default function RevenueAnalyticsPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const { user } = useAuth();
  const userId = user?.uid;
  // Narrow optional teamId off user without using any
  const teamId = (() => {
    const u = user as unknown;
    if (u && typeof u === 'object' && 'teamId' in (u as Record<string, unknown>)) {
      const v = (u as Record<string, unknown>).teamId;
      return typeof v === 'string' ? v : undefined;
    }
    return undefined;
  })();
  // FinanceRevenueSnapshot moved to top-level
  const [revSnap, setRevSnap] = useState<FinanceRevenueSnapshot|null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const { trigger, running } = useAutomationTrigger();
  useEffect(() => {
    if (!userId) return;
    setLoadingSnap(true);
    void (async () => {
      try {
        const r = await fetchRecentFinanceRevenueSnapshots(userId, teamId, 1);
        if (r.length) {
          const first = r[0] as unknown as Record<string, unknown>;
          const ts =
            first &&
            typeof first.createdAt === 'object' &&
              first.createdAt && 'toDate' in (first.createdAt as Record<string, unknown>) &&
              typeof (first.createdAt as { toDate?: () => Date }).toDate === 'function'
              ? (first.createdAt as { toDate?: () => Date }).toDate?.() as Date
              : new Date();
          setRevSnap({
            mrr: typeof first.mrr === 'number' ? first.mrr : 0,
            onTime: typeof first.onTimePct === 'number' ? first.onTimePct : 0,
            outstanding: typeof first.outstanding === 'number' ? first.outstanding : 0,
            ts,
            period: typeof first.period === 'string' ? first.period : ''
          });
        }
      } finally {
        setLoadingSnap(false);
      }
    })();
  }, [userId, teamId]);
  const { data: mock } = useMockDomainMetrics('finance', allowFinanceMocks());
  // Metric and Invoice types moved to top-level to reduce allocations per render.
  const adaptInvoice = (r: unknown): InvoiceRow | null => {
    if(!r || typeof r !== 'object') return null;
    const o = r as Record<string, unknown>;
    if (typeof o.period !== 'string' || typeof o.planTier !== 'string') return null;
    return {
      period: o.period,
      planTier: o.planTier,
      amount: typeof o.amount === 'number' ? o.amount : 0,
      status: typeof o.status === 'string' ? o.status : 'pending',
      issuedAt: o.issuedAt && typeof o.issuedAt === 'object' ? (o.issuedAt as { toDate?: () => Date }) : undefined,
      paidAt: o.paidAt && typeof o.paidAt === 'object' ? (o.paidAt as { toDate?: () => Date } | null) : undefined
    };
  };
  const data: InvoiceMetrics = (Array.isArray(live.kpis) && live.kpis.length) ? ({ kpis: live.kpis as KpiItem[], rows: (Array.isArray(live.rows) ? live.rows.map(adaptInvoice).filter((x): x is InvoiceRow => x !== null) : []), loading: live.loading }) : { kpis: allowFinanceMocks()? ((mock?.kpis as KpiItem[] | undefined) || []) : [], rows: [], loading:false };
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  const [derived, setDerived] = useState<RevenueSnapshot|null>(null);
  useEffect(() => { trackDashboardView('finance'); }, []);
  useEffect(()=> { if(live.kpis.length) markLive(); else markFallback(); }, [live.kpis.length, markLive, markFallback]);
  // Compute derived revenue metrics (MRR, ARR, churn, LTV) using invoice history approximation
  useEffect(()=> {
    if (!live.rows?.length) { setDerived(null); return; }
    try {
      const invoices: unknown[] = Array.isArray(live.rows) ? live.rows : [];
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
            <MetricCard key="churn_formula" label="Churn %" value={derived.churnRatePct.toFixed(1) + '%'} delta={0} deltaLabel="" trend={<TrendSparkline data={[derived.churnRatePct]} />} intent={derived.churnRatePct < 5 ? 'success':'warning'} />
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
              {
                key: 'issuedAt', header: 'Issued', render: (r) => {
                  const rec = r as unknown as InvoiceRow;
                  const d = rec.issuedAt && typeof rec.issuedAt === 'object' && typeof rec.issuedAt.toDate === 'function' ? rec.issuedAt.toDate?.() : undefined;
                  return d ? d.toISOString().slice(0, 10) : '-';
                }
              },
              {
                key: 'paidAt', header: 'Paid', render: (r) => {
                  const rec = r as unknown as InvoiceRow;
                  const d = rec.paidAt && typeof rec.paidAt === 'object' && typeof rec.paidAt?.toDate === 'function' ? rec.paidAt.toDate?.() : undefined;
                  return d ? d.toISOString().slice(0, 10) : '-';
                }
              }
              ]}
            rows={data.rows as unknown as Record<string, unknown>[]}
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
            <ActionCard title="Revenue Snapshot" desc="Force revenue snapshot" action="Run" onClick={()=> void trigger('financeRevenueSnapshot')} loading={!!running['financeRevenueSnapshot']} loadingLabel="Running" />
            <ActionCard title="Aging Digest" desc="Queue invoice aging digest" action="Run" onClick={()=> void trigger('financeInvoiceAgingDigest')} loading={!!running['financeInvoiceAgingDigest']} loadingLabel="Queuing" />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
