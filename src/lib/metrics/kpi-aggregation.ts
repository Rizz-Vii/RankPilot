// KPI Aggregation Layer (OBS-01 / KPI)
// Derives higher-level KPIs from unified + neuroseo metrics snapshots.

import { getUnifiedMetricsSnapshot } from './unified-metrics';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';

export interface KpiSnapshot {
    provenanceCoveragePct: number;
    cacheHitRatio: number | null; // cacheHits / (cacheHits + analysisRuns)
    fallbackRate: number | null; // total fallbacks / total AI responses
    p95LatencyOverall: number | null; // average of per-route p95s (non-null)
    p90LatencyOverall: number | null;
    p99LatencyOverall: number | null;
    rateLimitRejectionRate: number | null; // total rejections / total AI responses
    teamRateLimitUtilizationPct: number | null; // (allows)/(allows + rejections) * 100 (team scoped)
    avgCompactDocBytes: number | null; // avg persisted compact doc size
    timestamp: string;
    routesP95: Record<string, number | null>;
}

export function getKpiSnapshot(): KpiSnapshot {
    const unified = getUnifiedMetricsSnapshot();
    const neuro = getNeuroseoMetricsSnapshot();

    const cacheDenom = neuro.analysisRuns + neuro.analysisCacheHits;
    const cacheHitRatio = cacheDenom ? +(neuro.analysisCacheHits / cacheDenom * 100).toFixed(2) : null;

    const fallbackTotal = Object.values(unified.fallbackReasons).reduce((a, b) => a + b, 0);
    const fallbackRate = unified.aiResponses.total ? +(fallbackTotal / unified.aiResponses.total * 100).toFixed(2) : null;

    const p90Values = Object.values(unified.latency).map(v => v.p90).filter(v => v != null) as number[];
    const p95Values = Object.values(unified.latency).map(v => v.p95).filter(v => v != null) as number[];
    const p99Values = Object.values(unified.latency).map(v => v.p99).filter(v => v != null) as number[];
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const p90LatencyOverall = avg(p90Values);
    const p95LatencyOverall = avg(p95Values);
    const p99LatencyOverall = avg(p99Values);

    const rejectionTotal = Object.values(unified.rateLimitRejections).reduce((a, b) => a + b, 0);
    const rateLimitRejectionRate = unified.aiResponses.total ? +(rejectionTotal / unified.aiResponses.total * 100).toFixed(2) : null;

    // Team limiter utilization: consider only team-scoped counters if present (keys starting with 'team:')
    let teamAllows = 0; let teamRejects = 0;
    if ((unified as any).teamRateLimitAllows) {
        Object.entries((unified as any).teamRateLimitAllows as Record<string, number>).forEach(([k, v]) => { if (k.startsWith('team:')) teamAllows += v; });
    }
    Object.entries(unified.rateLimitRejections).forEach(([k, v]) => { if (k.startsWith('team:')) teamRejects += v; });
    const teamRateLimitUtilizationPct = (teamAllows + teamRejects) > 0 ? +(teamAllows / (teamAllows + teamRejects) * 100).toFixed(2) : null;

    const avgCompactDocBytes = unified.compactDocs?.avgBytes ?? null;

    const routesP95: Record<string, number | null> = {};
    Object.entries(unified.latency).forEach(([route, stats]) => { routesP95[route] = stats.p95; });

    return {
        provenanceCoveragePct: unified.aiResponses.coveragePct,
        cacheHitRatio,
        fallbackRate,
        p90LatencyOverall,
        p95LatencyOverall,
        p99LatencyOverall,
        rateLimitRejectionRate,
        teamRateLimitUtilizationPct,
        avgCompactDocBytes,
        timestamp: new Date().toISOString(),
        routesP95
    };
}
