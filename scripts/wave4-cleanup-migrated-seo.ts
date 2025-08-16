#!/usr/bin/env ts-node
/**
 * Wave 4: Cleanup Script for Migrated SEO Documents
 * Objective: Delete legacy large SEO documents that have been successfully migrated (flagged with migrated:true)
 * Safety: DRY RUN by default, requires explicit confirmation for deletion
 * 
 * Collections targeted:
 * - neuroSeoAnalyses (legacy variants that were migrated to canonical)
 * - neuralCrawlerResults (large docs with aggregate counterparts)
 * - semanticMapResults (large docs with aggregate counterparts)
 * 
 * Env Vars:
 *   DRY_RUN=0 CONFIRM_CLEANUP=1 - required for actual deletion
 *   MAX_DELETE=100 - limit deletions per run
 *   OUTPUT_FILE=artifacts/wave4-cleanup.json - output summary
 * 
 * Exit Codes:
 *   0 success
 *   1 configuration error
 *   2 validation failure
 *   3 cleanup execution failure
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

interface CleanupCandidate {
    collection: string;
    id: string;
    userId?: string;
    url?: string;
    historyId?: string;
    migratedAt?: string;
    size: number;
}

interface CleanupSummary {
    generatedAt: string;
    dryRun: boolean;
    confirm: boolean;
    maxDelete: number;
    counts: Record<string, {
        scanned: number;
        migratedTrue: number;
        migratedFalse: number;
        noMigrationFlag: number;
        deleted: number;
    }>;
    candidates: CleanupCandidate[];
}

function approxSize(data: any): number {
    try {
        return Buffer.byteLength(JSON.stringify(data));
    } catch {
        return 0;
    }
}

async function collectMigratedDocuments(
    db: FirebaseFirestore.Firestore,
    collection: string,
    maxDelete: number
): Promise<{
    candidates: CleanupCandidate[];
    counts: CleanupSummary['counts'][string];
}> {
    const counts = {
        scanned: 0,
        migratedTrue: 0,
        migratedFalse: 0,
        noMigrationFlag: 0,
        deleted: 0
    };

    const candidates: CleanupCandidate[] = [];
    let lastDoc: QueryDocumentSnapshot | undefined;
    const batchSize = 200;

    while (true) {
        let query = db.collection(collection).limit(batchSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
            counts.scanned++;
            const data: any = doc.data();
            
            if (data.migrated === true) {
                counts.migratedTrue++;
                candidates.push({
                    collection,
                    id: doc.id,
                    userId: data.userId,
                    url: data.url,
                    historyId: data.historyId,
                    migratedAt: data.migratedAt,
                    size: approxSize(data)
                });
                
                if (candidates.length >= maxDelete) {
                    break;
                }
            } else if (data.migrated === false) {
                counts.migratedFalse++;
            } else {
                counts.noMigrationFlag++;
            }
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < batchSize || candidates.length >= maxDelete) {
            break;
        }
    }

    return { candidates, counts };
}

async function validateAggregateExists(
    db: FirebaseFirestore.Firestore,
    candidate: CleanupCandidate
): Promise<boolean> {
    // For neuralCrawlerResults, check neuralCrawlerResultsAgg
    // For semanticMapResults, check semanticMapResultsAgg
    // For neuroSeoAnalyses, check canonical neuroSeoAnalyses
    
    let aggregateCollection: string;
    let lookupKey: string;

    if (candidate.collection === 'neuralCrawlerResults') {
        aggregateCollection = 'neuralCrawlerResultsAgg';
        lookupKey = candidate.historyId ? 
            `historyId == '${candidate.historyId}'` :
            `userId == '${candidate.userId}' && url == '${candidate.url}'`;
    } else if (candidate.collection === 'semanticMapResults') {
        aggregateCollection = 'semanticMapResultsAgg';
        lookupKey = candidate.historyId ?
            `historyId == '${candidate.historyId}'` :
            `userId == '${candidate.userId}' && url == '${candidate.url}'`;
    } else if (candidate.collection.includes('neuroSeo')) {
        aggregateCollection = 'neuroSeoAnalyses';
        // For neuroSeo, just check if a document exists with same userId
        lookupKey = `userId == '${candidate.userId}'`;
    } else {
        return false;
    }

    try {
        const query = candidate.historyId ?
            db.collection(aggregateCollection).where('historyId', '==', candidate.historyId) :
            db.collection(aggregateCollection)
                .where('userId', '==', candidate.userId)
                .where('url', '==', candidate.url);
        
        const snapshot = await query.limit(1).get();
        return !snapshot.empty;
    } catch (error) {
        console.warn(`[validation] Failed to check aggregate for ${candidate.collection}:${candidate.id}`, error);
        return false;
    }
}

async function performCleanup(
    db: FirebaseFirestore.Firestore,
    candidates: CleanupCandidate[],
    dryRun: boolean,
    confirm: boolean
): Promise<number> {
    if (!confirm || dryRun) {
        console.log(`[cleanup] DRY RUN - would delete ${candidates.length} documents`);
        return 0;
    }

    let deletedCount = 0;
    const batchSize = 10; // Conservative batch size for safety

    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        
        for (const candidate of batch) {
            try {
                // Double-check aggregate exists before deletion
                const hasAggregate = await validateAggregateExists(db, candidate);
                if (!hasAggregate) {
                    console.warn(`[cleanup] SKIP ${candidate.collection}:${candidate.id} - no aggregate found`);
                    continue;
                }

                await db.collection(candidate.collection).doc(candidate.id).delete();
                deletedCount++;
                console.log(`[cleanup] DELETED ${candidate.collection}:${candidate.id} (size: ${candidate.size})`);
            } catch (error) {
                console.error(`[cleanup] FAILED to delete ${candidate.collection}:${candidate.id}`, error);
            }
        }

        // Add a small delay between batches to avoid overwhelming Firestore
        if (i + batchSize < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return deletedCount;
}

async function main() {
    if (!getApps().length) {
        initializeApp();
    }

    const db = getFirestore();
    const dryRun = process.env.DRY_RUN !== '0';
    const confirm = process.env.CONFIRM_CLEANUP === '1';
    const maxDelete = parseInt(process.env.MAX_DELETE || '100', 10);

    if (!dryRun && !confirm) {
        console.error('[cleanup] ERROR: Non-dry-run requires CONFIRM_CLEANUP=1');
        process.exit(1);
    }

    console.log(`[cleanup] Starting Wave 4 cleanup - dryRun: ${dryRun}, confirm: ${confirm}, maxDelete: ${maxDelete}`);

    const targetCollections = [
        'neuralCrawlerResults',
        'semanticMapResults',
        'neuroseo-analyses', // legacy variant
        'neuroSeoAnalysis'   // legacy variant
    ];

    const summary: CleanupSummary = {
        generatedAt: new Date().toISOString(),
        dryRun,
        confirm,
        maxDelete,
        counts: {},
        candidates: []
    };

    // Collect candidates from each collection
    for (const collection of targetCollections) {
        try {
            console.log(`[cleanup] Scanning collection: ${collection}`);
            const { candidates, counts } = await collectMigratedDocuments(db, collection, maxDelete);
            
            summary.counts[collection] = counts;
            summary.candidates.push(...candidates);

            console.log(`[cleanup] ${collection}: scanned=${counts.scanned}, migrated:true=${counts.migratedTrue}, migrated:false=${counts.migratedFalse}, no-flag=${counts.noMigrationFlag}`);
        } catch (error) {
            console.error(`[cleanup] Failed to scan collection ${collection}`, error);
            summary.counts[collection] = {
                scanned: 0,
                migratedTrue: 0,
                migratedFalse: 0,
                noMigrationFlag: 0,
                deleted: 0
            };
        }
    }

    // Perform cleanup
    let totalDeleted = 0;
    if (summary.candidates.length > 0) {
        totalDeleted = await performCleanup(db, summary.candidates, dryRun, confirm);
        
        // Update deleted counts per collection
        for (const candidate of summary.candidates.slice(0, totalDeleted)) {
            summary.counts[candidate.collection].deleted++;
        }
    }

    console.log(`[cleanup] Summary: ${summary.candidates.length} candidates identified, ${totalDeleted} deleted`);

    // Write output file if specified
    const outputFile = process.env.OUTPUT_FILE;
    if (outputFile) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            fs.mkdirSync(path.dirname(outputFile), { recursive: true });
            fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
            console.log(`[cleanup] Wrote summary to ${outputFile}`);
        } catch (error) {
            console.error(`[cleanup] Failed to write output file ${outputFile}`, error);
        }
    }

    process.exit(0);
}

main().catch(error => {
    console.error('[cleanup] FATAL ERROR', error);
    process.exit(3);
});