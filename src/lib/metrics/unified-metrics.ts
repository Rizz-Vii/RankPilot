// Unified Metrics Module (OBS-01)
// Provides provenance coverage counters and simple latency aggregation per route.
// (Lint: no unused disable directives; dynamic import pattern replaces prior require usage)

export interface RouteLatencyStats {
    count: number;
    totalMs: number;
    maxMs: number;
}

import type { QueueMetricsSnapshot } from './queue-metrics';
// Dynamic loader (avoids banned require pattern) with fallback snapshot
let getQueueMetricsSnapshot: () => QueueMetricsSnapshot = () => ({ enqueued: 0, started: 0, completed: 0, failed: 0, running: 0, depth: 0, successRatio: 1 });
// Attempt dynamic import lazily (non-blocking); ignore failure
void (async () => {
    try {
        type QueueModule = { getQueueMetricsSnapshot?: () => QueueMetricsSnapshot };
        const imported: unknown = await import('./queue-metrics');
        const mod: QueueModule = (imported && typeof imported === 'object') ? imported as QueueModule : {};
        if (typeof mod.getQueueMetricsSnapshot === 'function') {
            getQueueMetricsSnapshot = mod.getQueueMetricsSnapshot;
        }
    } catch { /* fallback retained */ }
})();

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
    crawler?: { success: number; errors: number; totalCrawlMs: number; totalAnalysisMs: number; crawlP95?: number | null; analysisP95?: number | null; crawlP99?: number | null; analysisP99?: number | null };
    semanticMap?: { aggregateHits: number; legacyFallbacks: number };
    governance?: { provenanceInjected: number; forbiddenFieldStrips: number }; // Phase 1 governance counters
    queue?: QueueMetricsSnapshot; // DEV-QUEUE-01
    // Phase 3 optional counters (additive; BI may consume later)
    phase3?: {
        developerFeedbackRecordsTotal: number;
        predictiveForecastsGeneratedTotal: number;
        reportSummariesGeneratedTotal: number;
        eventRetriesTotal: number;
        eventRetrySuccessTotal: number;
        eventDeadLettersTotal: number;
    };
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
const crawlerCounters = { success: 0, errors: 0, totalCrawlMs: 0, totalAnalysisMs: 0, aggregateHits: 0, legacyFallbacks: 0, quotaLimit: 0, quotaRemaining: 0, crawlSamples: [] as number[], analysisSamples: [] as number[] };
// Semantic Map aggregate adoption counters (T14 extension)
const semanticMapCounters = { aggregateHits: 0, legacyFallbacks: 0 };
// Governance counters (Phase 1 – PROV-01 / MKT-01)
const governanceCounters = { provenanceInjected: 0, forbiddenFieldStrips: 0 };
// Provenance reason code counts (Phase 3 extension) — metrics-only, not part of public snapshot shape
const provenanceReasonCounts: Record<string, number> = {};
// Phase 3 counters (advisory modules)
const phase3Counters = {
    developerFeedbackRecordsTotal: 0,
    predictiveForecastsGeneratedTotal: 0,
    reportSummariesGeneratedTotal: 0,
    eventRetriesTotal: 0,
    eventRetrySuccessTotal: 0,
    eventDeadLettersTotal: 0,
};
// Queue metrics dynamic import handled above (no circular deps; queue-metrics has no imports of unified)

export function recordProvenanceObservation(hasProvenance: boolean) {
    provenanceCounters.total += 1;
    if (hasProvenance) provenanceCounters.withProvenance += 1;
}

export function recordProvenanceInjection() {
    governanceCounters.provenanceInjected += 1;
}

export function recordForbiddenFieldStrip(count = 1) {
    governanceCounters.forbiddenFieldStrips += count;
}

export function recordProvenanceReason(code: string | undefined) {
    if (!code) return;
    const k = String(code).slice(0, 40);
    provenanceReasonCounts[k] = (provenanceReasonCounts[k] || 0) + 1;
}

export function getProvenanceReasonCounts(): Record<string, number> {
    return { ...provenanceReasonCounts };
}

// Phase 3 increments (small helpers)
export function recordDeveloperFeedbackRecord(delta = 1) {
    phase3Counters.developerFeedbackRecordsTotal += Math.max(0, delta);
}
export function recordPredictiveForecastGenerated(delta = 1) {
    phase3Counters.predictiveForecastsGeneratedTotal += Math.max(0, delta);
}
export function recordReportSummariesGenerated(delta = 1) {
    phase3Counters.reportSummariesGeneratedTotal += Math.max(0, delta);
}
export function recordEventRetry(delta = 1) {
    phase3Counters.eventRetriesTotal += Math.max(0, delta);
}
export function recordEventRetrySuccess(delta = 1) {
    phase3Counters.eventRetrySuccessTotal += Math.max(0, delta);
}
export function recordEventDeadLetter(delta = 1) {
    phase3Counters.eventDeadLettersTotal += Math.max(0, delta);
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
        , crawler: { ...crawlerCounters, crawlP95: computeSimpleP95(crawlerCounters.crawlSamples), analysisP95: computeSimpleP95(crawlerCounters.analysisSamples), crawlP99: computeSimpleP99(crawlerCounters.crawlSamples), analysisP99: computeSimpleP99(crawlerCounters.analysisSamples) }
        , semanticMap: { ...semanticMapCounters }
        , governance: { ...governanceCounters }
        , queue: getQueueMetricsSnapshot()
        , phase3: { ...phase3Counters }
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

// Crawler metrics recording
export function recordCrawlerSuccess(crawlMs: number, analysisMs: number) {
    crawlerCounters.success += 1;
    crawlerCounters.totalCrawlMs += crawlMs;
    crawlerCounters.totalAnalysisMs += analysisMs;
    crawlerCounters.crawlSamples.push(crawlMs);
    crawlerCounters.analysisSamples.push(analysisMs);
    if (crawlerCounters.crawlSamples.length > 500) crawlerCounters.crawlSamples.splice(0, crawlerCounters.crawlSamples.length - 500);
    if (crawlerCounters.analysisSamples.length > 500) crawlerCounters.analysisSamples.splice(0, crawlerCounters.analysisSamples.length - 500);
}
export function recordCrawlerError(crawlMs: number) {
    crawlerCounters.errors += 1;
    crawlerCounters.totalCrawlMs += crawlMs;
    crawlerCounters.crawlSamples.push(crawlMs);
    if (crawlerCounters.crawlSamples.length > 500) crawlerCounters.crawlSamples.splice(0, crawlerCounters.crawlSamples.length - 500);
}

// Neural crawler aggregate read path metrics (T14)
export function recordCrawlerAggregateHit() {
    crawlerCounters.aggregateHits += 1;
}
export function recordCrawlerLegacyFallback() {
    crawlerCounters.legacyFallbacks += 1;
}

// Semantic Map aggregate read path metrics (T14)
export function recordSemanticMapAggregateHit() {
    semanticMapCounters.aggregateHits += 1;
}
export function recordSemanticMapLegacyFallback() {
    semanticMapCounters.legacyFallbacks += 1;
}

// Firecrawl quota observation (T12 extended)
export function recordCrawlerQuota(limit: number, remaining: number) {
    crawlerCounters.quotaLimit = limit;
    crawlerCounters.quotaRemaining = remaining;
}

function computeSimpleP95(samples: number[]): number | null {
    if (!samples.length) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[idx];
}

function computeSimpleP99(samples: number[]): number | null {
    if (!samples.length) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    return sorted[idx];
}

// Test-only helper (DEV-GOV-COUNTERS): Reset unified metrics state to support isolated unit tests.
// Not intended for production code paths; safe because all counters are in-memory only.
export function __resetUnifiedMetricsTestOnly() {
    provenanceCounters.total = 0; provenanceCounters.withProvenance = 0;
    for (const k of Object.keys(latency)) delete latency[k];
    for (const k of Object.keys(fallbackReasons)) delete fallbackReasons[k];
    for (const k of Object.keys(errorTaxonomy)) delete errorTaxonomy[k];
    for (const k of Object.keys(rateLimitRejections)) delete rateLimitRejections[k];
    for (const k of Object.keys(teamRateLimitAllows)) delete teamRateLimitAllows[k];
    compactDocSize.count = 0; compactDocSize.totalBytes = 0;
    inviteMaintenanceCounters.markedExpired = 0; inviteMaintenanceCounters.deletedAccepted = 0; inviteMaintenanceCounters.deletedExpired = 0; inviteMaintenanceCounters.orphanIndexes = 0;
    crawlerCounters.success = 0; crawlerCounters.errors = 0; crawlerCounters.totalCrawlMs = 0; crawlerCounters.totalAnalysisMs = 0; crawlerCounters.aggregateHits = 0; crawlerCounters.legacyFallbacks = 0; crawlerCounters.quotaLimit = 0; crawlerCounters.quotaRemaining = 0; crawlerCounters.crawlSamples.length = 0; crawlerCounters.analysisSamples.length = 0;
    semanticMapCounters.aggregateHits = 0; semanticMapCounters.legacyFallbacks = 0;
    governanceCounters.provenanceInjected = 0; governanceCounters.forbiddenFieldStrips = 0;
    for (const k of Object.keys(provenanceReasonCounts)) delete provenanceReasonCounts[k];
    phase3Counters.developerFeedbackRecordsTotal = 0; phase3Counters.predictiveForecastsGeneratedTotal = 0; phase3Counters.reportSummariesGeneratedTotal = 0; phase3Counters.eventRetriesTotal = 0; phase3Counters.eventRetrySuccessTotal = 0; phase3Counters.eventDeadLettersTotal = 0;
}
