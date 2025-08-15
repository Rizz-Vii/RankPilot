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
    try {
        const uDoc = await db.collection('unifiedMetricsDaily').doc(dateKey).get();
        if (uDoc.exists) {
            const u: any = uDoc.data();
            provenanceCoveragePct = typeof u.provenanceCoveragePct === 'number' ? u.provenanceCoveragePct : null;
            p90LatencyOverall = typeof u.p90LatencyOverall === 'number' ? u.p90LatencyOverall : null;
            p95LatencyOverall = typeof u.p95LatencyOverall === 'number' ? u.p95LatencyOverall : null;
            p99LatencyOverall = typeof u.p99LatencyOverall === 'number' ? u.p99LatencyOverall : null;
        }
    } catch (e) {
        logger.warn('kpiDailySnapshot.unifiedMetricsLoadFailed', (e as any)?.message);
    }
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
            updatedAt: FieldValue.serverTimestamp(),
            _schema: 1
        } as any;
        if (!snap.exists) {
            tx.set(ref, { ...base, createdAt: FieldValue.serverTimestamp() });
        } else {
            tx.update(ref, base);
        }
    });

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
