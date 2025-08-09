"use client";
// Finance Dashboard Root
import React, { useEffect } from 'react';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';

export const metadata = { title: 'Finance Dashboard' };

export default function FinanceDashboardRoot() {
  const data = getMockMetrics('finance');
  useEffect(() => { trackDashboardView('finance'); }, []);
    return (
      <FeatureGate feature="finance_billing_overview" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground max-w-3xl">Subscription economics and capital efficiency. Mock metrics until billing + ledger integration is wired.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {data.kpis.map(k => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={k.value.toLocaleString()}
              delta={k.delta}
              deltaLabel="vs last period"
              trend={<TrendSparkline data={k.trend} />}
              intent={k.intent || 'neutral'}
            />
          ))}
        </section>
        {data.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map(q => (
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
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance Workbench</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Record Invoice</p>
              <p className="text-xs text-muted-foreground">Draft and issue a customer invoice with tax logic.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Create</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Update Runway</p>
              <p className="text-xs text-muted-foreground">Recalculate runway assumptions based on burn inputs.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Recalculate</button>
            </div>
            <div className="rounded-xl border p-4 bg-background/50 space-y-2">
              <p className="text-sm font-medium">Churn Cohorts</p>
              <p className="text-xs text-muted-foreground">Analyze churn by signup cohort for retention insights.</p>
              <button className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition">Analyze</button>
            </div>
          </div>
        </section>
      </div>
      </FeatureGate>
    );
}
