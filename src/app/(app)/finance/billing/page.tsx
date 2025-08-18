"use client";
// Finance - Billing Overview
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { allowFinanceMocks } from '@/lib/flags/finance';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useFinanceInvoiceMetrics } from '@/hooks/useFinanceInvoiceMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { useProvenance } from '@/hooks/useProvenance';

export default function BillingOverviewPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const mock = getMockMetrics('finance');
  interface FinanceKPI { key: string; label: string; value: number; delta?: number; trend?: number[]; intent?: 'success' | 'neutral' | 'warning' | 'danger' | 'accent'; }
  interface FinanceQuota { key: string; label: string; used: number; limit: number; }
  interface InvoiceLike { period: string; planTier: string; amount: number; status: string; issuedAt?: { toDate?: () => Date }; paidAt?: { toDate?: () => Date } | null }
  interface FinanceDataShape { kpis: FinanceKPI[]; quotas: FinanceQuota[]; rows: InvoiceLike[]; loading: boolean }
  const adaptInvoice = (r: Record<string, any>): InvoiceLike | null => {
    if (!r) return null;
    if (typeof r.period !== 'string' || typeof r.planTier !== 'string') return null;
    return {
      period: r.period,
      planTier: r.planTier,
      amount: typeof r.amount === 'number' ? r.amount : 0,
      status: typeof r.status === 'string' ? r.status : 'pending',
      issuedAt: r.issuedAt && typeof r.issuedAt === 'object' ? r.issuedAt : undefined,
      paidAt: r.paidAt && typeof r.paidAt === 'object' ? r.paidAt : undefined
    };
  };
  const normalizeLive = (): FinanceDataShape => {
    const kpis: FinanceKPI[] = (live.kpis || []).map(k => ({
      key: String((k as any).key || 'kpi'),
      label: String((k as any).label || (k as any).key || 'Metric'),
      value: Number((k as any).value || 0),
      delta: typeof (k as any).delta === 'number' ? (k as any).delta : undefined,
      trend: Array.isArray((k as any).trend) ? (k as any).trend.filter((n: any) => typeof n === 'number') : undefined,
      intent: ((): FinanceKPI['intent'] => {
        const v = (k as any).intent; return v === 'success'||v==='neutral'||v==='warning'||v==='danger'||v==='accent'? v : undefined;
      })()
    }));
    const quotas: FinanceQuota[] = ((live as any).quotas || []).map((q: any) => ({
      key: String(q.key || 'quota'),
      label: String(q.label || q.key || 'Quota'),
      used: Number(q.used || 0),
      limit: Number(q.limit || 0)
    }));
    const rows: InvoiceLike[] = ((live as any).rows || []).map(adaptInvoice).filter(Boolean) as InvoiceLike[];
    return { kpis, quotas, rows, loading: !!live.loading };
  };
  const data: FinanceDataShape = live.kpis.length ? normalizeLive() : { kpis: allowFinanceMocks()? mock.kpis as FinanceKPI[] : [], quotas: allowFinanceMocks()? mock.quotas as FinanceQuota[] : [], rows: [], loading:false };
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => { trackDashboardView('finance'); }, []);
  useEffect(()=> { if(live.kpis.length) markLive(); else markFallback(); }, [live.kpis.length, markLive, markFallback]);
  return (
    <FeatureGate feature="finance_billing_overview" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Billing Overview</h1>
          <p className="text-muted-foreground max-w-3xl">Plan usage, upcoming charges & cross-engine quota consumption.</p>
          <PeriodSelector value={months} onChange={setMonths} />
  </header>
  <ProvenanceLegend />
  {/* Banner: show whenever mocks are allowed AND either no KPIs loaded OR no invoice rows (mock fallback). */}
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
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map((k) => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend || []} />} intent={k.intent || 'neutral'} />
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Invoices</h2>
          <LazyDataTable
            columns={[
              { key:'period', header:'Period'},
              { key:'planTier', header:'Tier'},
              { key:'amount', header:'Amount'},
              { key:'status', header:'Status'},
              { key:'issuedAt', header:'Issued', render:(r:InvoiceLike)=> r.issuedAt?.toDate ? r.issuedAt.toDate().toISOString().slice(0,10) : '-' },
              { key:'paidAt', header:'Paid', render:(r:InvoiceLike)=> r.paidAt?.toDate ? r.paidAt.toDate().toISOString().slice(0,10) : '-' }
            ]}
            rows={data.rows}
            loading={data.loading}
            empty="No invoice data"
          />
        </section>
        {data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map((q) => (
                <div key={q.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{q.label}</span>
                    <span className="text-xs text-muted-foreground">{q.used}/{q.limit}</span>
                  </div>
                  <QuotaBar used={q.used} limit={q.limit} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </FeatureGate>
  );
}
