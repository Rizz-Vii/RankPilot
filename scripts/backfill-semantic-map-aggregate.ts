#!/usr/bin/env ts-node
/*
 * T14 Backfill: Generate compact aggregate docs for legacy semanticMapResults.
 * Idempotent: skips if an aggregate with matching (userId,url) exists OR doc id already processed.
 * Usage:
 *   npm run backfill:semantic-map-agg              # live run
 *   DRY_RUN=1 npm run backfill:semantic-map-agg    # dry run (counts only)
 *   BATCH_SIZE=200 npm run backfill:semantic-map-agg
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { SemanticMapFullDoc } from './scan-neuroseo-large-docs';
import { deriveSemanticMapAggregate } from './scan-neuroseo-large-docs';

interface LegacySemanticDoc {
    userId?: string; url?: string; overallScore?: number;
    topicClusters?: unknown[]; keywordAnalysis?: unknown[]; contentAnalysis?: unknown;
    semanticGraph?: { nodes?: unknown[]; edges?: unknown[] }; recommendations?: unknown[]; createdAt?: Date | { toDate?: () => Date } | null;
}

async function aggregateExists(db: FirebaseFirestore.Firestore, legacy: LegacySemanticDoc): Promise<boolean> {
    if (!legacy.userId || !legacy.url) return false;
    const q = await db.collection('semanticMapResultsAgg').where('userId', '==', legacy.userId).where('url', '==', legacy.url).limit(1).get();
    return !q.empty;
}

async function processBatch(db: FirebaseFirestore.Firestore, snaps: QueryDocumentSnapshot[], dryRun: boolean) {
    let written = 0; let skipped = 0; let oversizedConsidered = 0;
    for (const doc of snaps) {
        const data = doc.data() as LegacySemanticDoc;
        if (!data.userId || !data.url) { skipped++; continue; }
        // Approx size gate (>2.5KB) to focus on large docs first
        const size = Buffer.byteLength(JSON.stringify(data));
        if (size < 2500) { skipped++; continue; }
        oversizedConsidered++;
        const exists = await aggregateExists(db, data);
        if (exists) { skipped++; continue; }
        const agg = deriveSemanticMapAggregate(data as unknown as SemanticMapFullDoc);
        if (!dryRun) {
            await db.collection('semanticMapResultsAgg').add({ ...agg, createdAt: agg.createdAt || FieldValue.serverTimestamp() });
        }
        written++;
    }
    return { written, skipped, oversizedConsidered };
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    const dryRun = !!process.env.DRY_RUN;
    console.log(`[backfill-semantic-map-aggregate] start batchSize=${batchSize} dryRun=${dryRun}`);
    let last: QueryDocumentSnapshot | undefined;
    let totalWritten = 0, totalSkipped = 0, totalScanned = 0, totalOversized = 0;
    while (true) {
        let query = db.collection('semanticMapResults').limit(batchSize);
        if (last) query = query.startAfter(last);
        const snap = await query.get();
        if (snap.empty) break;
        const docs = snap.docs;
        const { written, skipped, oversizedConsidered } = await processBatch(db, docs, dryRun);
        last = docs[docs.length - 1];
        totalWritten += written; totalSkipped += skipped; totalScanned += docs.length; totalOversized += oversizedConsidered;
        console.log(`[backfill] scanned=${totalScanned} oversized=${totalOversized} written=${totalWritten} skipped=${totalSkipped}`);
        if (docs.length < batchSize) break;
    }
    console.log(`[backfill-semantic-map-aggregate] complete scanned=${totalScanned} oversized=${totalOversized} written=${totalWritten} skipped=${totalSkipped}`);
    if (dryRun) console.log('[backfill] DRY RUN ONLY – no writes performed.');
}

main().catch(e => { console.error('Backfill FAILED', e); process.exit(1); });
