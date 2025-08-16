#!/usr/bin/env ts-node
/*
 * NeuroSEO Legacy Prune Script (Dry-Run First)
 * Objective: Identify (and optionally delete) legacy large NeuroSEO documents that now have aggregate counterparts.
 * Collections: semanticMapResults, neuralCrawlerResults
 * Safety:
 *   - DRY RUN by default unless CONFIRM_PRUNE=1 and DRY_RUN=0
 *   - Optionally gate by adoption thresholds (TARGET_* env vars)
 *   - Max deletions per collection via MAX_DELETE (default 100)
 * Selection Criteria:
 *   - Legacy doc size > THRESHOLD_BYTES AND an aggregate exists (userId+url OR historyId for crawler)
 * Env Vars:
 *   DRY_RUN=1 (default) | set DRY_RUN=0 CONFIRM_PRUNE=1 to actually delete
 *   CONFIRM_PRUNE=1 (required for deletion)
 *   THRESHOLD_BYTES=2500
 *   MAX_DELETE=100
 *   TARGET_CRAWLER_PCT / TARGET_SEMANTIC_PCT
 *   OUTPUT_FILE=artifacts/prune-candidates.json
 * Exit Codes:
 *   0 success
 *   4 thresholds not met (aborted)
 *   5 unexpected failure
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

interface Candidate { collection: string; id: string; size: number; userId?: string; url?: string; historyId?: string; hasAggregate: boolean; }
interface Summary { generatedAt: string; threshold: number; dryRun: boolean; confirm: boolean; targetCrawler?: number; targetSemantic?: number; adoption?: { crawler?: number | null; semantic?: number | null }; counts: Record<string, { scanned: number; candidates: number; deleted: number }>; }

function approxSize(d: any) { try { return Buffer.byteLength(JSON.stringify(d)); } catch { return 0; } }

async function adoptionSnapshot(db: FirebaseFirestore.Firestore) {
    const [crawlerLegacy, crawlerAgg, semanticLegacy, semanticAgg] = await Promise.all([
        db.collection('neuralCrawlerResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('neuralCrawlerResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResults').count().get().then(r => r.data().count).catch(() => 0),
        db.collection('semanticMapResultsAgg').count().get().then(r => r.data().count).catch(() => 0),
    ]);
    const crawlerDenom = crawlerLegacy + crawlerAgg;
    const semanticDenom = semanticLegacy + semanticAgg;
    return {
        crawler: crawlerDenom > 0 ? +((crawlerAgg / crawlerDenom) * 100).toFixed(2) : null,
        semantic: semanticDenom > 0 ? +((semanticAgg / semanticDenom) * 100).toFixed(2) : null,
    };
}

async function buildAggregateKeyIndex(db: FirebaseFirestore.Firestore, collection: string) {
    const snap = await db.collection(collection).select('userId', 'url', 'historyId').get();
    const set = new Set<string>();
    snap.forEach(d => {
        const data: any = d.data();
        if (data.historyId) set.add('h:' + data.historyId);
        else if (data.userId && data.url) set.add('u:' + data.userId + '|' + data.url);
    });
    return set;
}

async function collectCandidates(db: FirebaseFirestore.Firestore, legacyCol: string, aggCol: string, threshold: number, max: number): Promise<{ candidates: Candidate[]; scanned: number }> {
    const keyIndex = await buildAggregateKeyIndex(db, aggCol);
    let last: QueryDocumentSnapshot | undefined; const batchSize = 400;
    const candidates: Candidate[] = []; let scanned = 0;
    while (true) {
        let q = db.collection(legacyCol).limit(batchSize);
        if (last) q = q.startAfter(last);
        const snap = await q.get(); if (snap.empty) break;
        for (const doc of snap.docs) {
            scanned++;
            const data: any = doc.data();
            const size = approxSize(data);
            if (size <= threshold) continue;
            const key = data.historyId ? ('h:' + data.historyId) : (data.userId && data.url ? 'u:' + data.userId + '|' + data.url : null);
            if (!key) continue;
            const hasAggregate = keyIndex.has(key);
            if (hasAggregate) {
                candidates.push({ collection: legacyCol, id: doc.id, size, userId: data.userId, url: data.url, historyId: data.historyId, hasAggregate });
                if (candidates.length >= max) break;
            }
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < batchSize || candidates.length >= max) break;
    }
    return { candidates, scanned };
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const threshold = parseInt(process.env.THRESHOLD_BYTES || '2500', 10);
    const dryRun = process.env.DRY_RUN !== '0';
    const confirm = process.env.CONFIRM_PRUNE === '1';
    const maxDelete = parseInt(process.env.MAX_DELETE || '100', 10);
    const targetCrawler = process.env.TARGET_CRAWLER_PCT ? parseFloat(process.env.TARGET_CRAWLER_PCT) : undefined;
    const targetSemantic = process.env.TARGET_SEMANTIC_PCT ? parseFloat(process.env.TARGET_SEMANTIC_PCT) : undefined;
    const adoption = await adoptionSnapshot(db);
    if ((targetCrawler && adoption.crawler != null && adoption.crawler < targetCrawler) || (targetSemantic && adoption.semantic != null && adoption.semantic < targetSemantic)) {
        console.error('[prune] ABORT thresholds not met', { adoption, targetCrawler, targetSemantic });
        process.exit(4);
    }
    const colPairs = [
        { legacy: 'semanticMapResults', agg: 'semanticMapResultsAgg' },
        { legacy: 'neuralCrawlerResults', agg: 'neuralCrawlerResultsAgg' },
    ];
    const allCandidates: Candidate[] = [];
    const counts: Summary['counts'] = {} as any;
    for (const pair of colPairs) {
        const { candidates, scanned } = await collectCandidates(db, pair.legacy, pair.agg, threshold, maxDelete);
        counts[pair.legacy] = { scanned, candidates: candidates.length, deleted: 0 };
        allCandidates.push(...candidates);
    }
    console.log('[prune] candidates', allCandidates.map(c => ({ collection: c.collection, id: c.id, size: c.size })).slice(0, 20));
    if (confirm && !dryRun) {
        for (const c of allCandidates) {
            await db.collection(c.collection).doc(c.id).delete();
            counts[c.collection].deleted++;
        }
    }
    const summary: Summary = { generatedAt: new Date().toISOString(), threshold, dryRun, confirm, targetCrawler, targetSemantic, adoption, counts };
    console.log('[prune] summary', JSON.stringify(summary, null, 2));
    const out = process.env.OUTPUT_FILE;
    if (out) {
        try {
            const fs = await import('fs');
            fs.mkdirSync(require('path').dirname(out), { recursive: true });
            fs.writeFileSync(out, JSON.stringify({ summary, candidates: allCandidates }, null, 2));
            console.log('[prune] wrote', out);
        } catch (e) {
            console.error('[prune] failed write', (e as any)?.message);
        }
    }
    process.exit(0);
}

main().catch(e => { console.error('[prune] FAILED', e); process.exit(5); });
