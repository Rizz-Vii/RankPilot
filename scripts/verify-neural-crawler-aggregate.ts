#!/usr/bin/env ts-node
/* Verification: Sample legacy vs aggregate parity (counts). */
import { getApps, initializeApp } from 'firebase-admin/app';
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
        const dataUnknown = d.data() as unknown;
        const data = (dataUnknown && typeof dataUnknown === 'object') ? dataUnknown as Record<string, unknown> : {};
        const hist = typeof data.historyId === 'string' ? data.historyId : null;
        let aggQuery = db.collection('neuralCrawlerResultsAgg').where('historyId', '==', hist).limit(1);
        if (!hist) {
            const userId = typeof data.userId === 'string' ? data.userId : '';
            const url = typeof data.url === 'string' ? data.url : '';
            aggQuery = db.collection('neuralCrawlerResultsAgg').where('userId', '==', userId).where('url', '==', url).limit(1);
        }
        const aggSnap = await aggQuery.get();
        if (aggSnap.empty) { console.warn('Missing aggregate for', d.id); mismatches++; continue; }
        const aggUnknown = aggSnap.docs[0].data() as unknown;
        const agg = (aggUnknown && typeof aggUnknown === 'object') ? aggUnknown as Record<string, unknown> : {};
        const images = Array.isArray((data as Record<string, unknown>).images) ? (data as Record<string, unknown>).images as unknown[] : [];
        const links = Array.isArray((data as Record<string, unknown>).links) ? (data as Record<string, unknown>).links as unknown[] : [];
        const issues = Array.isArray((data as Record<string, unknown>).issues) ? (data as Record<string, unknown>).issues as unknown[] : [];
        const entities = Array.isArray((data as Record<string, unknown>).entities) ? (data as Record<string, unknown>).entities as unknown[] : [];
        const expected = {
            wordCount: typeof data.wordCount === 'number' ? data.wordCount : 0,
            readingTime: typeof data.readingTime === 'number' ? data.readingTime : 0,
            imagesCount: images.length,
            linksInternal: links.filter((l: unknown) => (l && typeof l === 'object' && (l as Record<string, unknown>).type === 'internal')).length,
            linksExternal: links.filter((l: unknown) => (l && typeof l === 'object' && (l as Record<string, unknown>).type === 'external')).length,
            issuesCount: issues.length,
            entitiesCount: entities.length
        };
        for (const k of Object.keys(expected) as (keyof typeof expected)[]) {
            const aggVal = (agg as Record<string, unknown>)[k as string];
            if (aggVal !== expected[k]) { console.error('Mismatch', k, 'legacy=', expected[k], 'agg=', aggVal); mismatches++; break; }
        }
    }
    if (mismatches) {
        console.error(`Verification FAILED mismatches=${mismatches}/${picks.length}`);
        process.exit(1);
    }
    console.log(`Verification OK sampled=${picks.length}`);
}

main().catch(e => { console.error('Verification ERROR', e); process.exit(1); });
