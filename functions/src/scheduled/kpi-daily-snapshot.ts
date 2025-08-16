import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Daily KPI Snapshot Function (T16)
 * Purpose: Persist a compact daily KPI aggregate document (collection: kpiDaily)
 * focusing on AI usage & cost plus placeholders for future KPI expansion.
 * Retention: purge snapshots older than 90 days.
 * NOTE: We intentionally limit scope to readily available server-side data (aiUsageDaily)
 * since full KPI derivation utilities live in the Next.js app bundle and are not shared here.
 */

const RETENTION_DAYS = 90;

export interface KpiDailyDoc {
    date: string;              // YYYY-MM-DD
    aiTokensIn: number;        // summed across providers
    aiTokensOut: number;       // summed across providers
    aiCostEstimate: number;    // USD approximate
    revenueMrr?: number;       // Sum paid invoice amounts for current month
    revenueOutstanding?: number; // Count unpaid invoices current month
    revenueOnTimePct?: number;   // On-time % for paid invoices current month
    // Newly added Phase 2 (T16 extension): provenance coverage + latency percentiles (placeholders until export pipeline wired)
    provenanceCoveragePct?: number | null; // Placeholder: null (unavailable in isolated CF env) or numeric if future export populates
    p90LatencyOverall?: number | null;     // Average across routes (null until wired)
    p95LatencyOverall?: number | null;
    p99LatencyOverall?: number | null;
    // Adoption & rate limit utilization (T14/T15 enrichment)
    crawlerAggregateAdoptionPct?: number | null;
    semanticMapAggregateAdoptionPct?: number | null;
    teamRateLimitUtilizationPct?: number | null;
    fallbackRatePct?: number | null; // AI fallback rate (% of responses)
    cacheHitRatio?: number | null; // Cache hit percentage (edge/runtime aggregate)
    rateLimitRejectionRate?: number | null; // % of requests rejected by limiters
    // Server-side precomputed MA7 overlays (additive; enables client to skip recompute)
    ma7Provenance?: number | null;
    ma7CrawlerAdoption?: number | null;
    ma7SemanticAdoption?: number | null;
    ma7FallbackRate?: number | null;
    ma7LatencyP95?: number | null;
    ma7CacheHitRatio?: number | null;
    ma7RateLimitRejectionRate?: number | null;
    // Exponential smoothing (alpha=0.3) for provenance & latency p95 (faster response to trend than MA7)
    smoothedProvenance?: number | null;
    smoothedLatencyP95?: number | null;
    smoothedCrawlerAdoption?: number | null;
    smoothedSemanticAdoption?: number | null;
    createdAt: any;            // Firestore Timestamp
    updatedAt: any;            // Firestore Timestamp
    _schema: 1;                // simple schema version for future migrations
}

export async function runKpiDailySnapshot(now: Date = new Date()) {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    // Aggregate today's AI usage (already persisted incrementally by ai-memory-manager)
    let aiTokensIn = 0, aiTokensOut = 0, aiCost = 0;
    try {
        const usageSnap = await db.collection('aiUsageDaily').where('date', '==', dateKey).get();
        usageSnap.docs.forEach(d => {
            const data: any = d.data();
            aiTokensIn += data.tokensIn || 0;
            aiTokensOut += data.tokensOut || 0;
            aiCost += data.costEstimate || 0;
        });
    } catch (e) {
        logger.warn('kpiDailySnapshot.aiUsageQueryFailed', (e as any)?.message);
    }
    aiCost = +aiCost.toFixed(4);

    // Revenue aggregation (best-effort; failures logged & omitted)
    let revenueMrr = 0, revenueOutstanding = 0, revenueOnTimePct: number | undefined;
    try {
        const periodKey = dateKey.slice(0, 7); // YYYY-MM
        const revSnap = await db.collection('financeInvoices').where('period', '==', periodKey).limit(5000).get();
        if (!revSnap.empty) {
            const paid: any[] = []; const all: any[] = [];
            revSnap.docs.forEach(d => { const data: any = d.data(); all.push(data); if (data.status === 'paid') paid.push(data); });
            revenueMrr = paid.reduce((s, i) => s + (i.amount || 0), 0);
            revenueOutstanding = all.filter(i => i.status !== 'paid').length;
            if (paid.length) {
                const onTime = paid.filter(i => { const paidAt = i.paidAt?.toDate?.(); const due = i.dueAt?.toDate?.(); return paidAt && due && paidAt.getTime() <= due.getTime(); });
                revenueOnTimePct = +(onTime.length / paid.length * 100).toFixed(1);
            } else revenueOnTimePct = 0;
        }
    } catch (e) {
        logger.warn('kpiDailySnapshot.revenueAggregationFailed', (e as any)?.message);
    }

    const ref = db.collection('kpiDaily').doc(dateKey);

    // Load unified metrics daily export if available (written by /api/health in app runtime)
    let provenanceCoveragePct: number | null = null;
    let p90LatencyOverall: number | null = null;
    let p95LatencyOverall: number | null = null;
    let p99LatencyOverall: number | null = null;
    let crawlerAggregateAdoptionPct: number | null = null;
    let semanticMapAggregateAdoptionPct: number | null = null;
    let teamRateLimitUtilizationPct: number | null = null;
    let fallbackRatePct: number | null = null;
    let cacheHitRatio: number | null = null;
    let rateLimitRejectionRate: number | null = null;
    try {
        const uDoc = await db.collection('unifiedMetricsDaily').doc(dateKey).get();
        if (uDoc.exists) {
            const u: any = uDoc.data();
            provenanceCoveragePct = typeof u.provenanceCoveragePct === 'number' ? u.provenanceCoveragePct : null;
            p90LatencyOverall = typeof u.p90LatencyOverall === 'number' ? u.p90LatencyOverall : null;
            p95LatencyOverall = typeof u.p95LatencyOverall === 'number' ? u.p95LatencyOverall : null;
            p99LatencyOverall = typeof u.p99LatencyOverall === 'number' ? u.p99LatencyOverall : null;
            crawlerAggregateAdoptionPct = typeof u.crawlerAggregateAdoptionPct === 'number' ? u.crawlerAggregateAdoptionPct : null;
            semanticMapAggregateAdoptionPct = typeof u.semanticMapAggregateAdoptionPct === 'number' ? u.semanticMapAggregateAdoptionPct : null;
            teamRateLimitUtilizationPct = typeof u.teamRateLimitUtilizationPct === 'number' ? u.teamRateLimitUtilizationPct : null;
            fallbackRatePct = typeof u.fallbackRate === 'number' ? u.fallbackRate : (typeof u.fallbackRatePct === 'number' ? u.fallbackRatePct : null);
            cacheHitRatio = typeof u.cacheHitRatio === 'number' ? u.cacheHitRatio : null;
            rateLimitRejectionRate = typeof u.rateLimitRejectionRate === 'number' ? u.rateLimitRejectionRate : null;
        }
    } catch (e) {
        logger.warn('kpiDailySnapshot.unifiedMetricsLoadFailed', (e as any)?.message);
    }
    // Normalize undefined numeric fields to 0/null to satisfy Firestore serializer
    if (revenueOnTimePct === undefined) revenueOnTimePct = 0;
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const base: Partial<KpiDailyDoc> = {
            date: dateKey,
            aiTokensIn,
            aiTokensOut,
            aiCostEstimate: aiCost,
            revenueMrr,
            revenueOutstanding,
            revenueOnTimePct,
            provenanceCoveragePct,
            p90LatencyOverall,
            p95LatencyOverall,
            p99LatencyOverall,
            crawlerAggregateAdoptionPct,
            semanticMapAggregateAdoptionPct,
            teamRateLimitUtilizationPct,
            fallbackRatePct,
            cacheHitRatio,
            rateLimitRejectionRate,
            updatedAt: FieldValue.serverTimestamp(),
            _schema: 1
        } as any;
        if (!snap.exists) {
            tx.set(ref, { ...base, createdAt: FieldValue.serverTimestamp() });
        } else {
            tx.update(ref, base);
        }
    });

    // Derive and persist alert snapshot (kpiAlertsDaily) using same threshold logic as /api/health (keep in sync)
    try {
        const alerts: Array<{ type: string; level: 'warn' | 'critical'; message: string; value: number | null; threshold: number }> = [];
        const push = (cond: boolean, level: 'warn' | 'critical', type: string, value: number | null, threshold: number, message: string) => { if (cond) alerts.push({ type, level, message, value, threshold }); };
        // Use values loaded above (provenanceCoveragePct etc.)
        push((provenanceCoveragePct ?? 0) < 100, 'critical', 'provenanceCoverage', provenanceCoveragePct ?? null, 100, 'Provenance coverage below 100%');
        if (fallbackRatePct != null) push(fallbackRatePct > 18, 'warn', 'fallbackRate', fallbackRatePct, 18, 'Fallback rate above target');
        // Adoption thresholds (critical <50, warn 50-80)
        if (crawlerAggregateAdoptionPct != null) {
            push(crawlerAggregateAdoptionPct < 50, 'critical', 'crawlerAggregateAdoption', crawlerAggregateAdoptionPct, 50, 'Crawler aggregate adoption below 50%');
            if (crawlerAggregateAdoptionPct >= 50) push(crawlerAggregateAdoptionPct < 80, 'warn', 'crawlerAggregateAdoption', crawlerAggregateAdoptionPct, 80, 'Crawler aggregate adoption below 80%');
        }
        if (semanticMapAggregateAdoptionPct != null) {
            push(semanticMapAggregateAdoptionPct < 50, 'critical', 'semanticMapAggregateAdoption', semanticMapAggregateAdoptionPct, 50, 'Semantic map aggregate adoption below 50%');
            if (semanticMapAggregateAdoptionPct >= 50) push(semanticMapAggregateAdoptionPct < 80, 'warn', 'semanticMapAggregateAdoption', semanticMapAggregateAdoptionPct, 80, 'Semantic map aggregate adoption below 80%');
        }
        // Latency (overall p95 derived) thresholds: warn >600, critical >1200
        if (p95LatencyOverall != null) {
            push(p95LatencyOverall > 1200, 'critical', 'latencyOverallP95', p95LatencyOverall, 1200, 'Overall p95 latency >1200ms');
            if (p95LatencyOverall > 600 && p95LatencyOverall <= 1200) push(true, 'warn', 'latencyOverallP95', p95LatencyOverall, 600, 'Overall p95 latency >600ms');
        }
        // Cache hit ratio below 45 warn
        if (cacheHitRatio != null) push(cacheHitRatio < 45, 'warn', 'cacheHitRatio', cacheHitRatio, 45, 'Cache hit ratio below target');
        // Rate limit rejection rate >3 warn
        if (rateLimitRejectionRate != null) push(rateLimitRejectionRate > 3, 'warn', 'rateLimitRejectionRate', rateLimitRejectionRate, 3, 'Rate limit rejection rate above target');

        // Compute 7-day moving averages for key metrics (including current day if present)
        let ma7Provenance: number | null = null;
        let ma7CrawlerAdoption: number | null = null;
        let ma7SemanticAdoption: number | null = null;
        let ma7FallbackRate: number | null = null;
        let ma7LatencyP95: number | null = null;
        let ma7CacheHitRatio: number | null = null;
        let ma7RateLimitRejectionRate: number | null = null;
        // Compute 7-day moving averages for key metrics (including current day if present)
        try {
            const recentSnap = await db.collection('kpiDaily').orderBy('date', 'desc').limit(7).get();
            const rows = recentSnap.docs.map(d => d.data() as any);
            const avg = (arr: number[]) => arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : null;
            ma7Provenance = avg(rows.map(r => r.provenanceCoveragePct).filter((v: any) => typeof v === 'number'));
            ma7CrawlerAdoption = avg(rows.map(r => r.crawlerAggregateAdoptionPct).filter((v: any) => typeof v === 'number'));
            ma7SemanticAdoption = avg(rows.map(r => r.semanticMapAggregateAdoptionPct).filter((v: any) => typeof v === 'number'));
            ma7FallbackRate = avg(rows.map(r => r.fallbackRatePct ?? r.fallbackRate).filter((v: any) => typeof v === 'number'));
            ma7LatencyP95 = avg(rows.map(r => r.p95LatencyOverall).filter((v: any) => typeof v === 'number'));
            ma7CacheHitRatio = avg(rows.map(r => r.cacheHitRatio).filter((v: any) => typeof v === 'number'));
            ma7RateLimitRejectionRate = avg(rows.map(r => r.rateLimitRejectionRate).filter((v: any) => typeof v === 'number'));
            // Exponential smoothing (alpha=0.3) using existing kpiDaily order (rows newest->oldest)
            const alpha = 0.3;
            const provenanceSeries = rows.map(r => r.provenanceCoveragePct).filter((v: any) => typeof v === 'number').slice().reverse(); // oldest->newest
            const latencySeries = rows.map(r => r.p95LatencyOverall).filter((v: any) => typeof v === 'number').slice().reverse();
            const smooth = (series: number[]) => {
                if (!series.length) return null;
                let s = series[0];
                for (let i = 1; i < series.length; i++) s = alpha * series[i] + (1 - alpha) * s;
                return +s.toFixed(2);
            };
            const smoothedProvenance = smooth(provenanceSeries);
            const smoothedLatencyP95 = smooth(latencySeries);
            const crawlerSeries = rows.map(r => r.crawlerAggregateAdoptionPct).filter((v: any) => typeof v === 'number').slice().reverse();
            const semanticSeries = rows.map(r => r.semanticMapAggregateAdoptionPct).filter((v: any) => typeof v === 'number').slice().reverse();
            const smoothedCrawlerAdoption = smooth(crawlerSeries);
            const smoothedSemanticAdoption = smooth(semanticSeries);
            // Persist smoothing onto kpiDaily doc alongside MA7
            try {
                await db.collection('kpiDaily').doc(dateKey).update({ smoothedProvenance, smoothedLatencyP95, smoothedCrawlerAdoption, smoothedSemanticAdoption, updatedAt: FieldValue.serverTimestamp() });
            } catch (e) {
                logger.warn('kpiDailySnapshot.smoothingPersistFailed', (e as any)?.message);
            }
            // Include smoothing fields when writing alerts snapshot below
            (globalThis as any).__SMOOTHING = { smoothedProvenance, smoothedLatencyP95, smoothedCrawlerAdoption, smoothedSemanticAdoption };
        } catch (e) {
            logger.warn('kpiAlertsDaily.movingAverageFailed', (e as any)?.message);
        }
        const alertsRef = db.collection('kpiAlertsDaily').doc(dateKey);
        // Persist MA7 overlays onto kpiDaily (update only – doc already written earlier)
        try {
            await db.collection('kpiDaily').doc(dateKey).update({
                ma7Provenance,
                ma7CrawlerAdoption,
                ma7SemanticAdoption,
                ma7FallbackRate,
                ma7LatencyP95,
                ma7CacheHitRatio,
                ma7RateLimitRejectionRate,
                updatedAt: FieldValue.serverTimestamp()
            });
        } catch (e) {
            logger.warn('kpiDailySnapshot.ma7PersistFailed', (e as any)?.message);
        }
        await db.runTransaction(async tx => {
            const aSnap = await tx.get(alertsRef);
            const smoothing = (globalThis as any).__SMOOTHING || {};
            const base = { date: dateKey, alerts, ma7Provenance, ma7CrawlerAdoption, ma7SemanticAdoption, ma7FallbackRate, ma7LatencyP95, ma7CacheHitRatio, ma7RateLimitRejectionRate, ...smoothing, updatedAt: FieldValue.serverTimestamp() } as any;
            if (!aSnap.exists) tx.set(alertsRef, { ...base, createdAt: FieldValue.serverTimestamp() }); else tx.update(alertsRef, base);
        });
        // Retention purge for alert snapshots
        try {
            const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400_000).toISOString().slice(0, 10);
            const old = await db.collection('kpiAlertsDaily').where('date', '<', cutoff).limit(50).get();
            if (!old.empty) {
                const batch = db.batch();
                old.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }
        } catch (e) {
            logger.warn('kpiAlertsDaily.retentionFailed', (e as any)?.message);
        }
    } catch (e) {
        logger.warn('kpiAlertsDaily.persistFailed', (e as any)?.message);
    }

    // Retention purge (older than RETENTION_DAYS)
    try {
        const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400_000).toISOString().slice(0, 10);
        // Because IDs are dateKey, lexicographic comparison works for YYYY-MM-DD
        const oldSnap = await db.collection('kpiDaily').where('date', '<', cutoff).limit(50).get();
        const batch = db.batch();
        oldSnap.docs.forEach(d => batch.delete(d.ref));
        if (!oldSnap.empty) await batch.commit();
    } catch (e) {
        logger.warn('kpiDailySnapshot.retentionFailed', (e as any)?.message);
    }

    logger.info('kpiDailySnapshot.complete', { date: dateKey, aiTokensIn, aiTokensOut, aiCostEstimate: aiCost });
    return { date: dateKey, aiTokensIn, aiTokensOut, aiCostEstimate: aiCost };
}

export const kpiDailySnapshot = onSchedule({
    schedule: 'every 24 hours',
    timeZone: 'Etc/UTC',
    region: 'australia-southeast2'
}, async () => {
    await runKpiDailySnapshot();
});
