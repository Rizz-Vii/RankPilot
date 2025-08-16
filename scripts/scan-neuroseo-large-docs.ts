#!/usr/bin/env ts-node
/*
 * T14 Migration – Large NeuroSEO Docs Scanner (Dry Run)
 * Purpose: Enumerate large semanticMapResults & neuralCrawlerResults documents exceeding a size threshold
 *          and compute proposed aggregate (data-minimized) structures WITHOUT writing.
 * Threshold: DEFAULT_THRESHOLD_BYTES=2500 (override via THRESHOLD_BYTES env)
 * Batching: BATCH_SIZE (default 100)
 * Output: Logs each oversized doc summary + proposed aggregate JSON (truncated) & final summary counts.
 * Write Mode: Currently dry-run only (no writes). Future WRITE=1 flag can enable persistence once reviewed.
 * Usage:
 *   npm run scan:neuroseo-large                      # dry run with defaults
 *   THRESHOLD_BYTES=3000 npm run scan:neuroseo-large  # custom threshold
 *   BATCH_SIZE=50 npm run scan:neuroseo-large         # smaller batch
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot, FieldValue } from 'firebase-admin/firestore';

interface SemanticMapFullDoc {
    userId?: string;
    url?: string;
    overallScore?: number;
    topicClusters?: Array<{ topic: string; semanticScore?: number; opportunity?: string }>;
    keywordAnalysis?: Array<{ keyword: string; semanticRelevance?: number }>;
    contentAnalysis?: {
        readabilityScore?: number; contentDepth?: number; topicCoverage?: number; semanticRichness?: number; expertiseSignals?: number;
    };
    semanticGraph?: { nodes?: any[]; edges?: any[] };
    recommendations?: any[];
    createdAt?: any;
}

interface NeuralCrawlerFullDoc {
    userId?: string; url?: string; historyId?: string; wordCount?: number; readingTime?: number;
    images?: any[]; links?: Array<{ type: 'internal' | 'external' }>; seoAnalysis?: { titleLength?: number; metaDescriptionLength?: number };
    issues?: any[]; entities?: any[]; headings?: Record<string, string[]>; createdAt?: any;
}

function approxSize(obj: any): number {
    try { return Buffer.byteLength(JSON.stringify(obj)); } catch { return 0; }
}

export function deriveSemanticMapAggregate(full: SemanticMapFullDoc) {
    const topTopicClusters = (full.topicClusters || [])
        .slice(0, 5)
        .map(tc => ({ topic: tc.topic, semanticScore: tc.semanticScore ?? null, opportunity: tc.opportunity ?? null }));
    const topKeywords = (full.keywordAnalysis || [])
        .slice(0, 8)
        .map(k => ({ keyword: k.keyword, semanticRelevance: k.semanticRelevance ?? null }));
    const ca = full.contentAnalysis || {};
    return {
        userId: full.userId || null,
        url: full.url || null,
        overallScore: full.overallScore ?? null,
        topicClustersCount: full.topicClusters?.length || 0,
        keywordAnalysisCount: full.keywordAnalysis?.length || 0,
        topTopicClusters,
        topKeywords,
        readabilityScore: ca.readabilityScore ?? null,
        contentDepth: ca.contentDepth ?? null,
        topicCoverage: ca.topicCoverage ?? null,
        semanticRichness: ca.semanticRichness ?? null,
        expertiseSignals: ca.expertiseSignals ?? null,
        graphNodesCount: full.semanticGraph?.nodes?.length || 0,
        graphEdgesCount: full.semanticGraph?.edges?.length || 0,
        recommendationsCount: full.recommendations?.length || 0,
        version: 1,
        createdAt: full.createdAt || new Date()
    };
}

export function deriveNeuralCrawlerAggregate(full: NeuralCrawlerFullDoc) {
    const internalLinks = full.links?.filter(l => l.type === 'internal').length || 0;
    const externalLinks = full.links?.filter(l => l.type === 'external').length || 0;
    const headingsCounts = full.headings ? Object.fromEntries(Object.entries(full.headings).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])) : {};
    return {
        userId: full.userId || null,
        historyId: full.historyId || null,
        url: full.url || null,
        wordCount: full.wordCount || 0,
        readingTime: full.readingTime || 0,
        imagesCount: full.images?.length || 0,
        linksInternal: internalLinks,
        linksExternal: externalLinks,
        titleLength: full.seoAnalysis?.titleLength ?? null,
        metaDescriptionLength: full.seoAnalysis?.metaDescriptionLength ?? null,
        issuesCount: full.issues?.length || 0,
        entitiesCount: full.entities?.length || 0,
        headings: headingsCounts,
        version: 1,
        createdAt: full.createdAt || new Date()
    };
}

interface ScanResultEntry {
    collection: string;
    id: string;
    size: number;
    proposedAggregateSize: number | null;
    reductionPct: number | null;
    userId: string | null;
    url: string | null;
    aggregatePreview: any;
    wrote?: boolean;
    skippedWriteReason?: string;
}

async function ensureAggregateDoc(db: FirebaseFirestore.Firestore, collection: string, legacy: any, aggregate: any): Promise<{ wrote: boolean; reason?: string }> {
    // Duplicate avoidance: match by historyId if present else userId+url
    try {
        if (legacy.historyId) {
            const q = await db.collection(collection).where('historyId', '==', legacy.historyId).limit(1).get();
            if (!q.empty) return { wrote: false, reason: 'exists_historyId' };
        } else if (legacy.userId && legacy.url) {
            const q2 = await db.collection(collection).where('userId', '==', legacy.userId).where('url', '==', legacy.url).limit(1).get();
            if (!q2.empty) return { wrote: false, reason: 'exists_user_url' };
        }
        await db.collection(collection).add({ ...aggregate, createdAt: aggregate.createdAt || FieldValue.serverTimestamp() });
        return { wrote: true };
    } catch (e) {
        return { wrote: false, reason: 'write_error' };
    }
}

async function scanCollection(db: FirebaseFirestore.Firestore, name: string, threshold: number, derive: (d: any) => any, opts: { write: boolean; output: ScanResultEntry[] }) {
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    console.log(`[scan] collection=${name} threshold=${threshold} batchSize=${batchSize}`);
    let last: QueryDocumentSnapshot | undefined;
    let scanned = 0, oversized = 0;
    while (true) {
        let q = db.collection(name).limit(batchSize);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        for (const doc of snap.docs) {
            scanned++;
            const data = doc.data();
            const size = approxSize(data);
            if (size > threshold) {
                oversized++;
                const aggregate = derive(data);
                const aggSize = approxSize(aggregate);
                let wrote = false; let skippedWriteReason: string | undefined;
                if (opts.write) {
                    const targetCollection = name === 'semanticMapResults' ? 'semanticMapResultsAgg' : (name === 'neuralCrawlerResults' ? 'neuralCrawlerResultsAgg' : `${name}Agg`);
                    const res = await ensureAggregateDoc(db, targetCollection, data, aggregate);
                    wrote = res.wrote; skippedWriteReason = res.reason;
                }
                const entry: ScanResultEntry = {
                    collection: name,
                    id: doc.id,
                    size,
                    proposedAggregateSize: aggSize,
                    reductionPct: aggSize ? +(((1 - (aggSize / size)) * 100).toFixed(2)) : null,
                    userId: (data as any).userId || null,
                    url: (data as any).url || null,
                    aggregatePreview: aggregate,
                    wrote,
                    skippedWriteReason
                };
                opts.output.push(entry);
                console.log(JSON.stringify(entry, null, 2));
            }
        }
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < batchSize) break;
    }
    console.log(`[scan] complete collection=${name} scanned=${scanned} oversized>${threshold}=${oversized}`);
    return { scanned, oversized };
}

async function main() {
    const threshold = parseInt(process.env.THRESHOLD_BYTES || '2500', 10);
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const write = process.env.WRITE === '1';
    const outputFile = process.env.OUTPUT_FILE;
    const results: ScanResultEntry[] = [];
    console.log(`[scan] starting neuroseo large document scan write=${write} threshold=${threshold}`);
    const semantic = await scanCollection(db, 'semanticMapResults', threshold, deriveSemanticMapAggregate, { write, output: results });
    const crawler = await scanCollection(db, 'neuralCrawlerResults', threshold, deriveNeuralCrawlerAggregate, { write, output: results });
    console.log('[scan] summary', { threshold, semantic, crawler, write });
    if (outputFile) {
        try {
            const fs = await import('fs');
            fs.writeFileSync(outputFile, JSON.stringify({ generatedAt: new Date().toISOString(), threshold, write, semantic, crawler, entries: results }, null, 2));
            console.log(`[scan] wrote summary JSON -> ${outputFile}`);
        } catch (e) {
            console.error('[scan] failed to write OUTPUT_FILE', (e as any)?.message);
        }
    }
    if (!write) console.log('[scan] DRY RUN – no aggregate documents written. Enable WRITE=1 to persist.');
}

main().catch(e => { console.error('[scan] FAILED', e); process.exit(1); });
