"use client";
import { useEffect, useState } from 'react';

type Snapshot = {
    ok: boolean;
    unified?: {
        aiResponses: { coveragePct: number };
        rateLimitRejections: Record<string, number>;
        fallbackReasons?: Record<string, number>;
        latency: Record<string, { count: number; totalMs: number; maxMs: number; p90?: number | null; p95?: number | null; p99?: number | null }>;
        queue?: { depth: number; successRatio?: number };
    };
    finance?: { [k: string]: unknown };
    hints?: { queueDepth: number; rateLimitRejections: number; aiProvenanceCoveragePct: number };
};

export default function BIDashboardPage() {
    const isProd = process.env.NODE_ENV === 'production';
    const [data, setData] = useState<Snapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // UI kind toggle (affects visible panels and CSV export kind)
    const [kind, setKind] = useState<'all' | 'latency' | 'finance'>('all');
    // p95 trend (client-only) state
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
    const [routeFilter, setRouteFilter] = useState('');
    const [trend, setTrend] = useState<number[]>([]); // p95
    const [trendP99, setTrendP99] = useState<number[]>([]);
    const [fallbackTrend, setFallbackTrend] = useState<number[]>([]);
    const [rateLimitTrend, setRateLimitTrend] = useState<number[]>([]);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            try {
                // Initial load without route coupling; route-specific polling handled in a separate effect
                const res = await fetch('/api/bi/snapshot', { cache: 'no-store' });
                const json = await res.json();
                if (mounted) setData(json);
            } catch (e) {
                if (mounted) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Initialize selectedRoute from top totalMs once data arrives (functional update avoids selectedRoute dep)
    useEffect(() => {
        if (!data?.unified?.latency) return;
        const entries = Object.entries(data.unified.latency);
        const top = entries.sort((a, b) => b[1].totalMs - a[1].totalMs)[0];
        if (!top) return;
        setSelectedRoute((prev) => (prev && data.unified?.latency?.[prev] ? prev : top[0]));
    }, [data]);

    // Poll snapshot periodically to build small p95/p99 trend series for the selected route (client-only)
    useEffect(() => {
        if (!selectedRoute) return;
        let canceled = false;
        const pushP95 = (val: number | null | undefined) => {
            if (val == null || Number.isNaN(val)) return; // skip missing
            setTrend((prev) => {
                const next = [...prev, val];
                // keep last 24 points (~4 minutes at 10s interval)
                return next.length > 24 ? next.slice(next.length - 24) : next;
            });
        };
        const pushP99 = (val: number | null | undefined) => {
            if (val == null || Number.isNaN(val)) return;
            setTrendP99((prev) => {
                const next = [...prev, val];
                return next.length > 24 ? next.slice(next.length - 24) : next;
            });
        };
        // Prime with current snapshot if present
        if (data?.unified?.latency?.[selectedRoute]) {
            const p = data.unified.latency[selectedRoute].p95 ?? null;
            if (p != null) pushP95(p);
            const p99 = data.unified.latency[selectedRoute].p99 ?? null;
            if (p99 != null) pushP99(p99);
        }
        const tick = () => {
            void (async () => {
                try {
                    const res = await fetch(`/api/bi/snapshot${selectedRoute ? `?route=${encodeURIComponent(selectedRoute)}` : ''}`, { cache: 'no-store' });
                    if (!res.ok) return;
                    const json: Snapshot = await res.json();
                    if (canceled) return;
                    const p = json.unified?.latency?.[selectedRoute]?.p95 ?? null;
                    const p99 = json.unified?.latency?.[selectedRoute]?.p99 ?? null;
                    pushP95(p);
                    pushP99(p99);
                } catch {
                    // ignore
                }
            })();
        };
        const id = setInterval(tick, 10_000);
        return () => {
            canceled = true;
            clearInterval(id);
            setTrend([]); // reset when route changes
            setTrendP99([]);
        };
    }, [selectedRoute, data?.unified?.latency]);

    // Poll snapshot periodically to build fallback and rate-limit totals trend (independent of route)
    useEffect(() => {
        let canceled = false;
        const tick = () => {
            void (async () => {
                try {
                    const res = await fetch('/api/bi/snapshot', { cache: 'no-store' });
                    if (!res.ok) return;
                    const json: Snapshot = await res.json();
                    if (canceled) return;
                    const fallbacks = json.unified?.fallbackReasons ? Object.values(json.unified.fallbackReasons).reduce((a, b) => a + (b || 0), 0) : 0;
                    const rl = json.unified?.rateLimitRejections ? Object.values(json.unified.rateLimitRejections).reduce((a, b) => a + (b || 0), 0) : 0;
                    setFallbackTrend((prev) => {
                        const next = [...prev, fallbacks];
                        return next.length > 24 ? next.slice(next.length - 24) : next;
                    });
                    setRateLimitTrend((prev) => {
                        const next = [...prev, rl];
                        return next.length > 24 ? next.slice(next.length - 24) : next;
                    });
                } catch {
                    // ignore
                }
            })();
        };
        const id = setInterval(tick, 10_000);
        // Prime immediately
        tick();
        return () => { canceled = true; clearInterval(id); };
    }, []);

    function ewmaForecast(points: number[], alpha = 0.3): number | null {
        if (!points.length) return null;
        let s = points[0];
        for (let i = 1; i < points.length; i++) {
            s = alpha * points[i] + (1 - alpha) * s;
        }
        return Math.round(s);
    }

    function Sparkline({ points, width = 320, height = 64 }: { points: number[]; width?: number; height?: number }) {
        if (!points.length) return <div className="text-xs text-gray-500">No data yet</div>;
        const min = Math.min(...points);
        const max = Math.max(...points);
        const span = Math.max(1, max - min);
        const stepX = points.length > 1 ? width / (points.length - 1) : width;
        const toY = (v: number) => height - ((v - min) / span) * height;
        const d = points.map((p, i) => `${i * stepX},${toY(p)}`).join(' ');
        return (
            <svg width={width} height={height} className="overflow-visible">
                <polyline fill="none" stroke="currentColor" strokeWidth="2" points={d} />
                {/* last value marker */}
                {points.length > 0 && (
                    <circle cx={(points.length - 1) * stepX} cy={toY(points[points.length - 1])} r="3" fill="currentColor" />
                )}
            </svg>
        );
    }

    if (isProd) {
        // Hide internal dashboards in production
        return (
            <div className="min-h-[50vh] grid place-items-center p-6">
                <div className="text-center">
                    <h1 className="text-xl font-semibold">Not available</h1>
                    <p className="text-muted-foreground">This internal dashboard is disabled in production.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">BI Snapshot</h1>
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                        <span className="text-gray-500">Kind</span>
                        <select
                            aria-label="Kind"
                            className="border rounded px-1 py-0.5 bg-white"
                            value={kind}
                            onChange={(e) => setKind(e.target.value as 'all' | 'latency' | 'finance')}
                        >
                            <option value="all">All</option>
                            <option value="latency">Latency</option>
                            <option value="finance">Finance</option>
                        </select>
                    </div>
                    <a className="underline" href="/api/bi/export?format=json" target="_blank" rel="noreferrer">Export JSON</a>
                    <a className="underline" href={`/api/bi/export?format=csv&kind=${kind}${kind === 'latency' && selectedRoute ? `&route=${encodeURIComponent(selectedRoute)}` : ''}`} target="_blank" rel="noreferrer">Export CSV</a>
                    <a className="underline" href="/api/bi/export?format=csv&kind=ops" target="_blank" rel="noreferrer">Export OPS CSV</a>
                </div>
            </div>

            {loading && <p>Loading…</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && data && (
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded border p-4">
                        <div className="text-sm text-gray-500">Queue depth</div>
                        <div className="text-2xl font-medium">{data.hints?.queueDepth ?? data.unified?.queue?.depth ?? 0}</div>
                    </div>
                    <div className="rounded border p-4">
                        <div className="text-sm text-gray-500">Rate-limit rejections</div>
                        <div className="text-2xl font-medium">{data.hints?.rateLimitRejections ?? 0}</div>
                    </div>
                    <div className="rounded border p-4">
                        <div className="text-sm text-gray-500">AI provenance coverage</div>
                        <div className="text-2xl font-medium">{data.hints?.aiProvenanceCoveragePct ?? data.unified?.aiResponses?.coveragePct ?? 0}%</div>
                    </div>
                </div>
            )}

            {!loading && !error && data?.unified && (kind === 'all' || kind === 'latency') && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Top latency (by total ms)</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left border-b">
                                    <th className="py-2 pr-4">Route</th>
                                    <th className="py-2 pr-4">Count</th>
                                    <th className="py-2 pr-4">Total ms</th>
                                    <th className="py-2 pr-4">Max ms</th>
                                    <th className="py-2 pr-4">p95</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.unified.latency || {})
                                    .sort((a, b) => b[1].totalMs - a[1].totalMs)
                                    .slice(0, 10)
                                    .map(([route, s]) => (
                                        <tr key={route} className="border-b last:border-b-0">
                                            <td className="py-1 pr-4 font-mono text-xs">{route}</td>
                                            <td className="py-1 pr-4">{s.count}</td>
                                            <td className="py-1 pr-4">{s.totalMs}</td>
                                            <td className="py-1 pr-4">{s.maxMs}</td>
                                            <td className="py-1 pr-4">{s.p95 ?? ''}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    {/* p95 trend chart */}
                    <div className="mt-6 rounded border p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">p95 latency trend</h3>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-500" htmlFor="routeSelect">Route</label>
                                <input
                                    type="text"
                                    placeholder="filter"
                                    className="border rounded px-1 py-0.5 bg-white text-sm"
                                    value={routeFilter}
                                    onChange={(e) => setRouteFilter(e.target.value)}
                                />
                                <select
                                    id="routeSelect"
                                    className="border rounded px-1 py-0.5 bg-white text-sm"
                                    value={selectedRoute ?? ''}
                                    onChange={(e) => setSelectedRoute(e.target.value || null)}
                                >
                                    {(Object.entries(data.unified.latency || {})
                                        .filter(([route]) => routeFilter ? route.toLowerCase().includes(routeFilter.toLowerCase()) : true)
                                        .sort((a, b) => b[1].totalMs - a[1].totalMs)
                                        .slice(0, 20) as Array<[string, { totalMs: number }]>)
                                        .map(([route]) => (
                                            <option key={route} value={route}>{route}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">Last ~4 minutes (10s interval) • ms</div>
                        <div className="text-indigo-600">
                            <Sparkline points={trend} />
                        </div>
                        {/* EWMA forecast */}
                        {trend.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">Forecast (EWMA): next ≈ {ewmaForecast(trend)} ms</div>
                        )}
                        {/* p99 companion */}
                        <div className="mt-4">
                            <div className="text-xs text-gray-600 mb-1">p99 trend</div>
                            <div className="text-amber-600">
                                <Sparkline points={trendP99} />
                            </div>
                        </div>
                        <div className="mt-2 text-xs">
                            <a className="underline" href={`/api/bi/timeseries${selectedRoute ? `?route=${encodeURIComponent(selectedRoute)}` : ''}`} target="_blank" rel="noreferrer">Export time-series CSV</a>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !error && data?.finance && (kind === 'all' || kind === 'finance') && (
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Finance snapshot</h2>
                    <pre className="text-xs rounded border p-3 bg-gray-50 overflow-x-auto">{JSON.stringify(data.finance, null, 2)}</pre>
                </div>
            )}

            {!loading && !error && data?.unified?.queue && (kind === 'all' || kind === 'latency') && (
                <div className="rounded border p-4">
                    <h2 className="text-lg font-semibold mb-1">Queue reliability</h2>
                    <div className="text-sm text-gray-600">Success ratio</div>
                    <div className="text-2xl font-medium">{Math.round((data.unified.queue.successRatio || 0) * 100)}%</div>
                </div>
            )}

            {!loading && !error && (kind === 'all' || kind === 'latency') && (
                <div className="rounded border p-4">
                    <h2 className="text-lg font-semibold mb-2">Ops trends</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Fallbacks (total)</div>
                            <div className="text-rose-600">
                                <Sparkline points={fallbackTrend} />
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Rate-limit rejections (total)</div>
                            <div className="text-emerald-600">
                                <Sparkline points={rateLimitTrend} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
