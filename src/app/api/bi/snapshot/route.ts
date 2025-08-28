import { computePlannerHints } from '@/lib/dev/adaptive/planner';
import { emit } from '@/lib/events/event-bus';
import { ensureBiEventSubscribers } from '@/lib/events/subscribers/bi-subscribers';
import { getFinanceMetrics } from '@/lib/finance/metrics';
import { forecastNext } from '@/lib/kpi/predictive';
import { getLogger } from '@/lib/logging/app-logger';
import { ensureSamplerStarted, getTimeSeries, registerRouteForSampling, type BaseTimeSeries, type RouteTimeSeries } from '@/lib/metrics/time-series';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { enforceProvenance } from '@/lib/middleware/provenance';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logger = getLogger('api.bi.snapshot');

export async function GET(req: NextRequest): Promise<NextResponse> {
    const started = Date.now();
    try {
        // kick off lightweight sampler (in-memory only)
        ensureBiEventSubscribers();
        ensureSamplerStarted();
        const url = new URL(req.url);
        const route = url.searchParams.get('route');
        const advisoryFlag = (() => {
            const q = url.searchParams.get('advisory');
            return q === '1' || q === 'true' || q === 'yes';
        })();
        if (route) registerRouteForSampling(route);
        const unified = getUnifiedMetricsSnapshot();
        const { data: finance, headers: financeHeaders } = await getFinanceMetrics(req as unknown as Request);
        // Fire minimal event bus signal for analytics listeners
        try { emit('bi.snapshot.requested', { ts: Date.now(), source: 'api', attrs: { route } }); } catch { /* ignore */ }

        // Optional advisory forecasts (Phase 3, additive-only)
        let advisory: { forecasts: { rateLimitNext: number | null; queueDepthNext: number | null; queueSuccessPctNext: number | null; fallbacksNext: number | null; route?: { p95Next: number | null; p99Next: number | null } }; planner?: ReturnType<typeof computePlannerHints> } | undefined;
        if (advisoryFlag) {
            const series = getTimeSeries(20, route || undefined);
            const base = series as BaseTimeSeries;
            const rateLimitSeries = Array.isArray(base.rateLimit) ? base.rateLimit : [];
            const queueDepthSeries = Array.isArray(base.queueDepth) ? base.queueDepth : [];
            const queueSuccessSeries = Array.isArray(base.queueSuccessPct) ? base.queueSuccessPct : [];
            const fallbacksSeries = Array.isArray(base.fallbacks) ? base.fallbacks : [];
            const rateLimitNext = forecastNext({ samples: rateLimitSeries }).forecast;
            const queueDepthNext = forecastNext({ samples: queueDepthSeries }).forecast;
            const queueSuccessPctNext = forecastNext({ samples: queueSuccessSeries }).forecast;
            const fallbacksNext = forecastNext({ samples: fallbacksSeries }).forecast;
            let routeNode: { p95Next: number | null; p99Next: number | null } | undefined;
            if (route) {
                const withRoute = series as RouteTimeSeries | BaseTimeSeries;
                const p95Series = 'p95' in withRoute && Array.isArray((withRoute as RouteTimeSeries).p95) ? (withRoute as RouteTimeSeries).p95 : [];
                const p99Series = 'p99' in withRoute && Array.isArray((withRoute as RouteTimeSeries).p99) ? (withRoute as RouteTimeSeries).p99 : [];
                if (p95Series.length || p99Series.length) {
                    const p95Next = forecastNext({ samples: p95Series }).forecast;
                    const p99Next = forecastNext({ samples: p99Series }).forecast;
                    routeNode = { p95Next, p99Next };
                }
            }
            advisory = { forecasts: { rateLimitNext, queueDepthNext, queueSuccessPctNext, fallbacksNext, ...(routeNode ? { route: routeNode } : {}) }, planner: computePlannerHints() };
        }

        const body = enforceProvenance(
            {
                ok: true,
                unified,
                finance,
                ...(advisory ? { advisory } : {}),
                // Convenience top-level hints for quick dashboards without parsing
                hints: {
                    queueDepth: unified.queue?.depth ?? 0,
                    // Avoid implicit any from `|| {}` by using the strongly-typed field directly
                    rateLimitRejections: Object.values(unified.rateLimitRejections).reduce((sum, v) => sum + v, 0),
                    aiProvenanceCoveragePct: unified.aiResponses.coveragePct,
                },
            },
            { path: 'bi/snapshot', note: 'ok' }
        );

        const resp = NextResponse.json(body, { status: 200 });
        // Propagate finance mode headers for contract stability (type-narrowed)
        if (financeHeaders && typeof financeHeaders === 'object') {
            const fh = financeHeaders as Record<string, unknown>;
            for (const k of Object.keys(fh)) {
                const v = fh[k];
                if (typeof v === 'string') resp.headers.set(k, v);
            }
        }
        // Minimal cache controls (BI snapshot is near-real-time)
        resp.headers.set('Cache-Control', 'no-store');
        resp.headers.set('X-BI-Generated-At', String(Math.floor(started / 1000)));
        return resp;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('bi.snapshot.error', { message });
        const body = enforceProvenance(
            { ok: false, error: 'internal_error', message: process.env.NODE_ENV !== 'production' ? message : undefined },
            { path: 'bi/snapshot', note: 'exception' }
        );
        return NextResponse.json(body, { status: 500 });
    }
}
