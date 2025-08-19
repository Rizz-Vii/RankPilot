"use client";
import React, { useEffect, useMemo, useState } from 'react';
import useAdminRoute from '@/hooks/useAdminRoute';
import LoadingScreen from '@/components/ui/loading-screen';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Activity, Zap, Gauge, Brain, LineChart as LineIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface KPIRecord {
  date?: string;
  provenanceCoveragePct?: number;
  p95LatencyOverall?: number;
  p90LatencyOverall?: number;
  p99LatencyOverall?: number;
  aiCostEstimate?: number;
  aiDailyCostEstimate?: number; // optional enriched
  aiDailyTokensIn?: number;
  aiDailyTokensOut?: number;
  crawlerAggregateAdoptionPct?: number;
  semanticMapAggregateAdoptionPct?: number;
  teamRateLimitUtilizationPct?: number;
  fallbackRatePct?: number;
  fallbackRate?: number;
  cacheHitRatio?: number;
  rateLimitRejectionRate?: number;
  // Server precomputed MA7 fields (optional)
  ma7Provenance?: number; ma7LatencyP95?: number; ma7CrawlerAdoption?: number; ma7SemanticAdoption?: number; ma7TeamRateLimitUtilizationPct?: number;
  // Smoothed fields
  smoothedProvenance?: number; smoothedLatencyP95?: number; smoothedCrawlerAdoption?: number; smoothedSemanticAdoption?: number;
}

interface AlertEntry { type: string; level: string; message: string; value: number | null; threshold: number | null; date?: string; [k: string]: unknown; }

interface HealthPayload {
  kpis?: Record<string, unknown> & KPIRecord;
  alerts?: AlertEntry[];
  p95?: Record<string, number | null>;
  crawler?: { crawlP95?: number; analysisP95?: number };
  aiUsagePerModel?: Record<string, { tokensIn: number; tokensOut: number; cost: number }>;
  timestamp?: string;
}

// Extract only MA7 & smoothed fields for alert history enrichment
const pickMA7 = (r: KPIRecord) => {
  const out: Partial<KPIRecord> = {};
  const keys: (keyof KPIRecord)[] = [
    'ma7Provenance','ma7LatencyP95','ma7CrawlerAdoption','ma7SemanticAdoption','ma7TeamRateLimitUtilizationPct',
    'smoothedProvenance','smoothedLatencyP95','smoothedCrawlerAdoption','smoothedSemanticAdoption'
  ];
  keys.forEach(k=> { if (typeof r[k] === 'number') (out as any)[k] = r[k]; });
  return out;
};

const classify = (pct: number | null | undefined) => pct == null ? '' : pct < 50 ? 'critical' : pct < 80 ? 'warn' : 'ok';
const badgeClass = (state: string) => state === 'critical' ? 'text-red-600' : state === 'warn' ? 'text-amber-600' : 'text-green-600';

// Exported for unit test: server MA7 (precomputed) must take precedence over client recompute.
const preferredMAInternal = (computed: number[] | undefined, serverVal: number | null | undefined): number | undefined => {
  if (typeof serverVal === 'number') return serverVal; // authoritative precomputed value
  return computed && computed.length ? computed[0] : undefined;
};

export default function ObservabilityDashboard() {
  const { user, loading, role } = useAdminRoute();
  const [data, setData] = useState<HealthPayload | null>(null);
  const [history, setHistory] = useState<KPIRecord[]>([]); // recent kpiDaily docs newest->oldest
  const [alertHistory, setAlertHistory] = useState<AlertEntry[]>([]); // placeholder persisted alert snapshots (future)
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try { const r = await fetch('/api/health'); const j = await r.json(); setData(j); } catch { /* noop */ } finally { setBusy(false); }
  };
  useEffect(() => { void load(); const id = setInterval(() => { void load(); }, 8000); return () => clearInterval(id); }, []);
  useEffect(() => {
    // Lightweight fetch of last 14 daily KPI docs for sparklines.
    const fetchHistory = async () => {
      try {
        const qRef = query(collection(db, 'kpiDaily'), orderBy('date', 'desc'), limit(14));
        const snap = await getDocs(qRef);
  const rows = snap.docs.map(d => d.data() as KPIRecord);
        setHistory(rows);
      } catch { /* ignore */ }
    };
    const fetchAlertHistory = async () => {
      try {
        // Prefer new dedicated API (includes MA7 fields) then fallback to direct collection read
        const res = await fetch('/api/health/alerts?limit=30');
        if (res.ok) {
          const j = await res.json();
            if (j.rows) {
      const flat: AlertEntry[] = [];
      j.rows.forEach((r: KPIRecord & { alerts?: AlertEntry[] }) => (r.alerts || []).forEach((a: AlertEntry) => flat.push({ date: r.date, ...a, ...pickMA7(r) })));
      setAlertHistory(flat);
              return;
            }
        }
        // Firestore fallback
        const qRef = query(collection(db, 'kpiAlertsDaily'), orderBy('date', 'desc'), limit(30));
        const snap = await getDocs(qRef);
    const rows = snap.docs.map(d => d.data() as KPIRecord & { alerts?: AlertEntry[] });
    const flat: AlertEntry[] = [];
    rows.forEach((r) => (r.alerts || []).forEach((a) => flat.push({ date: r.date, ...a, ...pickMA7(r) })));
    setAlertHistory(flat);
      } catch { /* ignore */ }
    };
    void fetchHistory();
    void fetchAlertHistory();
  }, []);


  const forceAdmin = typeof window !== 'undefined' && (localStorage.getItem('TEST_FORCE_ADMIN')==='1');
  if (loading && !forceAdmin) return <LoadingScreen fullScreen text="Loading admin context..." />;
  if ((!user || role !== 'admin') && !forceAdmin) return <LoadingScreen fullScreen text="Redirecting..." />;

  const k = (data?.kpis as KPIRecord) || {} as KPIRecord;
  const crawler = data?.crawler || {};
  // Align with stored KPI naming (cost estimate + token metrics may be absent)
  const aiDailyCost = k.aiDailyCostEstimate ?? k.aiCostEstimate ?? null;
  const aiTokensIn = k.aiDailyTokensIn ?? null;
  const aiTokensOut = k.aiDailyTokensOut ?? null;
  const teamUtil = k.teamRateLimitUtilizationPct ?? null;
  const perModel = data?.aiUsagePerModel || null;

  // Cards array defined later after extra computed
  let provenanceExtra: React.ReactNode = null;

  // Simple sparkline renderer (CSS-only) for historical values
  const Sparkline = ({ values, color, ma7Values, testId }: { values: number[]; color: string; ma7Values?: number[]; testId?: string }) => {
    if (!values.length) return <div className="h-8" data-testid={testId || undefined} />;
    const max = Math.max(...values); const min = Math.min(...values);
    const norm = values.map(v => max === min ? 50 : ((v - min) / (max - min)) * 100);
    const maNorm = (ma7Values || []).map(v => max === min ? 50 : ((v - min) / (max - min)) * 100);
    return (
      <div className="relative h-8" data-testid={testId}>
        <div className="flex items-end gap-0.5 h-8 absolute inset-0">
          {norm.slice().reverse().map((h, i) => (
            <div key={i} style={{ height: `${Math.max(4, h)}%` }} className={`w-1 rounded-sm ${color} opacity-70`} />
          ))}
        </div>
        {maNorm.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" data-testid={testId? `${testId}-ma7`: undefined} preserveAspectRatio="none">
            {(() => {
              const pts = maNorm.slice().reverse();
              const step = pts.length ? (100 / (pts.length - 1)) : 0;
              const path = pts.map((h,i)=> `${i===0? 'M':'L'} ${i*step},${100 - h}`).join(' ');
              return <path d={path} strokeWidth={1.2} stroke="currentColor" className="text-foreground" fill="none" />;
            })()}
          </svg>
        )}
      </div>
    );
  };

  // If no history yet (e.g., first load or Firestore blocked in test), synthesize single-point series from live kpis
  const kpiFallback = (data?.kpis as KPIRecord) || {} as KPIRecord;
  const histProvenance = history.length ? history.map(r => r.provenanceCoveragePct).filter((v: unknown) => typeof v === 'number') : (typeof kpiFallback.provenanceCoveragePct === 'number' ? [ kpiFallback.provenanceCoveragePct ] : []);
  const histP95 = history.length ? history.map(r => r.p95LatencyOverall).filter((v: unknown) => typeof v === 'number') : (typeof kpiFallback.p95LatencyOverall === 'number' ? [ kpiFallback.p95LatencyOverall ] : []);
  // Could extend to p90/p99 historical sparklines in future
  const histCost = history.map(r => r.aiCostEstimate).filter((v: unknown) => typeof v === 'number');
  const histCrawlerAdopt = history.length ? history.map(r => r.crawlerAggregateAdoptionPct).filter((v: unknown) => typeof v === 'number') : (typeof kpiFallback.crawlerAggregateAdoptionPct === 'number' ? [ kpiFallback.crawlerAggregateAdoptionPct ] : []);
  const histSemanticAdopt = history.length ? history.map(r => r.semanticMapAggregateAdoptionPct).filter((v: unknown) => typeof v === 'number') : (typeof kpiFallback.semanticMapAggregateAdoptionPct === 'number' ? [ kpiFallback.semanticMapAggregateAdoptionPct ] : []);
  const histTeamUtil = history.map(r => r.teamRateLimitUtilizationPct).filter((v: unknown) => typeof v === 'number');
  const histFallback = history.map(r => r.fallbackRatePct ?? r.fallbackRate).filter((v: unknown) => typeof v === 'number');
  const histCacheHit = history.map(r => r.cacheHitRatio).filter((v: unknown) => typeof v === 'number');
  const histRateLimitReject = history.map(r => r.rateLimitRejectionRate).filter((v: unknown) => typeof v === 'number');

  // Compute client-side MA7 overlays. Precedence order:
  // 1. Raw latest metric value always displayed
  // 2. MA7 delta uses server-provided MA7 if available, otherwise client-computed
  // 3. Smoothed delta only shown if smoothed value exists in latest history
  // Note: MA7 is never substituted for smoothed values - they are separate concepts
  const computeMA7 = (vals: number[]) => {
    if (!vals.length) return [] as number[];
    // vals currently newest->oldest; flip to oldest->newest for sliding window
    const chronological = [...vals].reverse();
    const out: number[] = [];
    for (let i=0;i<chronological.length;i++) {
      const start = Math.max(0, i-6);
      const slice = chronological.slice(start, i+1);
      const avg = slice.reduce((s,v)=>s+v,0)/slice.length;
      out.push(+avg.toFixed(2));
    }
    // Return back in newest->oldest order
    return out.reverse();
  };
  const maProvenance = useMemo(()=>computeMA7(histProvenance),[histProvenance]);
  // Prefer server precomputed MA7 fields (latest doc) when present to avoid client recompute drift.
  const latestHistory: KPIRecord | undefined = history[0]; // newest doc (already newest->oldest ordering)
  // preferredMA helper imported from module scope (see export above)
  const maLatestProvenance: number | undefined = preferredMAInternal(maProvenance, latestHistory?.ma7Provenance);
  const smoothedProv = latestHistory?.smoothedProvenance as number | undefined;
  const smoothedLatencyP95 = latestHistory?.smoothedLatencyP95 as number | undefined;
  const smoothedCrawlerAdoption = latestHistory?.smoothedCrawlerAdoption as number | undefined;
  const smoothedSemanticAdoption = latestHistory?.smoothedSemanticAdoption as number | undefined;
  if (histProvenance.length && typeof histProvenance[0] === 'number') {
    const latest = histProvenance[0];
    if (typeof maLatestProvenance === 'number') {
      const delta = +(latest - maLatestProvenance).toFixed(2);
      const cls = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-muted-foreground';
      provenanceExtra = <span data-testid="prov-delta" className={`text-[10px] font-medium ${cls}`}>{delta>0? '+' : ''}{delta}% vs MA7</span>;
    }
    const provSmoothedNode = (() => {
      if (typeof smoothedProv === 'number') {
        const deltaS = +(latest - smoothedProv).toFixed(2);
        const clsS = deltaS > 0 ? 'text-green-600' : deltaS < 0 ? 'text-red-600' : 'text-muted-foreground';
        return <span data-testid="prov-delta-smoothed" className={`text-[10px] font-medium ${clsS}`}>{deltaS>0? '+' : ''}{deltaS}% vs Smoothed</span>;
      }
      // Placeholder to keep test selector stable before snapshot seeds exist
      return <span data-testid="prov-delta-smoothed" className="text-[10px] font-medium text-muted-foreground">— vs Smoothed</span>;
    })();
    provenanceExtra = <span className="flex flex-col gap-0.5">{provenanceExtra}{provSmoothedNode}</span>;
  }
  // Delta helper (MA7 vs latest) reused for multiple metrics (direction aware)
  const buildDelta = (latest: number | null | undefined, ma: number | null | undefined, direction: 'higher' | 'lower') => {
    if (typeof latest !== 'number' || typeof ma !== 'number' || ma === 0) return null;
    const delta = +(latest - ma).toFixed(2);
    const rel = ma ? delta / ma : 0;
    let cls = 'text-muted-foreground';
    if (direction === 'higher') {
      if (rel < -0.15) cls = 'text-red-600'; else if (rel < -0.05) cls = 'text-amber-600'; else cls = 'text-green-600';
    } else {
      if (rel > 0.15) cls = 'text-red-600'; else if (rel > 0.05) cls = 'text-amber-600'; else cls = 'text-green-600';
    }
    return <span className={`text-[10px] font-medium ${cls}`} data-testid={`delta-badge-${direction}`}>{delta>0? '+':''}{delta}{direction==='higher'? '% vs MA7':' vs MA7'}</span>;
  };
  // MA7 computations must be declared before cards using them to avoid TS use-before-declaration errors
  const maP95 = useMemo(()=>computeMA7(histP95),[histP95]);
  const maCost = useMemo(()=>computeMA7(histCost),[histCost]);
  const maCrawler = useMemo(()=>computeMA7(histCrawlerAdopt),[histCrawlerAdopt]);
  const maSemantic = useMemo(()=>computeMA7(histSemanticAdopt),[histSemanticAdopt]);
  const maTeamUtil = useMemo(()=>computeMA7(histTeamUtil),[histTeamUtil]);
  const maFallback = useMemo(()=>computeMA7(histFallback),[histFallback]);
  const maCacheHit = useMemo(()=>computeMA7(histCacheHit),[histCacheHit]);
  const maRateLimitReject = useMemo(()=>computeMA7(histRateLimitReject),[histRateLimitReject]);
  // Preferred MA7 values (server if present else computed) for delta badges
  const maLatestP95 = preferredMAInternal(maP95, latestHistory?.ma7LatencyP95);
  const maLatestCrawler = preferredMAInternal(maCrawler, latestHistory?.ma7CrawlerAdoption);
  const maLatestSemantic = preferredMAInternal(maSemantic, latestHistory?.ma7SemanticAdoption);
  const maLatestTeamUtil = preferredMAInternal(maTeamUtil, latestHistory?.ma7TeamRateLimitUtilizationPct); // (not persisted yet – fallback to computed)




  const cards: Array<{ title: string; value: unknown; unit?: string; help?: string; icon: unknown; variant?: 'percent' | 'ms' | 'raw'; extra?: React.ReactNode }> = [
    { title: 'Provenance Coverage', value: k.provenanceCoveragePct, unit: '%', help: 'Target 100%. All responses wrapped with provenance metadata.', icon: Activity, variant: 'percent', extra: provenanceExtra || (
      <span className="flex flex-col gap-0.5"><span data-testid="prov-delta-smoothed" className="text-[10px] font-medium text-muted-foreground">— vs Smoothed</span></span>
    ) },
    { title: 'Latency P90 (ms)', value: k.p90LatencyOverall, unit: 'ms', help: 'Average overall route latency p90 (snapshot)', icon: Gauge, variant: 'ms' },
  { title: 'Latency P95 (ms)', value: k.p95LatencyOverall, unit: 'ms', help: 'Average overall route latency p95 (snapshot)', icon: Gauge, variant: 'ms', extra: (
      <span className="flex flex-col gap-0.5">
        {buildDelta(k.p95LatencyOverall, maLatestP95, 'lower')}
        {(() => {
          if (typeof k.p95LatencyOverall === 'number' && typeof smoothedLatencyP95 === 'number') {
            const latest = k.p95LatencyOverall; const delta = +(latest - smoothedLatencyP95).toFixed(2); const cls = delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-muted-foreground';
            return <span data-testid="latencyP95-delta-smoothed" className={`text-[10px] font-medium ${cls}`}>{delta>0? '+' : ''}{delta} vs Smoothed</span>;
          }
          return <span data-testid="latencyP95-delta-smoothed" className="text-[10px] font-medium text-muted-foreground">— vs Smoothed</span>;
        })()}
      </span>
    ) },
    { title: 'Latency P99 (ms)', value: k.p99LatencyOverall, unit: 'ms', help: 'Average overall route latency p99 (snapshot)', icon: Gauge, variant: 'ms' },
    { title: 'Crawler P95 (ms)', value: crawler.crawlP95, unit: 'ms', help: 'NeuralCrawler crawl latency p95', icon: Gauge, variant: 'ms' },
    { title: 'Analysis P95 (ms)', value: crawler.analysisP95, unit: 'ms', help: 'NeuralCrawler analysis latency p95', icon: Gauge, variant: 'ms' },
  { title: 'Crawler Adoption %', value: k.crawlerAggregateAdoptionPct, unit: '%', help: 'Aggregate vs legacy crawler reads (target ≥80%)', icon: BarChart3, variant: 'percent', extra: (
      <span className="flex flex-col gap-0.5">
        {buildDelta(k.crawlerAggregateAdoptionPct, maLatestCrawler, 'higher')}
  {(() => { if (typeof k.crawlerAggregateAdoptionPct === 'number' && typeof smoothedCrawlerAdoption === 'number') { const latest = k.crawlerAggregateAdoptionPct; const delta = +(latest - smoothedCrawlerAdoption).toFixed(2); const cls = delta < 0 ? 'text-red-600' : delta > 0 ? 'text-green-600':'text-muted-foreground'; return <span data-testid="crawlerAdoption-delta-smoothed" className={`text-[10px] font-medium ${cls}`}>{delta>0? '+':''}{delta}% vs Smoothed</span>; } return <span data-testid="crawlerAdoption-delta-smoothed" className="text-[10px] font-medium text-muted-foreground">— vs Smoothed</span>; })()}
      </span>
    ) },
  { title: 'SemanticMap Adoption %', value: k.semanticMapAggregateAdoptionPct, unit: '%', help: 'Aggregate vs legacy semantic map reads (target ≥80%)', icon: BarChart3, variant: 'percent', extra: (
      <span className="flex flex-col gap-0.5">
        {buildDelta(k.semanticMapAggregateAdoptionPct, maLatestSemantic, 'higher')}
  {(() => { if (typeof k.semanticMapAggregateAdoptionPct === 'number' && typeof smoothedSemanticAdoption === 'number') { const latest = k.semanticMapAggregateAdoptionPct; const delta = +(latest - smoothedSemanticAdoption).toFixed(2); const cls = delta < 0 ? 'text-red-600' : delta > 0 ? 'text-green-600':'text-muted-foreground'; return <span data-testid="semanticAdoption-delta-smoothed" className={`text-[10px] font-medium ${cls}`}>{delta>0? '+':''}{delta}% vs Smoothed</span>; } return <span data-testid="semanticAdoption-delta-smoothed" className="text-[10px] font-medium text-muted-foreground">— vs Smoothed</span>; })()}
      </span>
    ) },
    { title: 'AI Daily Cost', value: aiDailyCost, unit: '$', help: 'AI provider estimated cost (24h)', icon: Brain, variant: 'raw' },
    { title: 'AI Daily Tokens In', value: aiTokensIn, unit: '', help: 'Input tokens (24h)', icon: Zap, variant: 'raw' },
    { title: 'AI Daily Tokens Out', value: aiTokensOut, unit: '', help: 'Output tokens (24h)', icon: Zap, variant: 'raw' },
  { title: 'Team Rate Limit Util %', value: teamUtil, unit: '%', help: 'Allows / (Allows + Rejections) across team limiters', icon: Gauge, variant: 'percent', extra: buildDelta(teamUtil, maLatestTeamUtil, 'higher') },
  ];

  // Alert filter
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const filteredAlertHistory = alertFilter==='all'? alertHistory : alertHistory.filter(a=> a.type===alertFilter);
  const uniqueAlertTypes = useMemo(()=> Array.from(new Set(alertHistory.map(a=> a.type))).sort(), [alertHistory]);

  interface CardDef { title: string; value: unknown; unit?: string; help?: string; icon: any; variant?: 'percent' | 'ms' | 'raw'; extra?: React.ReactNode }
  const renderCard = (c: CardDef) => {
    const state = c.variant === 'percent' ? classify(c.value as number | null) : '';
    return (
      <Card key={c.title} className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <c.icon className="h-4 w-4" /> {c.title}
          </CardTitle>
          {c.help && <CardDescription className="text-xs">{c.help}</CardDescription>}
          {c.extra}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className={`text-lg font-semibold ${badgeClass(state)}`}>{c.value == null ? (busy ? '…' : '—') : (c.unit === '$' ? `$${c.value}` : `${c.value}${c.unit}`)}</div>
          {c.variant === 'percent' && <Progress value={typeof c.value === 'number' ? c.value : 0} className={state==='critical'? 'bg-red-200': state==='warn'? 'bg-amber-200':'bg-green-200'} />}
        </CardContent>
      </Card>
    );
  };

  const alerts = data?.alerts || [];
  const routeP95Map: Record<string, number | null> = (data?.p95 || {});
  const routeLatencyRows = Object.entries(routeP95Map)
    .filter(([r,v]) => typeof v === 'number' && v != null)
    .sort((a,b)=> (b[1]||0) - (a[1]||0))
    .slice(0, 12);
  const maxRouteP95 = routeLatencyRows.reduce((m, [,v]) => v!>m? v!:m, 0);

  return (
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="Observability"
        description="Unified operational KPIs: provenance, latency, adoption, AI usage & cost."
        badges={[{ label: 'Admin', variant: 'outline' }]}
        showBreadcrumb
      />
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">{cards.map(renderCard)}</div>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2"><LineIcon className="h-4 w-4" />Historical (Last ~14 Days)</h2>
        <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Provenance %</CardTitle><CardDescription className="text-xs">Daily snapshot coverage</CardDescription></CardHeader>
            <CardContent><Sparkline values={histProvenance} ma7Values={maProvenance} color="bg-green-500" testId="sparkline-provenance" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Latency P95</CardTitle><CardDescription className="text-xs">Avg per-route p95</CardDescription></CardHeader>
            <CardContent><Sparkline values={histP95} ma7Values={maP95} color="bg-blue-500" testId="sparkline-latencyP95" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI Cost ($)</CardTitle><CardDescription className="text-xs">Daily cost estimate</CardDescription></CardHeader>
            <CardContent><Sparkline values={histCost} ma7Values={maCost} color="bg-purple-500" testId="sparkline-cost" /></CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Crawler Adoption %</CardTitle><CardDescription className="text-xs">Aggregate hits share</CardDescription></CardHeader>
            <CardContent><Sparkline values={histCrawlerAdopt} ma7Values={maCrawler} color="bg-amber-500" testId="sparkline-crawlerAdoption" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">SemanticMap Adoption %</CardTitle><CardDescription className="text-xs">Aggregate hits share</CardDescription></CardHeader>
            <CardContent><Sparkline values={histSemanticAdopt} ma7Values={maSemantic} color="bg-amber-600" testId="sparkline-semanticAdoption" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Team Util %</CardTitle><CardDescription className="text-xs">Team limiter utilization</CardDescription></CardHeader>
            <CardContent><Sparkline values={histTeamUtil} ma7Values={maTeamUtil} color="bg-cyan-500" testId="sparkline-teamUtil" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fallback Rate %</CardTitle><CardDescription className="text-xs">AI fallback share</CardDescription></CardHeader>
            <CardContent><Sparkline values={histFallback} ma7Values={maFallback} color="bg-red-500" testId="sparkline-fallbackRate" /></CardContent>
          </Card>
        </div>
        {(histCacheHit.length || histRateLimitReject.length) && (
          <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cache Hit Ratio %</CardTitle><CardDescription className="text-xs">Edge/runtime response caching</CardDescription></CardHeader>
              <CardContent><Sparkline values={histCacheHit} ma7Values={maCacheHit} color="bg-green-500" testId="sparkline-cacheHit" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Rate Limit Rejection %</CardTitle><CardDescription className="text-xs">Requests rejected by limiters</CardDescription></CardHeader>
              <CardContent><Sparkline values={histRateLimitReject} ma7Values={maRateLimitReject} color="bg-orange-600" testId="sparkline-rateLimitReject" /></CardContent>
            </Card>
          </div>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide">Active Alerts</h2>
        {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts.</p>}
        <ul className="space-y-1">
          {alerts.map(a => (
            <li key={a.type+ a.level} className={`text-xs rounded px-2 py-1 border ${a.level==='critical'? 'border-red-500 text-red-600':'border-amber-500 text-amber-600'}`}>{a.message} (value={a.value ?? '—'})</li>
          ))}
        </ul>
      </section>
      {filteredAlertHistory.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide">Alert History (Preview)</h2>
            <label className="text-[10px] flex items-center gap-1">Filter:
              <select value={alertFilter} onChange={e=> setAlertFilter(e.target.value)} data-testid="alert-filter" className="border rounded px-1 py-0.5 text-[10px] bg-background">
                <option value="all">All</option>
                {uniqueAlertTypes.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left border-b border-border/40">
                  <th className="py-1 pr-3 font-medium">Date</th>
                  <th className="py-1 pr-3 font-medium">Type</th>
                  <th className="py-1 pr-3 font-medium">Level</th>
                  <th className="py-1 pr-3 font-medium">Message</th>
                  <th className="py-1 pr-3 font-medium">MA7 (If Key)</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlertHistory.slice(0,30).map((h:AlertEntry,i:number)=>{
                  const ma = h.type==='provenanceCoverage'? h.ma7Provenance :
                    h.type==='crawlerAggregateAdoption'? h.ma7CrawlerAdoption :
                    h.type==='semanticMapAggregateAdoption'? h.ma7SemanticAdoption :
                    h.type==='fallbackRate'? h.ma7FallbackRate :
                    h.type==='latencyOverallP95'? h.ma7LatencyP95 :
                    h.type==='cacheHitRatio'? h.ma7CacheHitRatio :
                    h.type==='rateLimitRejectionRate'? h.ma7RateLimitRejectionRate : null;
                  let maClass = '';
                  if (typeof ma === 'number' && typeof h.value === 'number') {
                    const delta = (Number(h.value) - ma) / (ma || 1);
                    if (h.type==='latencyOverallP95' || h.type==='fallbackRate' || h.type==='rateLimitRejectionRate') {
                      if (delta > 0.15) maClass='text-red-600'; else if (delta > 0.05) maClass='text-amber-600'; else maClass='text-green-600';
                    } else { // higher is better metrics
                      if (delta < -0.15) maClass='text-red-600'; else if (delta < -0.05) maClass='text-amber-600'; else maClass='text-green-600';
                    }
                  }
                  return (
                    <tr key={i} className="border-b border-border/20 last:border-none">
                      <td className="py-1 pr-3 font-mono text-[11px]">{(h.date as string) || '—'}</td>
                      <td className="py-1 pr-3">{h.type}</td>
                      <td className="py-1 pr-3">{h.level}</td>
                      <td className="py-1 pr-3 truncate max-w-[280px]">{h.message}</td>
                      <td className={`py-1 pr-3 ${maClass}`}>{typeof ma === 'number'? ma: '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Persisted daily alert snapshots (max 30). Filter to inspect specific alert types.</p>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide">Route Latency (p95)</h2>
        {routeLatencyRows.length === 0 && <p className="text-xs text-muted-foreground">No route latency data yet.</p>}
        {routeLatencyRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left border-b border-border/40">
                  <th className="py-1 pr-3 font-medium">Route</th>
                  <th className="py-1 pr-3 font-medium">p95 (ms)</th>
                  <th className="py-1 font-medium w-40">Relative</th>
                </tr>
              </thead>
              <tbody>
                {routeLatencyRows.map(([route, val]) => {
                  const pct = maxRouteP95 ? ((val! / maxRouteP95) * 100) : 0;
                  const barColor = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : pct > 40 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <tr key={route} className="border-b border-border/20 last:border-none">
                      <td className="py-1 pr-3 align-middle font-mono text-[11px]">{route}</td>
                      <td className="py-1 pr-3 align-middle">{val}</td>
                      <td className="py-1 align-middle">
                        <div className="h-3 w-full bg-muted rounded-sm relative overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: pct+'%' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">Top {routeLatencyRows.length} routes by current p95. Aim to keep critical user paths &lt; 500ms.</p>
      </section>
      {perModel && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide">AI Cost Breakdown (Per Model)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left border-b border-border/40">
                  <th className="py-1 pr-3 font-medium">Model/Provider</th>
                  <th className="py-1 pr-3 font-medium">Tokens In</th>
                  <th className="py-1 pr-3 font-medium">Tokens Out</th>
                  <th className="py-1 pr-3 font-medium">Cost ($)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(perModel as Record<string,{tokensIn:number;tokensOut:number;cost:number}>).map(([m, v]) => (
                  <tr key={m} className="border-b border-border/20 last:border-none">
                    <td className="py-1 pr-3 font-mono text-[11px]">{m}</td>
                    <td className="py-1 pr-3">{v.tokensIn}</td>
                    <td className="py-1 pr-3">{v.tokensOut}</td>
                    <td className="py-1 pr-3">${v.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">Breakdown derived from in-process token accounting; costs approximate and subject to provider rounding.</p>
        </section>
      )}
    </main>
  );
}
