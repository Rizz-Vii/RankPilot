"use client";
import { dashboardContainerVariants, dashboardItemVariants } from '@/components/dashboard/animation-variants';
import { DashboardSurface } from '@/components/layout/DashboardSurface';
import { MetricCard } from '@/components/metrics/MetricCard';
import { QuotaBar } from '@/components/metrics/QuotaBar';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { ActionCard } from '@/components/shared/action-card';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from '@/components/tool-page-header';
import { AdaptiveProgress } from '@/components/ui/adaptive-progress';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { SuiteAccentProvider } from '@/context/SuiteAccentContext';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
import { useProvenance } from '@/hooks/useProvenance';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { allowFinanceMocks } from '@/lib/flags/finance';
import { fetchLatestFinanceInvoiceAging, fetchRecentFinanceRevenueSnapshots } from '@/lib/services/finance-automation-snapshots';
import type { AggregatedFinanceMetrics } from '@/lib/services/finance-metrics.service';
import { fetchFinanceMetrics, subscribeFinanceMetrics } from '@/lib/services/finance-metrics.service';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, DownloadCloud, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FinanceContextProvider } from './_parts/finance-context';
import { InvoiceDetailModal } from './_parts/invoice-detail-modal';
import { OnTimeBreakdownModal } from './_parts/on-time-breakdown-modal';

import InvoiceAging from './_parts/invoice-aging';
import MrrTrend from './_parts/mrr-trend';

interface Summary { mrr: number; churn: number; ltv: number; onTime?: number; }

export default function FinanceDashboardRoot() {
  const { data: mock } = useMockDomainMetrics('finance', allowFinanceMocks());
  const { user, loading: authLoading } = useAuth();
  const userId: string | undefined = (user && typeof user === 'object' && 'uid' in (user as unknown as Record<string, unknown>) && typeof (user as unknown as Record<string, unknown>).uid === 'string')
    ? ((user as unknown as Record<string, unknown>).uid as string)
    : undefined;
  const teamId = (user && typeof user === 'object' && 'teamId' in (user as unknown as Record<string, unknown>) && typeof (user as unknown as Record<string, unknown>).teamId === 'string')
    ? ((user as unknown as Record<string, unknown>).teamId as string)
    : undefined;
  const [months, setMonths] = useState(6);
  const [metrics, setMetrics] = useState<AggregatedFinanceMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [showOnTime, setShowOnTime] = useState(false);
  const [revSnap, setRevSnap] = useState<{ mrr: number; onTime: number; outstanding: number; period: string; ts: Date } | null>(null);
  const [agingSnap, setAgingSnap] = useState<{ buckets: Record<string, number>; ts: Date } | null>(null);
  const { trigger, running } = useAutomationTrigger();

  useEffect(() => { void trackDashboardView('finance'); }, []);

  // Persist months selection
  useEffect(()=> { if(typeof window==='undefined') return; const stored = window.localStorage.getItem('financeMonths'); if(stored) { const num = parseInt(stored,10); if([3,6,9,12].includes(num)) setMonths(num as 3|6|9|12); } }, []);
  useEffect(()=> { if(typeof window!=='undefined') window.localStorage.setItem('financeMonths', String(months)); }, [months]);

  interface RevenueSnapshotDoc { mrr:number; onTimePct:number; outstanding:number; period:string; createdAt?: { toDate?:()=>Date } }
  interface AgingSnapshotDoc { buckets: Record<string, number>; createdAt?: { toDate?:()=>Date } }
  useEffect(()=> {
    if(!userId && !authLoading){ setInitialLoading(false); return; }
    if(!userId) return;
    setRefreshing(true);
    let unsub: (()=>void)|undefined; let active = true;
    void (async ()=> {
      try {
        // Prefer server API when available for consistent aggregation
        const token = await user!.getIdToken?.();
        const qs = new URLSearchParams({ months: String(months) });
        if (teamId) qs.set('teamId', teamId);
        const resp = await fetch(`/api/finance/metrics?${qs.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (resp.ok) {
          const json = await resp.json();
          // Optional: capture server diagnostics for triage in dev tools
          const diag = resp.headers.get('x-finance-diagnostics');
          if (process.env.NODE_ENV !== 'production' && diag) console.debug('[finance] server diag:', diag);
          if (active) { setMetrics(json as AggregatedFinanceMetrics); setInitialLoading(false); }
        } else {
          const diag = resp.headers.get('x-finance-diagnostics');
          if (process.env.NODE_ENV !== 'production' && diag) console.warn('[finance] server diag (non-200):', diag);
          // Fallback to Firestore client aggregation
          const res = await fetchFinanceMetrics(userId, months, teamId);
          if (active) { setMetrics(res); setInitialLoading(false); }
        }
      } catch {
        try {
          const res = await fetchFinanceMetrics(userId, months, teamId);
          if (active) { setMetrics(res); setInitialLoading(false); }
        } catch { /* swallow */ }
      } finally { if (active) setRefreshing(false); }
      // Realtime updates via Firestore subscription as a secondary path
      unsub = subscribeFinanceMetrics(userId, months, (m)=> { setMetrics(m); setInitialLoading(false); }, teamId);
    })();
    return ()=> { active=false; if(unsub) unsub(); };
  }, [userId, user, teamId, months, dataVersion, authLoading]);

  // Load latest automation snapshots (finance)
  useEffect(()=> {
    if(!userId) return;
    void (async () => {
      try {
        const [rev, aging] = await Promise.all([
          fetchRecentFinanceRevenueSnapshots(userId, teamId, 1) as Promise<RevenueSnapshotDoc[]>,
          fetchLatestFinanceInvoiceAging(userId, teamId) as Promise<AgingSnapshotDoc | null>
        ]);
        if (rev.length) {
          const r = rev[0];
            const ts = r.createdAt && typeof r.createdAt === 'object' && r.createdAt.toDate? r.createdAt.toDate(): new Date();
            setRevSnap({ mrr: r.mrr, onTime: r.onTimePct, outstanding: r.outstanding, period: r.period, ts });
        }
        if (aging) {
          const ts = aging.createdAt && typeof aging.createdAt === 'object' && aging.createdAt.toDate? aging.createdAt.toDate(): new Date();
          setAgingSnap({ buckets: aging.buckets, ts });
        }
      } catch { /* silent */ }
    })();
  }, [userId, teamId, dataVersion]);

  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  const summary: Summary = useMemo(()=> {
    const live = metrics?.kpis;
    const ks = (live && live.length > 0) ? live : (allowFinanceMocks() && mock ? mock.kpis : []);
    return {
      mrr: ks.find(k=> k.key==='mrr')?.value || 0,
      churn: ks.find(k=> /churn/i.test(k.key))?.value || 0,
      ltv: ks.find(k=> /ltv/i.test(k.key))?.value || 0,
      onTime: ks.find(k=> k.key==='on_time')?.value
    };
  }, [metrics, mock]);

  function handleRefresh(){ setDataVersion(v=> v+1); }
  function exportSnapshot(format: 'json'|'csv'){
    const live = metrics?.kpis;
    const source = (live && live.length > 0) ? live : (mock?.kpis || []);
    const rows = source.map(k=> ({ key:k.key, label:k.label, value:k.value, delta:k.delta }));
    if(format==='json'){
      const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null,2)], { type:'application/json'});
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance-snapshot.json'; a.click(); URL.revokeObjectURL(url); return;
    }
    const header='key,label,value,delta'; const body = rows.map(r=> [r.key,r.label,r.value,r.delta??''].join(','));
    const blob = new Blob([[header,...body].join('\n')], { type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance-snapshot.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function runAutomation(action: 'financeRevenueSnapshot' | 'financeInvoiceAgingDigest') {
    void trigger(action, {
      optimistic: action === 'financeRevenueSnapshot' ? () => {
        setRevSnap(s => s ? { ...s, ts: new Date() } : s);
      } : undefined,
      label: action
    });
  }

  // Classify provenance: live when metrics loaded, fallback when mock only after initial load
  useEffect(()=> { if(initialLoading) return; if(metrics) markLive(); else markFallback(); }, [initialLoading, metrics, markLive, markFallback]);

  return (
  <FeatureGate feature="finance_dashboard" requiredTier="starter" showUpgrade>
      <FinanceContextProvider data={metrics} months={months} refreshing={refreshing}>
    <SuiteAccentProvider value="finance">
  <DashboardSurface as="section" aria-label="Finance dashboard surface" className="p-6 space-y-10">
          <ToolPageHeader
            title="Finance Dashboard"
            description="Subscription economics and capital efficiency with real-time invoice intelligence."
            badges={[{ label: 'Realtime', variant: 'secondary' }, { label: 'Financial', variant: 'outline' }]}
            showBreadcrumb
          >
            <div className="flex gap-2 flex-wrap">
              {[3,6,9,12].map(m => (
                <Button key={m} size="sm" variant={months===m? 'default':'outline'} onClick={()=> setMonths(m)} aria-pressed={months===m}>{m}m</Button>
              ))}
              <Button size="sm" variant="outline" onClick={()=> exportSnapshot('json')} className="gap-1" aria-label="Export finance snapshot JSON"><DownloadCloud className="h-4 w-4"/>JSON</Button>
              <Button size="sm" variant="outline" onClick={()=> exportSnapshot('csv')} className="gap-1" aria-label="Export finance snapshot CSV"><DownloadCloud className="h-4 w-4"/>CSV</Button>
              <Button size="sm" onClick={handleRefresh} disabled={refreshing} className={cn('gap-1', refreshing && 'animate-pulse')} aria-live="polite" aria-busy={refreshing}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{refreshing? 'Refreshing':'Refresh'}</Button>
            </div>
          </ToolPageHeader>
            {/* Banner: show whenever mocks are allowed AND we either have no metrics yet OR metrics loaded but no KPI rows (indicates mock fallback). */}
            {allowFinanceMocks() && (!metrics || !((metrics.kpis && metrics.kpis.length > 0))) && (
            <Alert className="border-warning/30 bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning-foreground" aria-live="polite" aria-label="Finance mock data banner">
              <div className="flex items-start gap-3 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <p>
                  Finance metrics are currently served from mock data (FINANCE_MOCK_MODE). This banner disappears once live metrics load or mocks are disabled.
                </p>
              </div>
            </Alert>
          )}
          <ProvenanceLegend />
          <div className="sr-only" role="status" aria-live="polite">Finance summary: MRR {summary.mrr.toLocaleString()}, churn {summary.churn} percent, LTV {summary.ltv.toLocaleString()}.</div>

          {/* Automation Snapshot Summary Bar */}
          {(revSnap || agingSnap) && (
            <div className="grid gap-3 md:grid-cols-2" aria-label="Latest automation snapshots">
              {revSnap && (
                <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Last Revenue Snapshot</p>
                    <p className="text-muted-foreground">MRR {revSnap.mrr.toLocaleString()} · On-Time {revSnap.onTime.toFixed(1)}% · Outst. {revSnap.outstanding}</p>
                  </div>
                  <time className="text-[10px] text-muted-foreground" dateTime={revSnap.ts.toISOString()}>{revSnap.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
              )}
              {agingSnap && (
                <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Last Aging Digest</p>
                    <p className="text-muted-foreground">0-30 {agingSnap.buckets['0-30']||0} · 31-60 {agingSnap.buckets['31-60']||0} · 61-90 {agingSnap.buckets['61-90']||0} · 90+ {agingSnap.buckets['90+']||0}</p>
                  </div>
                  <time className="text-[10px] text-muted-foreground" dateTime={agingSnap.ts.toISOString()}>{agingSnap.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
              )}
            </div>
          )}

          <motion.section aria-label="Key performance indicators" className="grid gap-4 md:grid-cols-4" variants={dashboardContainerVariants} initial="hidden" animate="visible">
            {initialLoading && Array.from({length:4}).map((_,i)=> (<Skeleton key={i} className="h-32 rounded-xl" shimmer aria-label="Loading metric" />))}
            {!initialLoading && (()=> {
                const liveKpis = metrics?.kpis;
                const baseKpis: AggregatedFinanceMetrics['kpis'] = (liveKpis && liveKpis.length > 0)
                  ? liveKpis
                  : ((allowFinanceMocks() && mock) ? (mock.kpis as AggregatedFinanceMetrics['kpis']) : []);
                return baseKpis.map((k, i) => {
                const pctToTarget = k.target!=null? (k.invertTarget? (k.target / (k.value||1))*100 : (k.value / (k.target||1))*100): null;
                const alertState = pctToTarget!=null? (k.invertTarget? pctToTarget <= 100 : pctToTarget >= 100): false;
                return (
                  <motion.div variants={dashboardItemVariants} key={k.key}>
                    <MetricCard label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || (i === 0 ? 'accent' : 'neutral')} badge={k.target ? (<Badge variant={alertState ? 'default' : 'outline'} className="text-[10px]">{pctToTarget!.toFixed(0)}% target</Badge>) : undefined} footer={k.target ? <AdaptiveProgress value={Math.min(100, pctToTarget!)} invert={!!k.invertTarget} aria-label={`${k.label} target progress`} /> : undefined} />
                  </motion.div>
                );
              });
            })()}
          </motion.section>

            {allowFinanceMocks() && mock?.quotas && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Usage & Quotas</h2>
              <div className="grid gap-4 md:grid-cols-3">
                  {mock.quotas.map(q => (
                  <div key={q.key} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium"><span>{q.label}</span><span className="text-xs text-muted-foreground">{q.used}/{q.limit}</span></div>
                    <QuotaBar used={q.used} limit={q.limit} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-6 md:grid-cols-2" aria-label="Finance analytics modules">
            <div className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MRR Trend</h2><MrrTrend /></div>
            <div className="space-y-3 flex flex-col"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Aging</h2><Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={()=> setShowUnpaid(true)}>Outstanding</Button></div><InvoiceAging /></div>
          </section>

          <section className="space-y-4" aria-label="Finance workbench actions">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance Workbench</h2>
            <div className="grid gap-4 md:grid-cols-5">
              <ActionCard title="Record Invoice" desc="Draft and issue a customer invoice with tax logic." action="Create" />
              <ActionCard title="Update Runway" desc="Recalculate runway assumptions based on burn inputs." action="Recalc" />
              <ActionCard title="On-Time Breakdown" desc="View on-time payment performance by tier." action="Open" onClick={()=> setShowOnTime(true)} />
              <ActionCard title="Revenue Snapshot" desc="Force revenue snapshot" action="Run" onClick={()=> runAutomation('financeRevenueSnapshot')} loading={!!running['financeRevenueSnapshot']} loadingLabel="Running" />
              <ActionCard title="Aging Digest" desc="Queue invoice aging digest" action="Run" onClick={()=> runAutomation('financeInvoiceAgingDigest')} loading={!!running['financeInvoiceAgingDigest']} loadingLabel="Queuing" />
            </div>
          </section>
  </DashboardSurface>
        </SuiteAccentProvider>
        <InvoiceDetailModal open={showUnpaid} onOpenChange={setShowUnpaid} filter="unpaid" />
        <OnTimeBreakdownModal open={showOnTime} onOpenChange={setShowOnTime} />
      </FinanceContextProvider>
    </FeatureGate>
  );
}

// Replaced local ActionCard with shared component for consistency.
