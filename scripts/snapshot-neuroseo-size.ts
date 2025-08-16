#!/usr/bin/env ts-node
/*
 * NeuroSEO Size Snapshot Wrapper
 * Purpose: Combine size reduction stats + approximate adoption in one dated artifact.
 * Usage: OUTPUT_DIR=artifacts ts-node scripts/snapshot-neuroseo-size.ts
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function adoption(db: FirebaseFirestore.Firestore) {
    const [crawlerLegacy, crawlerAgg, semanticLegacy, semanticAgg] = await Promise.all([
        db.collection('neuralCrawlerResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('neuralCrawlerResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
    ]);
    const crawlerDenom = crawlerLegacy + crawlerAgg; const semanticDenom = semanticLegacy + semanticAgg;
    return {
        crawlerAggregateAdoptionApprox: crawlerDenom > 0 ? +((crawlerAgg / crawlerDenom) * 100).toFixed(2) : null,
        semanticMapAggregateAdoptionApprox: semanticDenom > 0 ? +((semanticAgg / semanticDenom) * 100).toFixed(2) : null,
    };
}

async function runSizeReport(): Promise<any> {
    const { getApps: ga2 } = await import('firebase-admin/app');
    const { getFirestore: gf2 } = await import('firebase-admin/firestore');
    if (!ga2().length) initializeApp();
    const db = gf2();
    async function collectPairSizes(legacyCol: string, aggCol: string, matchFields: string[]) {
        const stats: any = { legacyCount: 0, aggCount: 0, matched: 0, legacyBytes: 0, aggBytes: 0, reductionPct: null };
        const legacySnap = await db.collection(legacyCol).limit(5000).get(); stats.legacyCount = legacySnap.size;
        if (!legacySnap.empty) {
            const aggSnap = await db.collection(aggCol).limit(5000).get(); stats.aggCount = aggSnap.size;
            const aggIndex = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
            aggSnap.docs.forEach(d => { const data: any = d.data(); const key = matchFields.map(f => (data as any)[f] ?? '').join('|'); aggIndex.set(key, d); });
            for (const doc of legacySnap.docs) {
                const data: any = doc.data(); const key = matchFields.map(f => (data as any)[f] ?? '').join('|'); const legacySize = Buffer.byteLength(JSON.stringify(data)); const aggDoc = aggIndex.get(key);
                if (aggDoc) { stats.matched++; stats.legacyBytes += legacySize; stats.aggBytes += Buffer.byteLength(JSON.stringify(aggDoc.data())); }
            }
            if (stats.matched > 0) { const avgLegacy = stats.legacyBytes / stats.matched; const avgAgg = stats.aggBytes / stats.matched; stats.reductionPct = +(((1 - (avgAgg / avgLegacy)) * 100)).toFixed(2); }
        }
        return stats;
    }
    const semantic = await collectPairSizes('semanticMapResults', 'semanticMapResultsAgg', ['userId', 'url']);
    const crawler = await collectPairSizes('neuralCrawlerResults', 'neuralCrawlerResultsAgg', ['userId', 'url']);
    return { semantic, crawler };
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const [sizeReport, adopt] = await Promise.all([runSizeReport(), adoption(db)]);
    const snapshot = { generatedAt: new Date().toISOString(), ...sizeReport, adoption: adopt };
    console.log('[snapshot-size] snapshot', JSON.stringify(snapshot, null, 2));
    const dir = process.env.OUTPUT_DIR;
    if (dir) {
        try {
            const fs = await import('fs');
            fs.mkdirSync(dir, { recursive: true });
            const file = `${dir}/size-reduction-${new Date().toISOString().split('T')[0]}.json`;
            fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
            console.log('[snapshot-size] wrote', file);
        } catch (e) {
            console.error('[snapshot-size] write failed', (e as any)?.message);
        }
    }
}

main().catch(e => { console.error('[snapshot-size] FAILED', e); process.exit(1); });
