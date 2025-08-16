#!/usr/bin/env ts-node
/*
 * T14 Migration – Size Reduction Report
 * Computes size reduction statistics between legacy collections (semanticMapResults, neuralCrawlerResults)
 * and their aggregate counterparts (semanticMapResultsAgg, neuralCrawlerResultsAgg).
 * Output: logs summary + optional JSON (OUTPUT_FILE)
 * Usage:
 *   ts-node scripts/report-neuroseo-size-reduction.ts
 *   OUTPUT_FILE=artifacts/size-reduction.json ts-node scripts/report-neuroseo-size-reduction.ts
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface Stats {
    legacyCount: number; aggCount: number; matched: number; legacyBytes: number; aggBytes: number; reductionPct: number | null;
}

function approxSize(v: any) { try { return Buffer.byteLength(JSON.stringify(v)); } catch { return 0; } }

async function collectPairSizes(db: FirebaseFirestore.Firestore, legacyCol: string, aggCol: string, matchFields: string[]): Promise<Stats> {
    const stats: Stats = { legacyCount: 0, aggCount: 0, matched: 0, legacyBytes: 0, aggBytes: 0, reductionPct: null };
    const legacySnap = await db.collection(legacyCol).limit(5000).get(); // cap for safety
    stats.legacyCount = legacySnap.size;
    if (!legacySnap.empty) {
        const aggSnap = await db.collection(aggCol).limit(5000).get();
        stats.aggCount = aggSnap.size;
        const aggIndex = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        aggSnap.docs.forEach(d => {
            const data: any = d.data();
            const key = matchFields.map(f => data[f] ?? '').join('|');
            aggIndex.set(key, d);
        });
        for (const doc of legacySnap.docs) {
            const data: any = doc.data();
            const key = matchFields.map(f => data[f] ?? '').join('|');
            const legacySize = approxSize(data);
            const aggDoc = aggIndex.get(key);
            if (aggDoc) {
                stats.matched++;
                stats.legacyBytes += legacySize;
                stats.aggBytes += approxSize(aggDoc.data());
            }
        }
        if (stats.matched > 0) {
            const avgLegacy = stats.legacyBytes / stats.matched;
            const avgAgg = stats.aggBytes / stats.matched;
            stats.reductionPct = +(((1 - (avgAgg / avgLegacy)) * 100)).toFixed(2);
        }
    }
    return stats;
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const semantic = await collectPairSizes(db, 'semanticMapResults', 'semanticMapResultsAgg', ['userId', 'url']);
    const crawler = await collectPairSizes(db, 'neuralCrawlerResults', 'neuralCrawlerResultsAgg', ['userId', 'url']);
    const summary = { generatedAt: new Date().toISOString(), semantic, crawler };
    console.log('[size-reduction] summary', JSON.stringify(summary, null, 2));
    const out = process.env.OUTPUT_FILE;
    if (out) {
        try { const fs = await import('fs'); fs.mkdirSync(require('path').dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(summary, null, 2)); console.log(`[size-reduction] wrote ${out}`); } catch (e) { console.error('[size-reduction] failed to write OUTPUT_FILE', (e as any)?.message); }
    }
}

main().catch(e => { console.error('[size-reduction] FAILED', e); process.exit(1); });
