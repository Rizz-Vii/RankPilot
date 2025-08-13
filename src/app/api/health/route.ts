// API Health Check
import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedMetricsSnapshot } from '@/lib/metrics/unified-metrics';
import { getKpiSnapshot } from '@/lib/metrics/kpi-aggregation';
import { getNeuroseoMetricsSnapshot } from '@/lib/neuroseo/metrics-registry';
import { adminDb } from '@/lib/firebase-admin';
import { hasProvenance } from '@/lib/middleware/provenance';
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
    metrics: {
      neuro,
      unified
    }
  }, { status: status === 'ok' ? 200 : 503 });
}