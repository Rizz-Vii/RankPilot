#!/usr/bin/env ts-node
/*
 * Wave 4 Comprehensive SEO Documents Backfill Script
 * 
 * Purpose: Migrate large SEO documents to new aggregate schema and mark originals as migrated.
 * 
 * Collections handled:
 * - neuroSeoAnalyses → neuroSeoAnalysesAgg
 * - semanticMapResults → semanticMapResultsAgg  
 * - neuralCrawlerResults → neuralCrawlerResultsAgg
 * 
 * Features:
 * - Dry-run mode with size reduction estimates
 * - Idempotent operation (safe to re-run)
 * - Marks originals with migrated:true
 * - Size threshold filtering
 * - Comprehensive logging and progress tracking
 * 
 * Usage:
 *   npm run backfill:seo-documents              # live run
 *   DRY_RUN=1 npm run backfill:seo-documents    # dry run (counts only)
 *   BATCH_SIZE=200 npm run backfill:seo-documents
 *   SIZE_THRESHOLD=3000 npm run backfill:seo-documents
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot, FieldValue } from 'firebase-admin/firestore';
import { deriveSemanticMapAggregate, deriveNeuralCrawlerAggregate } from './scan-neuroseo-large-docs';

interface NeuroSeoAnalysisDoc {
    userId?: string;
    urls?: string[];
    overallScore?: number;
    topKeywords?: Array<{ keyword: string; position?: number; volume?: number }>;
    topGaps?: string[];
    hashKey?: string;
    __provenance?: string;
    createdAt?: any;
}

interface BackfillResult {
    collection: string;
    scanned: number;
    oversized: number;
    written: number;
    skipped: number;
    alreadyMigrated: number;
    errors: number;
    sizeReduction: {
        totalOriginalSize: number;
        totalAggregateSize: number;
        reductionPct: number;
    };
}

interface BackfillStats {
    collections: BackfillResult[];
    summary: {
        totalScanned: number;
        totalWritten: number;
        totalSkipped: number;
        totalSizeReduction: number;
    };
}

function approxSize(obj: any): number {
    try { 
        return Buffer.byteLength(JSON.stringify(obj)); 
    } catch { 
        return 0; 
    }
}

function deriveNeuroSeoAnalysisAggregate(full: NeuroSeoAnalysisDoc) {
    return {
        userId: full.userId || null,
        urls: (full.urls || []).slice(0, 3), // Limit to top 3 URLs
        overallScore: full.overallScore ?? null,
        topKeywords: (full.topKeywords || []).slice(0, 5), // Limit to top 5 keywords
        topGaps: (full.topGaps || []).slice(0, 3), // Limit to top 3 gaps
        hashKey: full.hashKey || null,
        __provenance: full.__provenance || null,
        keywordsCount: full.topKeywords?.length || 0,
        gapsCount: full.topGaps?.length || 0,
        urlsCount: full.urls?.length || 0,
        version: 1,
        createdAt: full.createdAt || new Date()
    };
}

async function aggregateExists(
    db: FirebaseFirestore.Firestore, 
    targetCollection: string, 
    legacy: any
): Promise<boolean> {
    try {
        // Try different matching strategies based on available fields
        if (legacy.historyId) {
            const q = await db.collection(targetCollection)
                .where('historyId', '==', legacy.historyId)
                .limit(1)
                .get();
            if (!q.empty) return true;
        }
        
        if (legacy.hashKey) {
            const q = await db.collection(targetCollection)
                .where('hashKey', '==', legacy.hashKey)
                .limit(1)
                .get();
            if (!q.empty) return true;
        }
        
        if (legacy.userId && legacy.url) {
            const q = await db.collection(targetCollection)
                .where('userId', '==', legacy.userId)
                .where('url', '==', legacy.url)
                .limit(1)
                .get();
            if (!q.empty) return true;
        }
        
        if (legacy.userId && legacy.urls && legacy.urls.length > 0) {
            const q = await db.collection(targetCollection)
                .where('userId', '==', legacy.userId)
                .where('urls', 'array-contains', legacy.urls[0])
                .limit(1)
                .get();
            if (!q.empty) return true;
        }
        
        return false;
    } catch (e) {
        console.warn(`[aggregateExists] Check failed for ${targetCollection}:`, (e as any)?.message);
        return false;
    }
}

async function processBatch(
    db: FirebaseFirestore.Firestore,
    collection: string,
    targetCollection: string,
    snaps: QueryDocumentSnapshot[],
    deriveAggregate: (data: any) => any,
    sizeThreshold: number,
    dryRun: boolean
): Promise<BackfillResult> {
    let scanned = 0;
    let oversized = 0;
    let written = 0;
    let skipped = 0;
    let alreadyMigrated = 0;
    let errors = 0;
    let totalOriginalSize = 0;
    let totalAggregateSize = 0;

    for (const doc of snaps) {
        scanned++;
        const data = doc.data();
        
        // Skip if already migrated
        if (data.migrated === true) {
            alreadyMigrated++;
            continue;
        }
        
        const size = approxSize(data);
        
        // Apply size threshold
        if (size < sizeThreshold) {
            skipped++;
            continue;
        }
        
        oversized++;
        totalOriginalSize += size;
        
        try {
            // Check if aggregate already exists
            const exists = await aggregateExists(db, targetCollection, data);
            if (exists) {
                skipped++;
                continue;
            }
            
            // Derive aggregate
            const aggregate = deriveAggregate(data);
            const aggSize = approxSize(aggregate);
            totalAggregateSize += aggSize;
            
            if (!dryRun) {
                // Write aggregate
                await db.collection(targetCollection).add({
                    ...aggregate,
                    createdAt: aggregate.createdAt || FieldValue.serverTimestamp()
                });
                
                // Mark original as migrated
                await db.collection(collection).doc(doc.id).update({
                    migrated: true,
                    migratedAt: FieldValue.serverTimestamp()
                });
            }
            
            written++;
        } catch (e) {
            errors++;
            console.error(`[processBatch] Error processing doc ${doc.id}:`, (e as any)?.message);
        }
    }
    
    const reductionPct = totalOriginalSize > 0 
        ? +((1 - (totalAggregateSize / totalOriginalSize)) * 100).toFixed(2)
        : 0;
    
    return {
        collection,
        scanned,
        oversized,
        written,
        skipped,
        alreadyMigrated,
        errors,
        sizeReduction: {
            totalOriginalSize,
            totalAggregateSize,
            reductionPct
        }
    };
}

async function backfillCollection(
    db: FirebaseFirestore.Firestore,
    collection: string,
    targetCollection: string,
    deriveAggregate: (data: any) => any,
    batchSize: number,
    sizeThreshold: number,
    dryRun: boolean
): Promise<BackfillResult> {
    console.log(`[backfill] Starting ${collection} → ${targetCollection}`);
    
    let last: QueryDocumentSnapshot | undefined;
    let totalResult: BackfillResult = {
        collection,
        scanned: 0,
        oversized: 0,
        written: 0,
        skipped: 0,
        alreadyMigrated: 0,
        errors: 0,
        sizeReduction: {
            totalOriginalSize: 0,
            totalAggregateSize: 0,
            reductionPct: 0
        }
    };
    
    while (true) {
        let query = db.collection(collection).limit(batchSize);
        if (last) query = query.startAfter(last);
        
        const snap = await query.get();
        if (snap.empty) break;
        
        const docs = snap.docs;
        const batchResult = await processBatch(
            db, 
            collection, 
            targetCollection, 
            docs, 
            deriveAggregate, 
            sizeThreshold, 
            dryRun
        );
        
        // Accumulate results
        totalResult.scanned += batchResult.scanned;
        totalResult.oversized += batchResult.oversized;
        totalResult.written += batchResult.written;
        totalResult.skipped += batchResult.skipped;
        totalResult.alreadyMigrated += batchResult.alreadyMigrated;
        totalResult.errors += batchResult.errors;
        totalResult.sizeReduction.totalOriginalSize += batchResult.sizeReduction.totalOriginalSize;
        totalResult.sizeReduction.totalAggregateSize += batchResult.sizeReduction.totalAggregateSize;
        
        last = docs[docs.length - 1];
        
        console.log(`[backfill] ${collection} progress: scanned=${totalResult.scanned} oversized=${totalResult.oversized} written=${totalResult.written} skipped=${totalResult.skipped} migrated=${totalResult.alreadyMigrated} errors=${totalResult.errors}`);
        
        if (docs.length < batchSize) break;
    }
    
    // Calculate final reduction percentage
    totalResult.sizeReduction.reductionPct = totalResult.sizeReduction.totalOriginalSize > 0
        ? +((1 - (totalResult.sizeReduction.totalAggregateSize / totalResult.sizeReduction.totalOriginalSize)) * 100).toFixed(2)
        : 0;
    
    console.log(`[backfill] ${collection} complete:`, totalResult);
    return totalResult;
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    const sizeThreshold = parseInt(process.env.SIZE_THRESHOLD || '2500', 10);
    const dryRun = !!process.env.DRY_RUN;
    
    console.log(`[backfill-seo-documents] Starting comprehensive SEO backfill`);
    console.log(`[backfill-seo-documents] batchSize=${batchSize} sizeThreshold=${sizeThreshold} dryRun=${dryRun}`);
    
    const collections = [
        {
            source: 'neuroSeoAnalyses',
            target: 'neuroSeoAnalysesAgg', 
            derive: deriveNeuroSeoAnalysisAggregate
        },
        {
            source: 'semanticMapResults',
            target: 'semanticMapResultsAgg',
            derive: deriveSemanticMapAggregate
        },
        {
            source: 'neuralCrawlerResults', 
            target: 'neuralCrawlerResultsAgg',
            derive: deriveNeuralCrawlerAggregate
        }
    ];
    
    const results: BackfillResult[] = [];
    
    for (const config of collections) {
        try {
            const result = await backfillCollection(
                db,
                config.source,
                config.target,
                config.derive,
                batchSize,
                sizeThreshold,
                dryRun
            );
            results.push(result);
        } catch (e) {
            console.error(`[backfill] Failed to process ${config.source}:`, (e as any)?.message);
            results.push({
                collection: config.source,
                scanned: 0,
                oversized: 0,
                written: 0,
                skipped: 0,
                alreadyMigrated: 0,
                errors: 1,
                sizeReduction: { totalOriginalSize: 0, totalAggregateSize: 0, reductionPct: 0 }
            });
        }
    }
    
    // Generate summary
    const summary = results.reduce((acc, result) => ({
        totalScanned: acc.totalScanned + result.scanned,
        totalWritten: acc.totalWritten + result.written,
        totalSkipped: acc.totalSkipped + result.skipped,
        totalSizeReduction: acc.totalSizeReduction + result.sizeReduction.reductionPct
    }), { totalScanned: 0, totalWritten: 0, totalSkipped: 0, totalSizeReduction: 0 });
    
    const stats: BackfillStats = {
        collections: results,
        summary: {
            ...summary,
            totalSizeReduction: +(summary.totalSizeReduction / results.length).toFixed(2)
        }
    };
    
    console.log('\n=== BACKFILL COMPLETE ===');
    console.log(JSON.stringify(stats, null, 2));
    
    if (dryRun) {
        console.log('\n[backfill] DRY RUN ONLY – no writes performed. Enable live mode by removing DRY_RUN env var.');
    } else {
        console.log('\n[backfill] Live run complete. Original documents marked with migrated:true.');
    }
}

main().catch(e => {
    console.error('Backfill FAILED:', e);
    process.exit(1);
});