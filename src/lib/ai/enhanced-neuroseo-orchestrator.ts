/**
 * Enhanced NeuroSEO™ Orchestrator with Caching
 * RankPilot - Advanced AI Service Optimization
 */

import { LRUCache } from 'lru-cache';
import { NeuroSEOSuite, type NeuroSEOReport, type KeyInsight } from '../neuroseo';

interface CacheConfig {
    max: number;
    ttl: number; // milliseconds
}

interface NeuroSEORequest {
    urls: string[];
    targetKeywords: string[];
    analysisType: 'comprehensive' | 'competitive' | 'seo-focused' | 'content-focused';
    userPlan: string;
    userId: string;
}

interface OptimizedMergedResult {
    summary: {
        totalAnalyzed: number;
        averageScore: number;
        insights: KeyInsight[];
    };
    engines: Record<string, unknown[]>; // Aggregated per-engine arrays
    metadata: {
        totalUrls: number;
        processedBatches: number;
        optimizationApplied: boolean;
        timestamp: number;
    };
    batches: NeuroSEOReport[]; // Raw batch reports (reference for drill‑down)
}

interface CachedResult {
    data: OptimizedMergedResult;
    timestamp: number;
    userPlan: string;
}

interface MemoryStats {
    used: number;
    total: number;
    threshold: number;
}

/**
 * Enhanced NeuroSEO™ Orchestrator with intelligent caching and memory optimization
 */
export class EnhancedNeuroSEOOrchestrator {
    private cache: LRUCache<string, CachedResult>;
    private neuroSEO: NeuroSEOSuite;
    private requestQueue: Map<string, Promise<OptimizedMergedResult>>;
    private memoryThreshold: number;
    private cacheConfig: CacheConfig;

    constructor(cacheConfig: CacheConfig = { max: 100, ttl: 30 * 60 * 1000 }) {
        this.cacheConfig = cacheConfig;
        this.cache = new LRUCache({
            max: cacheConfig.max,
            ttl: cacheConfig.ttl,
            dispose: this.onCacheDispose.bind(this),
        });

        this.neuroSEO = new NeuroSEOSuite();
        this.requestQueue = new Map();
        this.memoryThreshold = 100 * 1024 * 1024; // 100MB
    }

    /**
     * Run NeuroSEO™ analysis with intelligent caching
     */
    async runAnalysis(request: NeuroSEORequest): Promise<OptimizedMergedResult> {
        const cacheKey = this.generateCacheKey(request);

        // Check for existing request in progress
        if (this.requestQueue.has(cacheKey)) {
            const inFlight = this.requestQueue.get(cacheKey);
            if (inFlight) return inFlight;
        }

        // Check cache first
        const cached = this.getCachedResult(cacheKey, request.userPlan);
        if (cached) {
            return cached;
        }

        // Check memory before proceeding
        await this.checkMemoryUsage();

        // Create new analysis promise
        const analysisPromise = this.performAnalysis(request);
        this.requestQueue.set(cacheKey, analysisPromise);

        try {
            const result = await analysisPromise;

            // Cache the result
            this.setCachedResult(cacheKey, result, request.userPlan);

            return result;
        } finally {
            // Remove from queue
            this.requestQueue.delete(cacheKey);
        }
    }

    /**
     * Generate cache key from request parameters
     */
    private generateCacheKey(request: NeuroSEORequest): string {
        const keyData = {
            urls: request.urls.sort(),
            keywords: request.targetKeywords.sort(),
            type: request.analysisType,
        };

        return Buffer.from(JSON.stringify(keyData)).toString('base64');
    }

    /**
     * Get cached result with plan-based validation
     */
    private getCachedResult(cacheKey: string, userPlan: string): OptimizedMergedResult | null {
        const cached = this.cache.get(cacheKey);

        if (!cached) return null;

        // Validate plan compatibility (higher plans can use lower plan cache)
        const planHierarchy = ['free', 'starter', 'agency', 'enterprise', 'admin'];
        const cachedPlanIndex = planHierarchy.indexOf(cached.userPlan);
        const requestPlanIndex = planHierarchy.indexOf(userPlan);

        if (requestPlanIndex >= cachedPlanIndex) {
            return cached.data;
        }

        return null;
    }

    /**
     * Set cached result with metadata
     */
    private setCachedResult(cacheKey: string, data: OptimizedMergedResult, userPlan: string): void {
        const cachedResult: CachedResult = {
            data,
            timestamp: Date.now(),
            userPlan,
        };

        this.cache.set(cacheKey, cachedResult);
    }

    /**
     * Perform actual NeuroSEO™ analysis with optimizations
     */
    private async performAnalysis(request: NeuroSEORequest): Promise<OptimizedMergedResult> {
        try {
            // Add performance monitoring
            const startTime = performance.now();

            // OPTIMIZATION 1: Parallel engine execution with Promise.all
            const result = await this.runOptimizedAnalysis(request);

            const duration = performance.now() - startTime;

            // Log performance metrics
            this.logPerformanceMetrics({
                operation: 'neuroseo_analysis',
                duration,
                requestSize: JSON.stringify(request).length,
                responseSize: JSON.stringify(result).length,
            });

            return result;
        } catch (error) {
            // Log error and provide fallback
            console.error('NeuroSEO Analysis Error:', error);

            // Return cached result if available (any plan)
            const fallbackKey = this.generateCacheKey(request);
            const fallback = this.cache.get(fallbackKey);

            if (fallback) {
                console.warn('Using cached fallback for failed analysis');
                return fallback.data;
            }

            throw error;
        }
    }

    /**
     * OPTIMIZATION: Run analysis with parallel engine execution and token efficiency
     */
    private async runOptimizedAnalysis(request: NeuroSEORequest): Promise<OptimizedMergedResult> {
        // OPTIMIZATION 1: Batch URLs for efficient processing
        const batchSize = this.getBatchSize(request.userPlan);
        const urlBatches = this.chunkArray(request.urls, batchSize);

        // OPTIMIZATION 2: Optimize keywords for token efficiency
        const optimizedKeywords = this.optimizeKeywords(request.targetKeywords);

        // OPTIMIZATION 3: Parallel execution of batches
        const batchResults = await Promise.all(
            urlBatches.map(async (urlBatch, index) => {
                // Add controlled delay to prevent API rate limiting
                if (index > 0) {
                    await this.delay(100 * index);
                }

                return this.neuroSEO.runAnalysis({
                    urls: urlBatch,
                    targetKeywords: optimizedKeywords,
                    analysisType: request.analysisType,
                    userPlan: request.userPlan,
                    userId: request.userId,
                });
            })
        );

        // OPTIMIZATION 4: Intelligent result merging
        return this.mergeOptimizedResults(batchResults, request);
    }

    /**
     * Get optimal batch size based on user plan
     */
    private getBatchSize(userPlan: string): number {
        const batchSizes = {
            'free': 2,
            'starter': 5,
            'agency': 10,
            'enterprise': 20,
            'admin': 50
        };
        return batchSizes[userPlan as keyof typeof batchSizes] || 5;
    }

    /**
     * Optimize keywords for token efficiency (40% reduction target)
     */
    private optimizeKeywords(keywords: string[]): string[] {
        // Remove duplicates and normalize
        const uniqueKeywords = Array.from(new Set(keywords.map(k => k.toLowerCase().trim())));

        // Limit based on efficiency analysis (reduce token usage)
        const maxKeywords = 20; // Optimization: reduced from unlimited

        // Prioritize shorter, more specific keywords for better token efficiency
        return uniqueKeywords
            .filter(k => k.length > 2 && k.length < 50) // Filter out too short/long
            .sort((a, b) => a.length - b.length) // Prioritize shorter keywords
            .slice(0, maxKeywords);
    }

    /**
     * Merge optimized results with intelligent deduplication
     */
    private mergeOptimizedResults(batchResults: NeuroSEOReport[], request: NeuroSEORequest): OptimizedMergedResult {
        return {
            summary: this.mergeSummaries(batchResults),
            engines: this.mergeEngineResults(batchResults),
            metadata: {
                totalUrls: request.urls.length,
                processedBatches: batchResults.length,
                optimizationApplied: true,
                timestamp: Date.now()
            },
            batches: batchResults
        };
    }

    /**
     * Utility: Chunk array into smaller arrays
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Utility: Controlled delay for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Merge summaries from batch results
     */
    private mergeSummaries(batchResults: NeuroSEOReport[]): OptimizedMergedResult['summary'] {
        let totalAnalyzed = 0;
        let scoreAccumulator = 0;
        const insights: KeyInsight[] = [];
        batchResults.forEach(r => {
            totalAnalyzed += r.crawlResults.length;
            scoreAccumulator += r.overallScore;
            if (Array.isArray(r.keyInsights)) insights.push(...r.keyInsights);
        });
        const averageScore = batchResults.length ? Math.round(scoreAccumulator / batchResults.length) : 0;
        // Deduplicate insights by title to avoid repetition
        const seen = new Set<string>();
        const deduped = insights.filter(i => {
            if (seen.has(i.title)) return false;
            seen.add(i.title);
            return true;
        }).slice(0, 100); // cap to prevent runaway growth
        return { totalAnalyzed, averageScore, insights: deduped };
    }

    /**
     * Merge engine results from batch results
     */
    private mergeEngineResults(batchResults: NeuroSEOReport[]): Record<string, unknown[]> {
        // Aggregate per-engine style arrays from the canonical report fields
        const engines: Record<string, unknown[]> = {
            crawl: [],
            semantic: [],
            visibility: [],
            trust: [],
            rewrite: [],
            engagement: []
        };
        batchResults.forEach(r => {
            engines.crawl.push(...r.crawlResults);
            engines.semantic.push(...r.semanticAnalysis);
            engines.visibility.push(...r.visibilityAnalysis);
            engines.trust.push(...r.trustAnalysis);
            if (r.rewriteRecommendations) engines.rewrite.push(...r.rewriteRecommendations);
            if (r.engagementAnalysis) engines.engagement.push(...r.engagementAnalysis);
        });
        return engines;
    }

    /**
     * Calculate weighted average for score merging
     */
    private calculateWeightedAverage(score1: number, score2: number): number {
        if (!score1) return score2 || 0;
        if (!score2) return score1 || 0;
        return (score1 + score2) / 2;
    }

    /**
     * Check memory usage and clear cache if needed
     */
    private async checkMemoryUsage(): Promise<void> {
        // Narrowly check for the non-standard performance.memory shape without using `any`
        type PerfWithMemory = { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } };
        const perf = globalThis as unknown as PerfWithMemory;
        const mem = perf?.memory;
        if (!mem || typeof mem.usedJSHeapSize !== 'number' || typeof mem.totalJSHeapSize !== 'number') {
            return;
        }

        const memoryStats: MemoryStats = {
            used: mem.usedJSHeapSize,
            total: mem.totalJSHeapSize,
            threshold: this.memoryThreshold,
        };

        if (memoryStats.used > memoryStats.threshold) {
            console.warn('High memory usage detected, clearing cache');
            this.clearOldCache();

            // Force garbage collection if available (some runtimes expose globalThis.gc)
            const globalObj = globalThis as unknown as { gc?: () => void };
            if (typeof globalObj.gc === 'function') {
                try { globalObj.gc(); } catch {/* ignore */ }
            }
        }
    }

    /**
     * Clear old cache entries
     */
    private clearOldCache(): void {
        const now = Date.now();
        const maxAge = this.cacheConfig.ttl / 2; // Clear entries older than half TTL

        this.cache.forEach((value: CachedResult, key: string) => {
            if (now - value.timestamp > maxAge) {
                this.cache.delete(key);
            }
        });
    }    /**
     * Handle cache disposal
     */
    private onCacheDispose(_value: CachedResult, key: string): void {
        // Log cache eviction for monitoring
        console.debug('Cache entry evicted:', key);
    }

    /**
     * Log performance metrics
     */
    private logPerformanceMetrics(metrics: {
        operation: string;
        duration: number;
        requestSize: number;
        responseSize: number;
    }): void {
        // Use globalThis and a narrow type to avoid `any` casts while preserving runtime guard
        const gobj = globalThis as unknown as { gtag?: (...args: unknown[]) => void };
        const gtag = gobj.gtag;
        if (typeof gtag === 'function') {
            try {
                gtag('event', 'neuroseo_performance', {
                    event_category: 'AI Performance',
                    operation: metrics.operation,
                    duration: Math.round(metrics.duration),
                    request_size: metrics.requestSize,
                    response_size: metrics.responseSize,
                });
            } catch (e) {
                // Don't allow analytics failures to bubble up
                console.debug('gtag call failed', e);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            max: this.cache.max,
            hitRate: this.cache.calculatedSize / this.cache.max,
            memoryUsage: this.cache.calculatedSize,
        };
    }

    /**
     * Clear all cache
     */
    clearCache(): void {
        this.cache.clear();
        this.requestQueue.clear();
    }

    /**
     * Preload analysis for common requests
     */
    async preloadAnalysis(requests: NeuroSEORequest[]): Promise<void> {
        const preloadPromises = requests.map(request =>
            this.runAnalysis(request).catch(error => {
                console.warn('Preload failed for request:', request, error);
            })
        );

        await Promise.allSettled(preloadPromises);
    }
}

/**
 * Global orchestrator instance
 */
export const neuroSEOOrchestrator = new EnhancedNeuroSEOOrchestrator({
    max: 50, // Reduced for production
    ttl: 15 * 60 * 1000, // 15 minutes
});

/**
 * React hook for NeuroSEO™ with caching
 */
export function useNeuroSEO() {
    return {
        runAnalysis: neuroSEOOrchestrator.runAnalysis.bind(neuroSEOOrchestrator),
        getCacheStats: neuroSEOOrchestrator.getCacheStats.bind(neuroSEOOrchestrator),
        clearCache: neuroSEOOrchestrator.clearCache.bind(neuroSEOOrchestrator),
        preloadAnalysis: neuroSEOOrchestrator.preloadAnalysis.bind(neuroSEOOrchestrator),
    };
}
