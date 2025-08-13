"use client";
// Finance - Billing Overview
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { allowFinanceMocks } from '@/lib/flags/finance';
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
  const data = (live.kpis.length ? live : { kpis: allowFinanceMocks()? mock.kpis : [], quotas: allowFinanceMocks()? mock.quotas : [], rows: [], loading:false }) as any;
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
        {data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map((q: any) => (
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
