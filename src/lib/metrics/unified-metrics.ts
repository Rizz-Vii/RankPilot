// Unified Metrics Module (OBS-01)
// Provides provenance coverage counters and simple latency aggregation per route.

export interface RouteLatencyStats {
    count: number;
    totalMs: number;
    maxMs: number;
}

export interface UnifiedMetricsSnapshot {
    aiResponses: {
        total: number;
        withProvenance: number;
        missingProvenance: number;
        coveragePct: number; // (with / total) * 100
    };
    latency: Record<string, RouteLatencyStats & { buckets: Record<string, number>; p90: number | null; p95: number | null; p99: number | null }>; // adds histogram buckets counts & percentiles
    fallbackReasons: Record<string, number>; // timeout, backend_error, rate_limited, circuit_open, other
    errorTaxonomy: Record<string, number>; // route:errorClass (4xx_user,5xx_server)
    rateLimitRejections: Record<string, number>; // route or scope -> count
    teamRateLimitAllows?: Record<string, number>; // route or scope -> successful allowed increments (team scoped)
    compactDocs?: { count: number; totalBytes: number; avgBytes: number | null }; // optional size tracking
    inviteMaintenance?: { markedExpired: number; deletedAccepted: number; deletedExpired: number; orphanIndexes: number };
}

const provenanceCounters = {
    total: 0,
    withProvenance: 0,
};

const latency: Record<string, RouteLatencyStats & { buckets: Record<string, number> }> = {};
const bucketBounds = [500, 1000, 2000, 5000, 10000, 20000]; // ms
const fallbackReasons: Record<string, number> = {};
const errorTaxonomy: Record<string, number> = {};
const rateLimitRejections: Record<string, number> = {};
const teamRateLimitAllows: Record<string, number> = {};
const compactDocSize = { count: 0, totalBytes: 0 };
const inviteMaintenanceCounters = { markedExpired: 0, deletedAccepted: 0, deletedExpired: 0, orphanIndexes: 0 };

export function recordProvenanceObservation(hasProvenance: boolean) {
    provenanceCounters.total += 1;
    if (hasProvenance) provenanceCounters.withProvenance += 1;
}

export function recordRouteLatency(routeKey: string, ms: number) {
    if (!latency[routeKey]) latency[routeKey] = { count: 0, totalMs: 0, maxMs: 0, buckets: {} };
    const stat = latency[routeKey];
    stat.count += 1;
    stat.totalMs += ms;
    if (ms > stat.maxMs) stat.maxMs = ms;
    const bound = bucketBounds.find(b => ms <= b) || 'inf';
    const key = String(bound);
    stat.buckets[key] = (stat.buckets[key] || 0) + 1;
}

export function recordFallback(reason: string) {
    fallbackReasons[reason] = (fallbackReasons[reason] || 0) + 1;
}

export function recordError(routeKey: string, errorClass: '4xx_user' | '5xx_server') {
    const k = `${routeKey}:${errorClass}`;
    errorTaxonomy[k] = (errorTaxonomy[k] || 0) + 1;
}

export function recordRateLimitRejection(scopeOrRoute: string) {
    rateLimitRejections[scopeOrRoute] = (rateLimitRejections[scopeOrRoute] || 0) + 1;
}

export function recordTeamRateLimitAllowed(scopeOrRoute: string) {
    teamRateLimitAllows[scopeOrRoute] = (teamRateLimitAllows[scopeOrRoute] || 0) + 1;
}

export function recordCompactDocSize(bytes: number) {
    if (bytes > 0) { compactDocSize.count += 1; compactDocSize.totalBytes += bytes; }
}

function computePercentileForRoute(stats: RouteLatencyStats & { buckets: Record<string, number> }, percentile: number): number | null {
    const total = stats.count;
    if (!total) return null;
    const entries = Object.entries(stats.buckets)
        .filter(([k]) => k !== 'inf')
        .map(([k, v]) => [Number(k), v] as [number, number])
        .sort((a, b) => a[0] - b[0]);
    let cumulative = 0;
    const target = total * percentile;
    for (const [bound, count] of entries) {
        cumulative += count;
        if (cumulative >= target) return bound;
    }
    return stats.maxMs || null;
}

export function getUnifiedMetricsSnapshot(): UnifiedMetricsSnapshot {
    const { total, withProvenance } = provenanceCounters;
    const missing = total - withProvenance;
    const coveragePct = total === 0 ? 100 : +(withProvenance / total * 100).toFixed(2);
    return {
        aiResponses: { total, withProvenance, missingProvenance: missing, coveragePct },
        latency: Object.fromEntries(Object.entries(latency).map(([k, v]) => [k, { ...v, buckets: { ...v.buckets }, p90: computePercentileForRoute(v, 0.90), p95: computePercentileForRoute(v, 0.95), p99: computePercentileForRoute(v, 0.99) }])),
        fallbackReasons: { ...fallbackReasons },
        errorTaxonomy: { ...errorTaxonomy },
        rateLimitRejections: { ...rateLimitRejections }
        , teamRateLimitAllows: { ...teamRateLimitAllows }
        , compactDocs: { count: compactDocSize.count, totalBytes: compactDocSize.totalBytes, avgBytes: compactDocSize.count ? Math.round(compactDocSize.totalBytes / compactDocSize.count) : null }
        , inviteMaintenance: { ...inviteMaintenanceCounters }
    };
}

// Convenience accessor for single route p95 (returns null if route missing or insufficient data)
export function getRouteP95(routeKey: string): number | null {
    const stats = latency[routeKey];
    if (!stats) return null;
    return computePercentileForRoute(stats, 0.95);
}

export function getRouteP99(routeKey: string): number | null {
    const stats = latency[routeKey];
    if (!stats) return null;
    return computePercentileForRoute(stats, 0.99);
}

// Invite maintenance recording functions
export function recordInviteMaintenance(delta: Partial<typeof inviteMaintenanceCounters>) {
    for (const k of Object.keys(delta) as (keyof typeof inviteMaintenanceCounters)[]) {
        inviteMaintenanceCounters[k] += delta[k] || 0;
    }
}
