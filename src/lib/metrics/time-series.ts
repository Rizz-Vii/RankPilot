// Minimal in-memory time-series sampler for BI (Phase 3 reporting)
// Samples unified metrics every 10s; keeps a rolling window in-memory only.
import { getUnifiedMetricsSnapshot } from "./unified-metrics";

export type BaseTimeSeries = {
  ts: number[];
  fallbacks: number[];
  rateLimit: number[];
  queueDepth: number[];
  queueSuccessPct: number[];
};
type Series = BaseTimeSeries;
export type RouteTimeSeries = BaseTimeSeries & {
  route: string;
  p95: number[];
  p99: number[];
};
type RouteSeries = { p95: number[]; p99: number[] };

const MAX_POINTS = 144; // ~24 minutes at 10s
const series: Series = {
  ts: [],
  fallbacks: [],
  rateLimit: [],
  queueDepth: [],
  queueSuccessPct: [],
};
const routeSeries = new Map<string, RouteSeries>();
const trackedRoutes = new Set<string>();
let started = false;

function push<T>(arr: T[], val: T) {
  arr.push(val);
  if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
}

function sampleOnce() {
  const u = getUnifiedMetricsSnapshot();
  const ts = Math.floor(Date.now() / 1000);
  const fallbacks = Object.values(u.fallbackReasons || {}).reduce(
    (a, b) => a + b,
    0
  );
  const rl = Object.values(u.rateLimitRejections || {}).reduce(
    (a, b) => a + b,
    0
  );
  const qd = u.queue?.depth ?? 0;
  const qsp = Math.round((u.queue?.successRatio ?? 0) * 100);
  push(series.ts, ts);
  push(series.fallbacks, fallbacks);
  push(series.rateLimit, rl);
  push(series.queueDepth, qd);
  push(series.queueSuccessPct, qsp);
  // Per-route sampling (only tracked routes)
  if (trackedRoutes.size && u.latency) {
    for (const route of trackedRoutes) {
      const stat = u.latency[route];
      const p95 = stat?.p95 ?? null;
      const p99 = stat?.p99 ?? null;
      let rs = routeSeries.get(route);
      if (!rs) {
        rs = { p95: [], p99: [] };
        routeSeries.set(route, rs);
      }
      push(
        rs.p95,
        p95 == null || Number.isNaN(p95) ? (rs.p95.at(-1) ?? 0) : p95
      );
      push(
        rs.p99,
        p99 == null || Number.isNaN(p99) ? (rs.p99.at(-1) ?? 0) : p99
      );
    }
  }
}

export function registerRouteForSampling(route: string) {
  if (!route) return;
  trackedRoutes.add(route);
  if (!routeSeries.has(route)) routeSeries.set(route, { p95: [], p99: [] });
}

export function getTimeSeries(
  windowPoints?: number,
  route?: string
): BaseTimeSeries | RouteTimeSeries {
  const n = Math.max(1, Math.min(MAX_POINTS, windowPoints || MAX_POINTS));
  const sliceFrom = Math.max(0, series.ts.length - n);
  const base: BaseTimeSeries = {
    ts: series.ts.slice(sliceFrom),
    fallbacks: series.fallbacks.slice(sliceFrom),
    rateLimit: series.rateLimit.slice(sliceFrom),
    queueDepth: series.queueDepth.slice(sliceFrom),
    queueSuccessPct: series.queueSuccessPct.slice(sliceFrom),
  };
  if (route) {
    const rs = routeSeries.get(route);
    if (rs) {
      const rp95 = rs.p95.slice(Math.max(0, rs.p95.length - n));
      const rp99 = rs.p99.slice(Math.max(0, rs.p99.length - n));
      const withRoute: RouteTimeSeries = {
        ...base,
        route,
        p95: rp95,
        p99: rp99,
      };
      return withRoute;
    }
  }
  return base;
}

export function ensureSamplerStarted() {
  if (started) return;
  started = true;
  sampleOnce();
  setInterval(sampleOnce, 10_000);
}

// Test-only helpers to enable deterministic unit tests without timers.
// These are safe no-ops in production and are not used by runtime code paths.
export function __sampleOnceTestOnly() {
  sampleOnce();
}

export function __resetTimeSeriesTestOnly() {
  series.ts.length = 0;
  series.fallbacks.length = 0;
  series.rateLimit.length = 0;
  series.queueDepth.length = 0;
  series.queueSuccessPct.length = 0;
  routeSeries.clear();
  trackedRoutes.clear();
  started = false;
}
