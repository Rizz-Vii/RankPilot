// API Health Check
import { adminDb } from '@/lib/firebase-admin';
import { getAIUsage24h, getSubtoolUsage24h } from '@/lib/metrics/ai-usage';
import { getKpiSnapshot } from '@/lib/metrics/kpi-aggregation';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { ensureDailyUnifiedMetricsExport } from '@/lib/metrics/unified-metrics-export';
import { enforceProvenance } from '@/lib/middleware/provenance';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const ts = Date.now();
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
  interface CrawlerRaw { success: number; errors: number; totalCrawlMs: number; totalAnalysisMs: number; crawlP95?: number; analysisP95?: number; crawlP99?: number; analysisP99?: number }
  type UnifiedWithCrawler = typeof unified & { crawler?: CrawlerRaw };
  const unifiedWithCrawler = unified as UnifiedWithCrawler;
  const crawlerRaw: CrawlerRaw = typeof unifiedWithCrawler.crawler === 'object' && unifiedWithCrawler.crawler
    ? unifiedWithCrawler.crawler
    : { success: 0, errors: 0, totalCrawlMs: 0, totalAnalysisMs: 0 };
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
    crawlP99: crawlerRaw.crawlP99 ?? null,
    analysisP99: crawlerRaw.analysisP99 ?? null
  };
  // Queue metrics (DEV-QUEUE-01): flatten key health indicators for dashboards without needing full unified payload traversal
  const queueRaw = unified.queue;
  const queueMetrics = queueRaw ? {
    enqueued: queueRaw.enqueued,
    started: queueRaw.started,
    completed: queueRaw.completed,
    failed: queueRaw.failed,
    running: queueRaw.running,
    depth: queueRaw.depth,
    successRatio: queueRaw.successRatio
  } : undefined;
  // Aggregate team quota usage for today (lightweight; limit query to 200 docs)
  let teamQuota: { totalTeams: number; totalUsed: number; totalLimit: number; totalRejections: number } | null = null;
  try {
    const today = new Date(ts).toISOString().slice(0, 10);
    const snap = await adminDb.collection('teamCrawlerUsage').where('date', '==', today).limit(200).get();
    interface TeamCrawlerDoc { count?: number; limit?: number; rejections?: number }
    let totalTeams = 0, totalUsed = 0, totalLimit = 0, totalRejections = 0;
    snap.docs.forEach(d => {
      const data = d.data() as TeamCrawlerDoc;
      totalTeams++;
      totalUsed += data.count || 0;
      totalLimit += data.limit || 0;
      totalRejections += data.rejections || 0;
    });
    teamQuota = { totalTeams, totalUsed, totalLimit, totalRejections };
  } catch { }
  try {
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    const dailySnap = await adminDb.collection('aiUsageDaily').where('date', '==', dateKey).get();
    interface AIDailyDoc { tokensIn?: number; tokensOut?: number; costEstimate?: number }
    let dIn = 0, dOut = 0, dCost = 0;
    dailySnap.docs.forEach(d => {
      const data = d.data() as AIDailyDoc;
      dIn += data.tokensIn || 0;
      dOut += data.tokensOut || 0;
      dCost += data.costEstimate || 0;
    });
    type MutableKpis = typeof kpis & {
      aiDailyTokensIn?: number;
      aiDailyTokensOut?: number;
      aiDailyCostEstimate?: number;
      crawlerAggregateAdoptionPct?: number;
      semanticMapAggregateAdoptionPct?: number;
    };
    const mutableKpis = kpis as MutableKpis;
    mutableKpis.aiDailyTokensIn = dIn;
    mutableKpis.aiDailyTokensOut = dOut;
    mutableKpis.aiDailyCostEstimate = +dCost.toFixed(4);
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
  const adoption = (kpis as { crawlerAggregateAdoptionPct?: number }).crawlerAggregateAdoptionPct;
  if (adoption != null) {
    // Critical if below 50%, warn if between 50-80% (denominator ensures at least some samples were recorded)
    push(adoption < 50, 'critical', 'crawlerAggregateAdoption', adoption, 50, 'Crawler aggregate adoption below 50%');
    if (adoption >= 50) push(adoption < 80, 'warn', 'crawlerAggregateAdoption', adoption, 80, 'Crawler aggregate adoption below 80%');
  }
  // Semantic Map aggregate adoption alerts (T14)
  const smAdoption = (kpis as { semanticMapAggregateAdoptionPct?: number }).semanticMapAggregateAdoptionPct;
  if (smAdoption != null) {
    push(smAdoption < 50, 'critical', 'semanticMapAggregateAdoption', smAdoption, 50, 'Semantic map aggregate adoption below 50%');
    if (smAdoption >= 50) push(smAdoption < 80, 'warn', 'semanticMapAggregateAdoption', smAdoption, 80, 'Semantic map aggregate adoption below 80%');
  }
  const aiUsage = getAIUsage24h();
  // Per-model cost breakdown (optional fields if tracking present in aiUsage map)
  let perModelCosts: Record<string, { tokensIn: number; tokensOut: number; cost: number }> | null = null;
  interface ProviderUsage { tokensIn?: number; tokensOut?: number; costEstimate?: number }
  const providers = (aiUsage as { providers?: Record<string, ProviderUsage> }).providers;
  if (providers) {
    perModelCosts = {};
    Object.entries(providers as Record<string, ProviderUsage>).forEach(([prov, val]) => {
      perModelCosts![prov] = {
        tokensIn: val.tokensIn || 0,
        tokensOut: val.tokensOut || 0,
        cost: +((val.costEstimate || 0)).toFixed(4)
      };
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
  // Enforce provenance tagging for audit coverage (canonical pattern)
  const body = enforceProvenance({
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
    queue: queueMetrics,
    metrics: {
      neuro,
      unified
    }
  }, { path: 'health' });
  return NextResponse.json(body, { status: status === 'ok' ? 200 : 503 });
}
