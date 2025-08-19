"use client";
// Finance - Billing Overview
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
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
  const { data: mock } = useMockDomainMetrics('finance', allowFinanceMocks());
  interface FinanceKPI { key: string; label: string; value: number; delta?: number; trend?: number[]; intent?: 'success' | 'neutral' | 'warning' | 'danger' | 'accent'; }
  interface FinanceQuota { key: string; label: string; used: number; limit: number; }
  interface InvoiceLike { period: string; planTier: string; amount: number; status: string; issuedAt?: { toDate?: () => Date }; paidAt?: { toDate?: () => Date } | null }
  interface FinanceDataShape { kpis: FinanceKPI[]; quotas: FinanceQuota[]; rows: InvoiceLike[]; loading: boolean }
  const adaptInvoice = (r: Record<string, unknown>): InvoiceLike | null => {
    if (!r) return null;
    if (typeof (r as Record<string, unknown>)['period'] !== 'string' || typeof (r as Record<string, unknown>)['planTier'] !== 'string') return null;
    const rec = r as Record<string, unknown>;
    return {
      period: String(rec['period']),
      planTier: String(rec['planTier']),
      amount: typeof rec['amount'] === 'number' ? (rec['amount'] as number) : 0,
      status: typeof rec['status'] === 'string' ? String(rec['status']) : 'pending',
      issuedAt: rec['issuedAt'] && typeof rec['issuedAt'] === 'object' ? (rec['issuedAt'] as any) : undefined,
      paidAt: rec['paidAt'] && typeof rec['paidAt'] === 'object' ? (rec['paidAt'] as any) : undefined
    };
  };
  const normalizeLive = (): FinanceDataShape => {
    const kpis: FinanceKPI[] = (live.kpis || []).map((k: Record<string, unknown>) => {
      const rec = k as Record<string, unknown>;
      const key = typeof rec['key'] === 'string' ? rec['key'] : 'kpi';
      const label = typeof rec['label'] === 'string' ? rec['label'] : (typeof rec['key'] === 'string' ? rec['key'] : 'Metric');
      const value = typeof rec['value'] === 'number' ? (rec['value'] as number) : 0;
      const delta = typeof rec['delta'] === 'number' ? (rec['delta'] as number) : undefined;
      const trend = Array.isArray(rec['trend']) ? (rec['trend'] as unknown[]).filter((n): n is number => typeof n === 'number') : undefined;
      const intent = ((): FinanceKPI['intent'] | undefined => {
        const v = rec['intent'];
        return (typeof v === 'string' && ['success', 'neutral', 'warning', 'danger', 'accent'].includes(v)) ? (v as FinanceKPI['intent']) : undefined;
      })();
      return { key: String(key), label: String(label), value: Number(value), delta, trend, intent };
    });
    const quotas: FinanceQuota[] = (live.quotas || []).map((q: Record<string, unknown>) => {
      const rec = q as Record<string, unknown>;
      const key = typeof rec['key'] === 'string' ? rec['key'] : 'quota';
      const label = typeof rec['label'] === 'string' ? rec['label'] : (typeof rec['key'] === 'string' ? rec['key'] : 'Quota');
      const used = typeof rec['used'] === 'number' ? (rec['used'] as number) : Number(rec['used'] as unknown) || 0;
      const limit = typeof rec['limit'] === 'number' ? (rec['limit'] as number) : Number(rec['limit'] as unknown) || 0;
      return { key: String(key), label: String(label), used: Number(used), limit: Number(limit) };
    });
    const rows: InvoiceLike[] = (live.rows || []).map(adaptInvoice).filter(Boolean) as InvoiceLike[];
    return { kpis, quotas, rows, loading: !!live.loading };
  };
  const data: FinanceDataShape = live.kpis.length ? normalizeLive() : { kpis: allowFinanceMocks() && mock ? (mock.kpis as FinanceKPI[]) : [], quotas: allowFinanceMocks() && mock && mock.quotas ? (mock.quotas as FinanceQuota[]) : [], rows: [], loading:false };
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
