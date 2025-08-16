// API Health Check
import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { getAIUsage24h, getSubtoolUsage24h } from '@/lib/metrics/ai-usage';
import { getKpiSnapshot } from '@/lib/metrics/kpi-aggregation';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { adminDb } from '@/lib/firebase-admin';
import { hasProvenance } from '@/lib/middleware/provenance';
import { ensureDailyUnifiedMetricsExport } from '@/lib/metrics/unified-metrics-export';
import { getTeamQuotaStats } from '@/lib/team-quota';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const ts = Date.now();
  const url = new URL(request.url);
  const teamId = url.searchParams.get('teamId');
  
  // Firestore connectivity (lightweight): get a non-existent doc (no cost write)
  let firestoreOk = false;
  try { await adminDb.collection('_health').doc('ping').get(); firestoreOk = true; } catch { firestoreOk = false; }
  const unified = getUnifiedMetricsSnapshot();
  const neuro = getNeuroseoMetricsSnapshot();
  const provenanceCoverage = unified.aiResponses.coveragePct;
  const status = (firestoreOk && provenanceCoverage === 100) ? 'ok' : 'degraded';
  // Derive quick p95 map for convenience (already present inside unified.latency entries but flattened here)
  const p95: Record<string, number | null> = {};
  Object.entries(unified.latency).forEach(([route, stats]) => { p95[route] = stats.p95; });
  const kpis = getKpiSnapshot();
  await ensureDailyUnifiedMetricsExport();
  // Derive crawler metrics (exposed explicitly for observability)
  const crawlerRaw = (unified as any).crawler || { success: 0, errors: 0, totalCrawlMs: 0, totalAnalysisMs: 0 };
  const crawlerRuns = crawlerRaw.success + crawlerRaw.errors;
  const crawlerMetrics = {
    ...crawlerRaw,
    runs: crawlerRuns,
    successRatePct: crawlerRuns ? +((crawlerRaw.success / crawlerRuns) * 100).toFixed(2) : null,
    errorRatePct: crawlerRuns ? +((crawlerRaw.errors / crawlerRuns) * 100).toFixed(2) : null,
    avgCrawlMs: crawlerRuns ? Math.round(crawlerRaw.totalCrawlMs / crawlerRuns) : null,
    avgAnalysisMs: crawlerRaw.success ? Math.round(crawlerRaw.totalAnalysisMs / crawlerRaw.success) : null,
    crawlP95: crawlerRaw.crawlP95 ?? null,
    analysisP95: crawlerRaw.analysisP95 ?? null,
    crawlP99: (crawlerRaw as any).crawlP99 ?? null,
    analysisP99: (crawlerRaw as any).analysisP99 ?? null
  };
  // Aggregate team quota usage for today (lightweight; limit query to 200 docs)
  let teamQuota: { totalTeams: number; totalUsed: number; totalLimit: number; totalRejections: number } | null = null;
  try {
    const today = new Date(ts).toISOString().slice(0, 10);
    const snap = await adminDb.collection('teamCrawlerUsage').where('date', '==', today).limit(200).get();
    let totalTeams = 0, totalUsed = 0, totalLimit = 0, totalRejections = 0;
    snap.docs.forEach(d => { const data: any = d.data(); totalTeams++; totalUsed += data.count || 0; totalLimit += data.limit || 0; totalRejections += data.rejections || 0; });
    teamQuota = { totalTeams, totalUsed, totalLimit, totalRejections };
  } catch { }
  try {
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    const dailySnap = await adminDb.collection('aiUsageDaily').where('date', '==', dateKey).get();
    let dIn = 0, dOut = 0, dCost = 0; dailySnap.docs.forEach(d => { const data: any = d.data(); dIn += data.tokensIn || 0; dOut += data.tokensOut || 0; dCost += data.costEstimate || 0; });
    ; (kpis as any).aiDailyTokensIn = dIn; (kpis as any).aiDailyTokensOut = dOut; (kpis as any).aiDailyCostEstimate = +dCost.toFixed(4);
  } catch { }
  // Basic alert derivation (OPS-01): threshold checks mapped to warning/critical levels
  const alerts: Array<{ type: string; level: 'warn' | 'critical'; message: string; value: number | null; threshold: number }> = [];
  const push = (cond: boolean, level: 'warn' | 'critical', type: string, value: number | null, threshold: number, message: string) => { if (cond) alerts.push({ type, level, message, value, threshold }); };
  // Thresholds (keep in sync with KPI Baseline Targets in docs)
  push(kpis.provenanceCoveragePct < 100, 'critical', 'provenanceCoverage', kpis.provenanceCoveragePct, 100, 'Provenance coverage below 100%');
  if (kpis.fallbackRate != null) push(kpis.fallbackRate > 18, 'warn', 'fallbackRate', kpis.fallbackRate, 18, 'Fallback rate above target');
  if (kpis.rateLimitRejectionRate != null) push(kpis.rateLimitRejectionRate > 3, 'warn', 'rateLimitRejectionRate', kpis.rateLimitRejectionRate, 3, 'Rate limit rejection rate above target');
  if (kpis.cacheHitRatio != null) push(kpis.cacheHitRatio < 45, 'warn', 'cacheHitRatio', kpis.cacheHitRatio, 45, 'Cache hit ratio below target');
  if (kpis.avgCompactDocBytes != null) push(kpis.avgCompactDocBytes > 4500, 'warn', 'avgCompactDocBytes', kpis.avgCompactDocBytes, 4500, 'Avg compact doc size nearing 5KB cap');
  // Invite maintenance derived alerts (OPS-TEAM-01)
  const im = unified.inviteMaintenance;
  if (im) {
    push(im.orphanIndexes > 0, 'warn', 'inviteOrphanIndexes', im.orphanIndexes, 0, 'Orphan invite index docs detected');
    push(im.markedExpired > 50, 'warn', 'inviteExpirationsSpike', im.markedExpired, 50, 'High number of invites expired in interval');
  }
  // Crawler alerts (baseline thresholds: warn >5% error, critical >15%)
  if (crawlerMetrics.errorRatePct != null) {
    push(crawlerMetrics.errorRatePct > 15, 'critical', 'crawlerErrorRate', crawlerMetrics.errorRatePct, 15, 'Crawler error rate critical');
    push(crawlerMetrics.errorRatePct > 5 && crawlerMetrics.errorRatePct <= 15, 'warn', 'crawlerErrorRate', crawlerMetrics.errorRatePct, 5, 'Crawler error rate elevated');
  }
  // Crawler aggregate adoption alerts (T14 rollout) – encourage migration to aggregate-first reads
  const adoption = (kpis as any).crawlerAggregateAdoptionPct as number | undefined;
  if (adoption != null) {
    // Critical if below 50%, warn if between 50-80% (denominator ensures at least some samples were recorded)
    push(adoption < 50, 'critical', 'crawlerAggregateAdoption', adoption, 50, 'Crawler aggregate adoption below 50%');
    if (adoption >= 50) push(adoption < 80, 'warn', 'crawlerAggregateAdoption', adoption, 80, 'Crawler aggregate adoption below 80%');
  }
  // Semantic Map aggregate adoption alerts (T14)
  const smAdoption = (kpis as any).semanticMapAggregateAdoptionPct as number | undefined;
  if (smAdoption != null) {
    push(smAdoption < 50, 'critical', 'semanticMapAggregateAdoption', smAdoption, 50, 'Semantic map aggregate adoption below 50%');
    if (smAdoption >= 50) push(smAdoption < 80, 'warn', 'semanticMapAggregateAdoption', smAdoption, 80, 'Semantic map aggregate adoption below 80%');
  }
  const aiUsage = getAIUsage24h();
  // Per-model cost breakdown (optional fields if tracking present in aiUsage map)
  let perModelCosts: Record<string, { tokensIn: number; tokensOut: number; cost: number }> | null = null;
  const anyUsage: any = aiUsage as any;
  if (anyUsage && typeof anyUsage === 'object' && anyUsage.providers && typeof anyUsage.providers === 'object') {
    perModelCosts = {};
    Object.entries<any>(anyUsage.providers).forEach(([prov, val]) => {
      perModelCosts![prov] = { tokensIn: val.tokensIn || 0, tokensOut: val.tokensOut || 0, cost: +((val.costEstimate || 0)).toFixed(4) };
    });
  }
  // Route latency p95 alerts (warn >600ms, critical >1200ms) limited to top offenders
  const routeLatencyEntries = Object.entries(p95).filter(([, v]) => typeof v === 'number' && v != null) as Array<[string, number]>;
  routeLatencyEntries.forEach(([routeKey, val]) => {
    if (val > 1200) {
      alerts.push({ type: `routeLatency:${routeKey}`, level: 'critical', message: `Route ${routeKey} p95 ${val}ms >1200ms`, value: val, threshold: 1200 });
    } else if (val > 600) {
      alerts.push({ type: `routeLatency:${routeKey}`, level: 'warn', message: `Route ${routeKey} p95 ${val}ms >600ms`, value: val, threshold: 600 });
    }
  });
  const subtoolUsage = getSubtoolUsage24h();
  
  // Team-specific quota headroom (if teamId provided)
  let teamQuotaHeadroom: any = null;
  if (teamId) {
    try {
      const teamStats = await getTeamQuotaStats(teamId);
      if (teamStats) {
        teamQuotaHeadroom = {
          teamId: teamStats.teamId,
          date: teamStats.date,
          headroom: teamStats.headroom,
          quotaUsage: Object.entries(teamStats.quotas).reduce((acc, [type, quota]) => {
            acc[type] = {
              used: quota.used,
              limit: quota.limit,
              remaining: quota.limit - quota.used,
              percentUsed: quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0
            };
            return acc;
          }, {} as any),
          totalRejections: teamStats.totalRejections
        };
      }
    } catch (error) {
      console.error('Error fetching team quota headroom:', error);
    }
  }
  
  return NextResponse.json({
    status,
    timestamp: new Date(ts).toISOString(),
    build: process.env.BUILD_SHA || 'dev',
    env: process.env.NODE_ENV,
    firestoreOk,
    provenanceCoverage,
    p95,
    kpis,
    alerts,
    aiUsage24h: aiUsage,
    aiUsagePerModel: perModelCosts || undefined,
    subtoolUsage24h: subtoolUsage,
    crawler: crawlerMetrics,
    teamCrawlerQuota: teamQuota,
    teamQuotaHeadroom,
    metrics: {
      neuro,
      unified
    }
  }, { status: status === 'ok' ? 200 : 503 });
}