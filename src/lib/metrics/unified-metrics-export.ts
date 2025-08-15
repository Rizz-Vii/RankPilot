// Unified Metrics Daily Export (T16 extension)
// Persists a compact daily snapshot of provenance coverage & latency percentiles
// so the Cloud Function KPI daily snapshot can enrich fields without access to
// in-process unified metrics.
import { adminDb } from '@/lib/firebase-admin';
import { getKpiSnapshot } from './kpi-aggregation';

let lastWrittenDate: string | null = null;

export async function ensureDailyUnifiedMetricsExport(): Promise<void> {
    try {
        const dateKey = new Date().toISOString().slice(0, 10);
        if (lastWrittenDate === dateKey) return; // already written this runtime
        const kpis = getKpiSnapshot();
        // Merge external runtime crawler counters (written by Cloud Function environment) if present
        let externalCrawler: any = null;
        try {
            const cDoc = await adminDb.collection('runtimeMetrics').doc('crawler').get();
            if (cDoc.exists) externalCrawler = cDoc.data();
        } catch (e) { console.warn('crawlerMetrics.load_failed', (e as any)?.message); }
        const ref = adminDb.collection('unifiedMetricsDaily').doc(dateKey);
        await adminDb.runTransaction(async tx => {
            const snap = await tx.get(ref);
            const base: any = {
                date: dateKey,
                provenanceCoveragePct: kpis.provenanceCoveragePct,
                p90LatencyOverall: kpis.p90LatencyOverall,
                p95LatencyOverall: kpis.p95LatencyOverall,
                p99LatencyOverall: kpis.p99LatencyOverall,
                routesP95: kpis.routesP95,
                crawler: externalCrawler ? {
                    success: externalCrawler.success || 0,
                    errors: externalCrawler.errors || 0,
                    totalCrawlMs: externalCrawler.totalCrawlMs || 0,
                    totalAnalysisMs: externalCrawler.totalAnalysisMs || 0
                } : (kpis.crawler ? { ...kpis.crawler } : undefined),
                updatedAt: new Date(),
                _schema: 1
            };
            if (!snap.exists) tx.set(ref, { ...base, createdAt: new Date() }); else tx.update(ref, base);
        });
        lastWrittenDate = dateKey;
    } catch (e) {
        console.warn('unifiedMetricsDaily.export_failed', (e as any)?.message);
    }
}
