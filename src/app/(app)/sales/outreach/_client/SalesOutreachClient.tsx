"use client";
// Sales - Outreach Client: restores prior metrics/workbench UI and embeds the new voice OutreachForm
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { ActionCard } from '@/components/shared/ActionCard';
import { ToolPageHeader } from '@/components/tool-page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAutomationTrigger } from '@/hooks/useAutomationTrigger';
import { useMockDomainMetrics } from '@/hooks/useMockDomainMetrics';
import { useProvenance } from '@/hooks/useProvenance';
import { trackDashboardView } from '@/lib/domain/dashboardAnalytics';
import { getLogger } from '@/lib/logging/app-logger';
import { fetchRecentSalesMetricsSnapshots } from '@/lib/services/sales-automation-snapshots';
import { useEffect, useState } from 'react';
import { NewSequenceModal } from '../../_parts/new-sequence-modal';
import { OutreachForm } from '../OutreachForm';
import { VoiceCallHistory } from '../VoiceCallHistory';

export function SalesOutreachClient() {
    const { data } = useMockDomainMetrics('sales', true);
    const { user } = useAuth();
    const userId = user?.uid;
    const teamId: string | undefined = ((): string | undefined => {
        if (!user || typeof user !== 'object') return undefined;
        const possible = (user as unknown as { teamId?: unknown }).teamId;
        return typeof possible === 'string' ? possible : undefined;
    })();
    interface OutreachHistory { pipeline: number; ts: Date }
    interface SalesMetricsSnapshot { pipeline: number; deals: number; won: number; ts: Date }
    const [snapMetrics, setSnapMetrics] = useState<SalesMetricsSnapshot | null>(null);
    const [loadingSnap, setLoadingSnap] = useState<boolean>(false);
    const [history, setHistory] = useState<OutreachHistory[]>([]);
    const [execSummary, setExecSummary] = useState<{ attempted: number; succeeded: number; failed: number; ts: Date }[]>([]);
    const { trigger, running } = useAutomationTrigger();
    const [seqOpen, setSeqOpen] = useState(false);
    const { markLive, markFallback, ProvenanceLegend } = useProvenance();

    useEffect(() => { trackDashboardView('sales'); }, []);
    function toDateLike(v: unknown): Date {
        if (v instanceof Date) return v;
        if (v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>)) {
            const fn = (v as { toDate?: () => unknown }).toDate;
            if (typeof fn === 'function') {
                const d = fn();
                if (d instanceof Date) return d as Date;
            }
        }
        return new Date();
    }

    useEffect(() => {
        if (!userId) return;
        setLoadingSnap(true);
        let isActive = true;
        void (async () => {
            try {
                const snapsRaw = await fetchRecentSalesMetricsSnapshots(userId, teamId, 6);
                if (!isActive) return;
                const toNum = (v: unknown) => (typeof v === 'number' ? v : 0);
                if (Array.isArray(snapsRaw) && snapsRaw.length) {
                    const first = snapsRaw[0];
                    setSnapMetrics({
                        pipeline: toNum(first.pipeline),
                        deals: toNum(first.totalDeals),
                        won: toNum(first.closedWon),
                        ts: toDateLike(first.createdAt)
                    });
                    setHistory(
                        snapsRaw.map((s) => ({
                            pipeline: toNum(s.pipeline),
                            ts: toDateLike(s.createdAt)
                        }))
                    );
                    markLive();
                } else {
                    markFallback();
                }
            } finally {
                if (isActive) setLoadingSnap(false);
            }
        })();
        return () => { isActive = false; };
    }, [userId, teamId, markLive, markFallback]);

    // Read-only execution metrics snapshot via API
    useEffect(() => {
        if (!user) return;
        void (async () => {
            try {
                const token = await user.getIdToken();
                // Add a short timeout and a dev-friendly probe fallback to avoid hard empty responses
                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), 5000);
                let res: Response | null = null;
                try {
                    res = await fetch('/api/sales/executions/recent', { headers: { authorization: `Bearer ${token}` }, signal: controller.signal });
                } catch {
                    // If aborted or failed, try a probe-mode fetch in development to surface empty data for UI
                    if (process.env.NODE_ENV !== 'production') {
                        try {
                            res = await fetch('/api/sales/executions/recent', { headers: { 'x-probe-token': process.env.NEXT_PUBLIC_CRAWL_PROBE_TOKEN || 'dev' } });
                        } catch { /* ignore */ }
                    }
                } finally {
                    clearTimeout(t);
                }
                if (!res || !res.ok) return;
                const json = await res.json();
                const items: Array<{ stats?: { attempted?: unknown; succeeded?: unknown; failed?: unknown }; startedAt?: unknown }> = Array.isArray(json.executions) ? json.executions : [];
                const toDate = (v: unknown) => (v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>) && typeof (v as { toDate?: () => unknown }).toDate === 'function') ? (v as { toDate: () => unknown }).toDate() as Date : new Date();
                const mapped = items.map((x) => ({ attempted: Number(x?.stats?.attempted || 0), succeeded: Number(x?.stats?.succeeded || 0), failed: Number(x?.stats?.failed || 0), ts: toDate(x?.startedAt) }));
                setExecSummary(mapped);
            } catch (e) {
                getLogger('sales.outreach.page').degraded('execSummary.load_failed', { error: e instanceof Error ? e.message : String(e) });
            }
        })();
        return () => { /* no-op */ };
    }, [user]);

    function runRefresh() { void trigger('salesRefreshMetrics', { optimistic: () => setSnapMetrics(s => s ? { ...s, ts: new Date() } : s) }); }

    return (
        <div className="space-y-10">
            <NewSequenceModal open={seqOpen} onOpenChange={setSeqOpen} onCreated={() => { /* no immediate metric impact */ }} />
            <ToolPageHeader
                title="Outbound Outreach"
                description="Sequence performance, reply velocity & optimization insights across outbound motions."
                badges={[{ label: teamId ? 'Team Scope' : 'User Scope', variant: 'outline' }]}
            >
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSeqOpen(true)}>New Sequence</Button>
                    <Button size="sm" variant="outline">Optimize Copy</Button>
                    <Button size="sm" variant="default">Import Leads</Button>
                </div>
            </ToolPageHeader>

            {/* Voice Outreach Form (new capability) */}
            <section className="rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-2">Outbound Voice Outreach</h2>
                <p className="text-sm text-muted-foreground mb-4">Configure voice, tone, speed, script, recipients, and caller ID.</p>
                <OutreachForm />
            </section>

            {/* Call History */}
            <VoiceCallHistory />

            <div>
                <ProvenanceLegend />
                {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
                {!loadingSnap && snapMetrics && (
                    <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs" aria-label="Latest metrics snapshot">
                        <div className="space-y-1">
                            <p className="font-medium">Last Metrics Snapshot</p>
                            <p className="text-muted-foreground">Pipeline {snapMetrics.pipeline.toLocaleString()} · Deals {snapMetrics.deals} · Won {snapMetrics.won}</p>
                            {history.length > 1 && (
                                <div className="flex gap-1 items-end mt-1" aria-label="Pipeline mini history">
                                    {history.slice(0, 8).reverse().map((h, i) => {
                                        const max = Math.max(...history.map(x => x.pipeline));
                                        const pct = max ? Math.max(4, Math.round((h.pipeline / max) * 32)) : 4;
                                        return <span key={i} className="inline-block w-1.5 rounded-sm bg-primary/70" style={{ height: pct }} aria-hidden="true" />;
                                    })}
                                </div>
                            )}
                        </div>
                        <time className="text-[10px] text-muted-foreground" dateTime={snapMetrics.ts.toISOString()}>{snapMetrics.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                )}
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                {(data?.kpis || []).map(k => (
                    <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
                ))}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outreach Workbench</h2>
                <div className="grid gap-4 md:grid-cols-5">
                    <ActionCard title="New Sequence" desc="AI-personalized multi-step" action={() => setSeqOpen(true)} label="Create" />
                    <ActionCard title="Optimize Copy" desc="Improve open & reply rates" action={() => { /* future: open optimize modal */ }} label="Optimize" />
                    <ActionCard title="Import Leads" desc="Bulk import + enrichment" action={() => { /* future: open import flow */ }} label="Import" />
                    <ActionCard title="Reply Analysis" desc="Sentiment & intent signals" action={() => { /* future: navigate to replies */ }} label="Analyze" />
                    <ActionCard title="Refresh Metrics" desc="Force metrics snapshot" action={runRefresh} label={running['salesRefreshMetrics'] ? 'Refreshing…' : 'Run'} disabled={!!running['salesRefreshMetrics']} />
                </div>
            </section>

            {!!execSummary.length && (
                <section className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Executions</h2>
                    <div className="grid gap-2 md:grid-cols-3">
                        {execSummary.map((x, i) => (
                            <div key={i} className="rounded-md border p-3 text-xs">
                                <div className="font-medium">Run {i + 1}</div>
                                <div className="text-muted-foreground mt-1">Attempted {x.attempted} · Succeeded {x.succeeded} · Failed {x.failed}</div>
                                <time className="text-[10px] text-muted-foreground" dateTime={x.ts.toISOString()}>{x.ts.toLocaleString()}</time>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
