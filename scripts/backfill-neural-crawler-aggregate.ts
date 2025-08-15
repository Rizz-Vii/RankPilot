#!/usr/bin/env ts-node
/*
 * T14 Backfill: Generate compact aggregate docs for legacy neuralCrawlerResults.
 * Idempotent: skips if an aggregate with matching historyId already exists (or url+user fallback).
 * Usage:
 *   npm run backfill:neural-crawler-agg              # live run
 *   DRY_RUN=1 npm run backfill:neural-crawler-agg    # dry run (counts only)
 *   BATCH_SIZE=200 npm run backfill:neural-crawler-agg
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

interface LegacyDoc {
    userId: string;
    historyId?: string;
    url: string;
    wordCount?: number;
    readingTime?: number;
    images?: any[];
    links?: Array<{ type: 'internal' | 'external' }>;
    seoAnalysis?: { titleLength?: number; metaDescriptionLength?: number };
    issues?: any[];
    entities?: any[];
    headings?: Record<string, string[]>;
    createdAt?: any;
}

function deriveAggregate(d: LegacyDoc) {
    const internalLinks = d.links?.filter(l => l.type === 'internal').length || 0;
    const externalLinks = d.links?.filter(l => l.type === 'external').length || 0;
    const headingsCounts = d.headings ? Object.fromEntries(Object.entries(d.headings).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])) : {};
    return {
        userId: d.userId,
        historyId: d.historyId || null,
        url: d.url,
        wordCount: d.wordCount || 0,
        readingTime: d.readingTime || 0,
        imagesCount: d.images?.length || 0,
        linksInternal: internalLinks,
        linksExternal: externalLinks,
        titleLength: d.seoAnalysis?.titleLength ?? null,
        metaDescriptionLength: d.seoAnalysis?.metaDescriptionLength ?? null,
        issuesCount: d.issues?.length || 0,
        entitiesCount: d.entities?.length || 0,
        headings: headingsCounts,
        version: 1,
        createdAt: d.createdAt || new Date()
    };
}

async function aggregateExists(db: FirebaseFirestore.Firestore, legacy: LegacyDoc): Promise<boolean> {
    if (legacy.historyId) {
        const q = await db.collection('neuralCrawlerResultsAgg').where('historyId', '==', legacy.historyId).limit(1).get();
        if (!q.empty) return true;
    }
    const q2 = await db.collection('neuralCrawlerResultsAgg').where('userId', '==', legacy.userId).where('url', '==', legacy.url).limit(1).get();
    return !q2.empty;
}

async function processBatch(db: FirebaseFirestore.Firestore, snaps: QueryDocumentSnapshot[], dryRun: boolean) {
    let written = 0; let skipped = 0;
    for (const doc of snaps) {
        const data = doc.data() as LegacyDoc;
        if (!data.userId || !data.url) { skipped++; continue; }
        const exists = await aggregateExists(db, data);
        if (exists) { skipped++; continue; }
        if (!dryRun) {
            const agg = deriveAggregate(data);
            await db.collection('neuralCrawlerResultsAgg').add(agg);
        }
        written++;
    }
    return { written, skipped };
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    const dryRun = !!process.env.DRY_RUN;
    console.log(`[backfill-neural-crawler-aggregate] start batchSize=${batchSize} dryRun=${dryRun}`);
    let last: QueryDocumentSnapshot | undefined;
    let totalWritten = 0, totalSkipped = 0, totalScanned = 0;
    while (true) {
        let query = db.collection('neuralCrawlerResults').limit(batchSize);
        if (last) query = query.startAfter(last);
        const snap = await query.get();
        if (snap.empty) break;
        const docs = snap.docs;
        const { written, skipped } = await processBatch(db, docs, dryRun);
        last = docs[docs.length - 1];
        totalWritten += written; totalSkipped += skipped; totalScanned += docs.length;
        console.log(`[backfill] scanned=${totalScanned} written=${totalWritten} skipped=${totalSkipped}`);
        if (docs.length < batchSize) break;
    }
    console.log(`[backfill-neural-crawler-aggregate] complete scanned=${totalScanned} written=${totalWritten} skipped=${totalSkipped}`);
}

main().catch(e => { console.error('Backfill FAILED', e); process.exit(1); });
