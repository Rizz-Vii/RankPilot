"use client";
// Finance - Invoices
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useState } from 'react';
import { useFinanceInvoiceMetrics } from '@/hooks/useFinanceInvoiceMetrics';
import { PeriodSelector } from '@/components/metrics/PeriodSelector';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export default function InvoicesPage() {
  const [months, setMonths] = useState(6);
  const live = useFinanceInvoiceMetrics(months);
  const mock = getMockMetrics('finance');
  const data = (live.kpis.length ? live : { kpis: mock.kpis, rows: [], loading: false }) as any;
  useEffect(() => { trackDashboardView('finance'); }, []);
  return (
    <FeatureGate feature="finance_invoices" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground max-w-3xl">Historical invoices, receipts, and billing document exports.</p>
          <PeriodSelector value={months} onChange={setMonths} />
        </header>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Download CSV</p><p className="text-xs text-muted-foreground">Export invoice history.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Export</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Generate Receipt</p><p className="text-xs text-muted-foreground">Create receipt copy.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Generate</button></div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2"><p className="text-sm font-medium">Update Billing</p><p className="text-xs text-muted-foreground">Modify payment details.</p><button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Update</button></div>
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
