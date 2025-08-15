#!/usr/bin/env ts-node
/* Verification: Sample legacy vs aggregate parity (counts). */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function sample<T>(arr: T[], n: number): T[] { return arr.sort(() => Math.random() - 0.5).slice(0, n); }

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const limit = parseInt(process.env.SAMPLE || '25', 10);
    const legacySnap = await db.collection('neuralCrawlerResults').limit(500).get();
    if (legacySnap.empty) { console.log('No legacy docs to verify.'); return; }
    const picks = sample(legacySnap.docs, Math.min(limit, legacySnap.size));
    let mismatches = 0;
    for (const d of picks) {
        const data: any = d.data();
        const hist = data.historyId;
        let aggQuery = db.collection('neuralCrawlerResultsAgg').where('historyId', '==', hist || null).limit(1);
        if (!hist) aggQuery = db.collection('neuralCrawlerResultsAgg').where('userId', '==', data.userId).where('url', '==', data.url).limit(1);
        const aggSnap = await aggQuery.get();
        if (aggSnap.empty) { console.warn('Missing aggregate for', d.id); mismatches++; continue; }
        const agg = aggSnap.docs[0].data();
        const expected = {
            wordCount: data.wordCount || 0,
            readingTime: data.readingTime || 0,
            imagesCount: (data.images || []).length,
            linksInternal: (data.links || []).filter((l: any) => l.type === 'internal').length,
            linksExternal: (data.links || []).filter((l: any) => l.type === 'external').length,
            issuesCount: (data.issues || []).length,
            entitiesCount: (data.entities || []).length
        };
        for (const k of Object.keys(expected) as (keyof typeof expected)[]) {
            if ((agg as any)[k] !== expected[k]) { console.error('Mismatch', k, 'legacy=', expected[k], 'agg=', (agg as any)[k]); mismatches++; break; }
        }
    }
    if (mismatches) {
        console.error(`Verification FAILED mismatches=${mismatches}/${picks.length}`);
        process.exit(1);
    }
    console.log(`Verification OK sampled=${picks.length}`);
}

main().catch(e => { console.error('Verification ERROR', e); process.exit(1); });
