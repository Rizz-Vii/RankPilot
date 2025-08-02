/**
 * Enhanced NeuroSEO™ Orchestrator with Caching
 * RankPilot - Advanced AI Service Optimization
 */

import { LRUCache } from 'lru-cache';
import { NeuroSEOSuite } from '../neuroseo';

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
}interface CachedResult {
    _data: unknown;
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
    private requestQueue: Map<string, Promise<any>>;
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
    async runAnalysis(_request: NeuroSEORequest): Promise<any> {
        const cacheKey = this.generateCacheKey(_request);

        // Check for existing request in progress
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }

        // Check cache first
        const cached = this.getCachedResult(cacheKey, request.userPlan);
        if (cached) {
            return cached;
        }

        // Check memory before proceeding
        await this.checkMemoryUsage();

        // Create new analysis promise
        const analysisPromise = this.performAnalysis(_request);
        this.requestQueue.set(cacheKey, analysisPromise);

        try {
            const result = await analysisPromise;

            // Cache the result
            this.setCachedResult(cacheKey, _result, request.userPlan);

            return result;
        } finally {
            // Remove from queue
            this.requestQueue.delete(cacheKey);
        }
    }

    /**
     * Generate cache key from request parameters
     */
    private generateCacheKey(_request: NeuroSEORequest): string {
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
    private getCachedResult(cacheKey: string, userPlan: string): any | null {
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
    private setCachedResult(cacheKey: string, _data: unknown, userPlan: string): void {
        const cachedResult: CachedResult = {
            _data,
            timestamp: Date.now(),
            userPlan,
        };

        this.cache.set(cacheKey, cachedResult);
    }

    /**
     * Perform actual NeuroSEO™ analysis with optimizations
     */
    private async performAnalysis(_request: NeuroSEORequest): Promise<any> {
        try {
            // Add performance monitoring
            const startTime = performance.now();

            // OPTIMIZATION 1: Parallel engine execution with Promise.all
            const result = await this.runOptimizedAnalysis(_request);

            const duration = performance.now() - startTime;

            // Log performance metrics
            this.logPerformanceMetrics({
                operation: 'neuroseo_analysis',
                duration,
                requestSize: JSON.stringify(_request).length,
                responseSize: JSON.stringify(_result).length,
            });

            return result;
        } catch (_error) {
            // Log error and provide fallback
            console.error('NeuroSEO Analysis Error:', _error);

            // Return cached result if available (any plan)
            const fallbackKey = this.generateCacheKey(_request);
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
    private async runOptimizedAnalysis(_request: NeuroSEORequest): Promise<any> {
        // OPTIMIZATION 1: Batch URLs for efficient processing
        const batchSize = this.getBatchSize(request.userPlan);
        const urlBatches = this.chunkArray(request.urls, batchSize);

        // OPTIMIZATION 2: Optimize keywords for token efficiency
        const optimizedKeywords = this.optimizeKeywords(request.targetKeywords);

        // OPTIMIZATION 3: Parallel execution of batches
        const batchResults = await Promise.all(
            urlBatches.map(async (urlBatch, _index) => {
                // Add controlled delay to prevent API rate limiting
                if (index > 0) {
                    await this.delay(100 * _index);
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
        return this.mergeOptimizedResults(batchResults, _request);
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
    private mergeOptimizedResults(batchResults: unknown[], _request: NeuroSEORequest): any {
        // OPTIMIZATION: Intelligent result merging to reduce redundancy
        const mergedResult = {
            summary: this.mergeSummaries(batchResults),
            engines: this.mergeEngineResults(batchResults),
            metadata: {
                totalUrls: request.urls.length,
                processedBatches: batchResults.length,
                optimizationApplied: true,
                timestamp: Date.now()
            }
        };

        return mergedResult;
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
    private mergeSummaries(batchResults: unknown[]): any {
        // Intelligent summary merging logic
        return batchResults.reduce((merged, batch) => {
            if (batch?.summary) {
                return {
                    ...merged,
                    totalAnalyzed: (merged.totalAnalyzed || 0) + (batch.summary.totalAnalyzed || 0),
                    averageScore: this.calculateWeightedAverage(merged.averageScore, batch.summary.averageScore),
                    insights: [...(merged.insights || []), ...(batch.summary.insights || [])]
                };
            }
            return merged;
        }, {});
    }

    /**
     * Merge engine results from batch results
     */
    private mergeEngineResults(batchResults: unknown[]): Record<string, unknown[]> {
        // Merge results from all engines across batches
        const engineResults: Record<string, unknown[]> = {};

        batchResults.forEach(batch => {
            if (batch?.engines) {
                Object.keys(batch.engines).forEach(engineName => {
                    if (!engineResults[engineName]) {
                        engineResults[engineName] = [];
                    }
                    engineResults[engineName].push(batch.engines[engineName]);
                });
            }
        });

        return engineResults;
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
        if (typeof window !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            const memoryStats: MemoryStats = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                threshold: this.memoryThreshold,
            };

            if (memoryStats.used > memoryStats.threshold) {
                console.warn('High memory usage detected, clearing cache');
                this.clearOldCache();

                // Force garbage collection if available
                if ('gc' in window) {
                    (window as any).gc();
                }
            }
        }
    }

    /**
     * Clear old cache entries
     */
    private clearOldCache(): void {
        const now = Date.now();
        const maxAge = this.cacheConfig.ttl / 2; // Clear entries older than half TTL

        this.cache.forEach((_value: CachedResult, _key: string) => {
            if (now - value.timestamp > maxAge) {
                this.cache.delete(_key);
            }
        });
    }    /**
     * Handle cache disposal
     */
    private onCacheDispose(_value: CachedResult, _key: string): void {
        // Log cache eviction for monitoring
        console.debug('Cache entry evicted:', _key);
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
        if (typeof window !== 'undefined' && 'gtag' in window) {
            (window as any).gtag('event', 'neuroseo_performance', {
                event_category: 'AI Performance',
                operation: metrics.operation,
                duration: Math.round(metrics.duration),
                request_size: metrics.requestSize,
                response_size: metrics.responseSize,
            });
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
            this.runAnalysis(_request).catch(error => {
                console.warn('Preload failed for _request:', _request, _error);
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
