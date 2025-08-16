/**
 * Wave 4: Dual-Read Fallback Utilities for SEO Documents
 * 
 * Provides standardized dual-read patterns for SEO document collections:
 * - First attempt: read from aggregate collection
 * - Fallback: read from original collection if aggregate not found
 * - Comprehensive error handling and metrics tracking
 */

import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    getDoc, 
    doc,
    QueryConstraint 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DualReadConfig {
    originalCollection: string;
    aggregateCollection: string;
    userId: string;
    matchCriteria: {
        url?: string;
        historyId?: string;
        hashKey?: string;
        urls?: string[];
    };
    limitResults?: number;
}

export interface DualReadResult<T = any> {
    data: T | null;
    source: 'aggregate' | 'original' | 'not_found';
    fallbackUsed: boolean;
    error?: string;
}

export interface DualReadMetrics {
    aggregateHits: number;
    originalFallbacks: number;
    notFound: number;
    errors: number;
}

// Global metrics tracking
const metrics: DualReadMetrics = {
    aggregateHits: 0,
    originalFallbacks: 0,
    notFound: 0,
    errors: 0
};

/**
 * Record metrics for monitoring dual-read performance
 */
export function recordDualReadMetric(type: keyof DualReadMetrics) {
    metrics[type]++;
}

/**
 * Get current dual-read metrics snapshot
 */
export function getDualReadMetrics(): DualReadMetrics {
    return { ...metrics };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetDualReadMetrics() {
    metrics.aggregateHits = 0;
    metrics.originalFallbacks = 0;
    metrics.notFound = 0;
    metrics.errors = 0;
}

/**
 * Build query constraints based on match criteria
 */
function buildQueryConstraints(config: DualReadConfig): QueryConstraint[] {
    const constraints: QueryConstraint[] = [
        where('userId', '==', config.userId)
    ];
    
    const { matchCriteria } = config;
    
    if (matchCriteria.url) {
        constraints.push(where('url', '==', matchCriteria.url));
    }
    
    if (matchCriteria.historyId) {
        constraints.push(where('historyId', '==', matchCriteria.historyId));
    }
    
    if (matchCriteria.hashKey) {
        constraints.push(where('hashKey', '==', matchCriteria.hashKey));
    }
    
    if (matchCriteria.urls && matchCriteria.urls.length > 0) {
        // For URL arrays, search for documents containing the first URL
        constraints.push(where('urls', 'array-contains', matchCriteria.urls[0]));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    if (config.limitResults) {
        constraints.push(limit(config.limitResults));
    }
    
    return constraints;
}

/**
 * Attempt to read from aggregate collection first
 */
async function readFromAggregate<T>(config: DualReadConfig): Promise<T | null> {
    try {
        const constraints = buildQueryConstraints(config);
        const q = query(collection(db, config.aggregateCollection), ...constraints);
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            recordDualReadMetric('aggregateHits');
            console.debug('[dualRead] Aggregate hit', { 
                collection: config.aggregateCollection,
                criteria: config.matchCriteria 
            });
            return snapshot.docs[0].data() as T;
        }
        
        return null;
    } catch (error) {
        console.warn('[dualRead] Aggregate query failed', {
            collection: config.aggregateCollection,
            error: (error as any)?.message
        });
        return null;
    }
}

/**
 * Fallback to reading from original collection
 */
async function readFromOriginal<T>(config: DualReadConfig): Promise<T | null> {
    try {
        const constraints = buildQueryConstraints(config);
        const q = query(collection(db, config.originalCollection), ...constraints);
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            recordDualReadMetric('originalFallbacks');
            console.info('[dualRead] Original fallback used', {
                originalCollection: config.originalCollection,
                aggregateCollection: config.aggregateCollection,
                criteria: config.matchCriteria
            });
            return snapshot.docs[0].data() as T;
        }
        
        return null;
    } catch (error) {
        console.error('[dualRead] Original query failed', {
            collection: config.originalCollection,
            error: (error as any)?.message
        });
        throw error;
    }
}

/**
 * Main dual-read function - tries aggregate first, falls back to original
 */
export async function dualReadSEODocument<T = any>(config: DualReadConfig): Promise<DualReadResult<T>> {
    try {
        // First attempt: read from aggregate
        const aggregateResult = await readFromAggregate<T>(config);
        if (aggregateResult) {
            return {
                data: aggregateResult,
                source: 'aggregate',
                fallbackUsed: false
            };
        }
        
        // Fallback: read from original
        const originalResult = await readFromOriginal<T>(config);
        if (originalResult) {
            return {
                data: originalResult,
                source: 'original',
                fallbackUsed: true
            };
        }
        
        // Not found in either collection
        recordDualReadMetric('notFound');
        return {
            data: null,
            source: 'not_found',
            fallbackUsed: true
        };
        
    } catch (error) {
        recordDualReadMetric('errors');
        return {
            data: null,
            source: 'not_found',
            fallbackUsed: true,
            error: (error as any)?.message || 'Unknown error'
        };
    }
}

/**
 * Specialized dual-read for NeuroSEO analyses
 */
export async function readNeuroSeoAnalysis(
    userId: string, 
    criteria: { hashKey?: string; urls?: string[] }
): Promise<DualReadResult> {
    return dualReadSEODocument({
        originalCollection: 'neuroSeoAnalyses',
        aggregateCollection: 'neuroSeoAnalysesAgg',
        userId,
        matchCriteria: criteria,
        limitResults: 1
    });
}

/**
 * Specialized dual-read for semantic map results
 */
export async function readSemanticMapResult(
    userId: string,
    criteria: { url?: string }
): Promise<DualReadResult> {
    return dualReadSEODocument({
        originalCollection: 'semanticMapResults',
        aggregateCollection: 'semanticMapResultsAgg', 
        userId,
        matchCriteria: criteria,
        limitResults: 1
    });
}

/**
 * Specialized dual-read for neural crawler results
 */
export async function readNeuralCrawlerResult(
    userId: string,
    criteria: { historyId?: string; url?: string }
): Promise<DualReadResult> {
    return dualReadSEODocument({
        originalCollection: 'neuralCrawlerResults',
        aggregateCollection: 'neuralCrawlerResultsAgg',
        userId,
        matchCriteria: criteria,
        limitResults: 1
    });
}

/**
 * Get multiple SEO documents with dual-read fallback
 */
export async function readMultipleSEODocuments<T = any>(
    configs: DualReadConfig[]
): Promise<DualReadResult<T>[]> {
    const results = await Promise.allSettled(
        configs.map(config => dualReadSEODocument<T>(config))
    );
    
    return results.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            recordDualReadMetric('errors');
            return {
                data: null,
                source: 'not_found' as const,
                fallbackUsed: true,
                error: result.reason?.message || 'Promise rejected'
            };
        }
    });
}

/**
 * Utility to convert aggregate back to legacy format for compatibility
 */
export function aggregateToLegacyFormat(aggregateDoc: any, collection: string): any {
    if (!aggregateDoc) return null;
    
    switch (collection) {
        case 'neuralCrawlerResultsAgg':
            return {
                ...aggregateDoc,
                // Reconstruct arrays as empty arrays with counts for compatibility
                images: new Array(aggregateDoc.imagesCount || 0).fill({}),
                issues: new Array(aggregateDoc.issuesCount || 0).fill({}),
                entities: new Array(aggregateDoc.entitiesCount || 0).fill({}),
                links: [
                    ...new Array(aggregateDoc.linksInternal || 0).fill({ type: 'internal' }),
                    ...new Array(aggregateDoc.linksExternal || 0).fill({ type: 'external' })
                ],
                // Convert heading counts back to arrays
                headings: aggregateDoc.headings ? Object.fromEntries(
                    Object.entries(aggregateDoc.headings).map(([key, count]) => [
                        key, 
                        new Array(count as number).fill(`${key} heading`)
                    ])
                ) : {}
            };
            
        case 'semanticMapResultsAgg':
            return {
                ...aggregateDoc,
                // Expand top items back to full arrays for compatibility
                topicClusters: aggregateDoc.topTopicClusters || [],
                keywordAnalysis: aggregateDoc.topKeywords || [],
                semanticGraph: {
                    nodes: new Array(aggregateDoc.graphNodesCount || 0).fill({}),
                    edges: new Array(aggregateDoc.graphEdgesCount || 0).fill({})
                },
                recommendations: new Array(aggregateDoc.recommendationsCount || 0).fill({})
            };
            
        case 'neuroSeoAnalysesAgg':
            return {
                ...aggregateDoc,
                // Keep compact format as-is since it's already optimized
                topKeywords: aggregateDoc.topKeywords || [],
                topGaps: aggregateDoc.topGaps || []
            };
            
        default:
            return aggregateDoc;
    }
}