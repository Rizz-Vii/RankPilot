/**
 * Multi-Region Database Sharding Manager
 * DevNext Part III Step 2: Database Optimization for 10,000+ Users
 */

export interface ShardingStrategy {
    type: 'geographic' | 'user-tier' | 'temporal' | 'hybrid';
    shardKey: string;
    shards: Shard[];
    replicationFactor: number;
    consistencyLevel: 'strong' | 'eventual' | 'weak';
}

export interface Shard {
    id: string;
    regions?: string[];
    filter?: string;
    capacity: {
        maxDocuments: number;
        maxQueriesPerSecond: number;
        maxStorageGB: number;
    };
    performance: {
        averageLatency: number;
        throughput: number;
        utilization: number;
    };
}

export interface FirestoreQuery {
    collection: string;
    filters: QueryFilter[];
    orderBy?: { field: string; direction: 'asc' | 'desc'; }[];
    limit?: number;
    startAfter?: unknown;
    endBefore?: unknown;
    select?: string[]; // optional field projection (added for optimization typing)
}

export interface QueryFilter {
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
    value: string | number | boolean | Array<string | number | boolean> | null;
}

// Generic Firestore document representation using unknown to avoid any
export type FirestoreDocument = Record<string, unknown> & { id?: string };

export interface ShardedQueryResult {
    documents: FirestoreDocument[];
    totalDocuments: number;
    queriedShards: string[];
    aggregatedLatency: number;
    consistency: 'strong' | 'eventual' | 'weak';
}

export interface QueryOptimization {
    originalQuery: FirestoreQuery;
    optimizedQuery: FirestoreQuery;
    estimatedImprovement: {
        latencyReduction: number;
        costReduction: number;
        throughputIncrease: number;
    };
    recommendedIndexes: IndexRecommendation[];
}

export interface IndexRecommendation {
    collection: string;
    fields: { field: string; order?: 'asc' | 'desc'; }[];
    type: 'single' | 'composite';
    priority: 'high' | 'medium' | 'low';
    estimatedBenefit: {
        querySpeedup: number;
        costSavings: number;
    };
}

/**
 * Advanced Firestore Sharding Manager for Enterprise Scale
 */
export class EnterpriseFirestoreSharding {
    private shardingStrategies: Map<string, ShardingStrategy> = new Map();
    private queryCache: Map<string, { result: unknown; timestamp: number; ttl: number; }> = new Map();
    private performanceMetrics: Map<string, QueryMetrics> = new Map();

    constructor() {
        this.initializeShardingStrategies();
    }

    /**
     * Initialize enterprise-grade sharding strategies
     */
    private initializeShardingStrategies(): void {
        // User data sharding by geographic region and tier
        this.shardingStrategies.set('users', {
            type: 'hybrid',
            shardKey: 'region_tier',
            shards: [
                {
                    id: 'apac_enterprise',
                    regions: ['australia-southeast2', 'asia-northeast1'],
                    filter: 'region=apac&tier=enterprise',
                    capacity: {
                        maxDocuments: 100000,
                        maxQueriesPerSecond: 1000,
                        maxStorageGB: 500
                    },
                    performance: {
                        averageLatency: 15,
                        throughput: 800,
                        utilization: 45
                    }
                },
                {
                    id: 'apac_standard',
                    regions: ['australia-southeast2', 'asia-northeast1'],
                    filter: 'region=apac&tier!=enterprise',
                    capacity: {
                        maxDocuments: 500000,
                        maxQueriesPerSecond: 2000,
                        maxStorageGB: 1000
                    },
                    performance: {
                        averageLatency: 25,
                        throughput: 1500,
                        utilization: 65
                    }
                },
                {
                    id: 'americas_enterprise',
                    regions: ['us-central1', 'us-east1'],
                    filter: 'region=americas&tier=enterprise',
                    capacity: {
                        maxDocuments: 150000,
                        maxQueriesPerSecond: 1200,
                        maxStorageGB: 750
                    },
                    performance: {
                        averageLatency: 20,
                        throughput: 900,
                        utilization: 50
                    }
                },
                {
                    id: 'americas_standard',
                    regions: ['us-central1', 'us-east1'],
                    filter: 'region=americas&tier!=enterprise',
                    capacity: {
                        maxDocuments: 750000,
                        maxQueriesPerSecond: 2500,
                        maxStorageGB: 1500
                    },
                    performance: {
                        averageLatency: 30,
                        throughput: 2000,
                        utilization: 70
                    }
                },
                {
                    id: 'europe_all',
                    regions: ['europe-west1', 'europe-central2'],
                    filter: 'region=europe',
                    capacity: {
                        maxDocuments: 400000,
                        maxQueriesPerSecond: 1800,
                        maxStorageGB: 800
                    },
                    performance: {
                        averageLatency: 22,
                        throughput: 1400,
                        utilization: 55
                    }
                }
            ],
            replicationFactor: 2,
            consistencyLevel: 'strong'
        });

        // NeuroSEO analyses sharding by recency and complexity
        this.shardingStrategies.set('neuroSeoAnalyses', {
            type: 'temporal',
            shardKey: 'date_complexity',
            shards: [
                {
                    id: 'recent_enterprise',
                    filter: 'date>30d&complexity=enterprise',
                    capacity: {
                        maxDocuments: 50000,
                        maxQueriesPerSecond: 500,
                        maxStorageGB: 2000
                    },
                    performance: {
                        averageLatency: 10,
                        throughput: 400,
                        utilization: 60
                    }
                },
                {
                    id: 'recent_standard',
                    filter: 'date>30d&complexity!=enterprise',
                    capacity: {
                        maxDocuments: 200000,
                        maxQueriesPerSecond: 1000,
                        maxStorageGB: 1000
                    },
                    performance: {
                        averageLatency: 20,
                        throughput: 800,
                        utilization: 70
                    }
                },
                {
                    id: 'archive_hot',
                    filter: 'date<=30d&date>90d',
                    capacity: {
                        maxDocuments: 500000,
                        maxQueriesPerSecond: 300,
                        maxStorageGB: 3000
                    },
                    performance: {
                        averageLatency: 40,
                        throughput: 250,
                        utilization: 40
                    }
                },
                {
                    id: 'archive_cold',
                    filter: 'date<=90d',
                    capacity: {
                        maxDocuments: 2000000,
                        maxQueriesPerSecond: 100,
                        maxStorageGB: 5000
                    },
                    performance: {
                        averageLatency: 100,
                        throughput: 80,
                        utilization: 30
                    }
                }
            ],
            replicationFactor: 3,
            consistencyLevel: 'eventual'
        });

        // Keywords sharding by frequency and user tier
        this.shardingStrategies.set('keywords', {
            type: 'hybrid',
            shardKey: 'tier_frequency',
            shards: [
                {
                    id: 'enterprise_high_volume',
                    filter: 'tier=enterprise&volume>1000',
                    capacity: {
                        maxDocuments: 1000000,
                        maxQueriesPerSecond: 2000,
                        maxStorageGB: 500
                    },
                    performance: {
                        averageLatency: 8,
                        throughput: 1800,
                        utilization: 75
                    }
                },
                {
                    id: 'enterprise_standard',
                    filter: 'tier=enterprise&volume<=1000',
                    capacity: {
                        maxDocuments: 500000,
                        maxQueriesPerSecond: 1000,
                        maxStorageGB: 250
                    },
                    performance: {
                        averageLatency: 12,
                        throughput: 900,
                        utilization: 65
                    }
                },
                {
                    id: 'agency_tier',
                    filter: 'tier=agency',
                    capacity: {
                        maxDocuments: 2000000,
                        maxQueriesPerSecond: 1500,
                        maxStorageGB: 750
                    },
                    performance: {
                        averageLatency: 18,
                        throughput: 1200,
                        utilization: 80
                    }
                },
                {
                    id: 'starter_free',
                    filter: 'tier=starter|tier=free',
                    capacity: {
                        maxDocuments: 5000000,
                        maxQueriesPerSecond: 800,
                        maxStorageGB: 1000
                    },
                    performance: {
                        averageLatency: 35,
                        throughput: 600,
                        utilization: 85
                    }
                }
            ],
            replicationFactor: 2,
            consistencyLevel: 'eventual'
        });
    }

    /**
     * Route query to optimal shards based on sharding strategy
     */
    async routeQuery(
        collection: string,
        query: FirestoreQuery,
        userContext?: {
            tier: string;
            region: string;
            userId: string;
        }
    ): Promise<ShardedQueryResult> {
        const strategy = this.shardingStrategies.get(collection);
        if (!strategy) {
            throw new Error(`No sharding strategy defined for collection: ${collection}`);
        }

        // Determine target shards based on query and strategy
        const targetShards = await this.determineTargetShards(strategy, query, userContext);

        if (targetShards.length === 0) {
            throw new Error(`No suitable shards found for query on collection: ${collection}`);
        }

        // Execute parallel queries across shards
        const shardQueries: Promise<{
            documents: FirestoreDocument[];
            count: number;
            latency: number;
            shardId: string;
        }>[] = targetShards.map(shard => this.executeShardQuery(shard, query));

        const startTime = Date.now();
        const results = await Promise.allSettled(shardQueries);
        const endTime = Date.now();

        // Process results and handle failures
        const successfulResults = results
            .filter((result): result is PromiseFulfilledResult<{
                documents: FirestoreDocument[];
                count: number;
                latency: number;
                shardId: string;
            }> => result.status === 'fulfilled')
            .map(result => result.value);

        const failedResults = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map(result => result.reason);

        if (failedResults.length > 0) {
            console.warn(`Some shard queries failed:`, failedResults);
        }

        // Merge and sort results
        const mergedResult = await this.mergeShardResults(successfulResults, query);

        // Track performance metrics
        await this.trackQueryPerformance(collection, targetShards.map(s => s.id), endTime - startTime);

        return {
            documents: mergedResult.documents,
            totalDocuments: mergedResult.totalCount,
            queriedShards: targetShards.map(s => s.id),
            aggregatedLatency: endTime - startTime,
            consistency: strategy.consistencyLevel
        };
    }

    /**
     * Optimize query for better performance
     */
    async optimizeQuery(
        collection: string,
        query: FirestoreQuery,
        userContext?: {
            tier: string;
            region: string;
            expectedResultSize: number;
        }
    ): Promise<QueryOptimization> {
        const originalQuery = { ...query };
        const optimizedQuery = { ...query };

        // Apply tier-based optimizations
        if (userContext?.tier) {
            optimizedQuery.filters = this.applyTierOptimizations(query.filters, userContext.tier);
        }

        // Add intelligent limit based on expected result size
        if (!query.limit && userContext?.expectedResultSize) {
            optimizedQuery.limit = Math.min(
                userContext.expectedResultSize * 1.2, // 20% buffer
                this.getMaxLimitForTier(userContext.tier)
            );
        }

        // Optimize field selection for large documents
        if (collection === 'neuroSeoAnalyses' && userContext?.expectedResultSize && userContext.expectedResultSize > 100) {
            // Add field selection for large result sets
            (optimizedQuery as FirestoreQuery).select = this.getEssentialFields(collection, userContext.tier);
        }

        // Generate index recommendations
        const indexRecommendations = await this.generateIndexRecommendations(collection, optimizedQuery);

        // Estimate performance improvement
        const estimatedImprovement = this.estimateOptimizationBenefit(
            originalQuery,
            optimizedQuery,
            userContext
        );

        return {
            originalQuery,
            optimizedQuery,
            estimatedImprovement,
            recommendedIndexes: indexRecommendations
        };
    }

    /**
     * Generate intelligent index recommendations
     */
    async generateIndexRecommendations(
        collection: string,
        query: FirestoreQuery
    ): Promise<IndexRecommendation[]> {
        const recommendations: IndexRecommendation[] = [];

        // Analyze filter combinations
        const filterFields = query.filters.map(f => f.field);
        const uniqueFields = [...new Set(filterFields)];

        // Single field indexes for equality filters
        const equalityFilters = query.filters.filter(f => f.operator === '==');
        for (const filter of equalityFilters) {
            recommendations.push({
                collection,
                fields: [{ field: filter.field }],
                type: 'single',
                priority: 'high',
                estimatedBenefit: {
                    querySpeedup: 0.6, // 60% improvement
                    costSavings: 0.3   // 30% cost reduction
                }
            });
        }

        // Composite indexes for multiple filters
        if (uniqueFields.length > 1) {
            const compositeFields: { field: string; order?: 'asc' | 'desc'; }[] =
                uniqueFields.map(field => ({ field }));

            // Add ordering if present
            if (query.orderBy && query.orderBy.length > 0) {
                for (const order of query.orderBy) {
                    const existingField = compositeFields.find(f => f.field === order.field);
                    if (existingField) {
                        existingField.order = order.direction as 'asc' | 'desc';
                    } else {
                        compositeFields.push({
                            field: order.field,
                            order: order.direction as 'asc' | 'desc'
                        });
                    }
                }
            }

            recommendations.push({
                collection,
                fields: compositeFields,
                type: 'composite',
                priority: 'high',
                estimatedBenefit: {
                    querySpeedup: 0.8, // 80% improvement
                    costSavings: 0.5   // 50% cost reduction
                }
            });
        }

        // Range query optimizations
        const rangeFilters = query.filters.filter(f =>
            ['<', '<=', '>', '>='].includes(f.operator)
        );

        for (const filter of rangeFilters) {
            recommendations.push({
                collection,
                fields: [{ field: filter.field }],
                type: 'single',
                priority: 'medium',
                estimatedBenefit: {
                    querySpeedup: 0.4, // 40% improvement
                    costSavings: 0.2   // 20% cost reduction
                }
            });
        }

        return recommendations;
    }

    /**
     * Monitor and rebalance shards based on performance
     */
    async rebalanceShards(collection: string): Promise<{
        rebalancingPlan: RebalancingPlan;
        estimatedImpact: {
            performanceImprovement: number;
            migrationTime: number;
            downtime: number;
        };
    }> {
        const strategy = this.shardingStrategies.get(collection);
        if (!strategy) {
            throw new Error(`No sharding strategy for collection: ${collection}`);
        }

        // Analyze current shard performance
        const shardAnalysis = await this.analyzeShardPerformance(strategy.shards);

        // Identify imbalances
        const imbalances = this.identifyShardImbalances(shardAnalysis);

        // Generate rebalancing plan
        const rebalancingPlan = await this.generateRebalancingPlan(strategy, imbalances);

        // Estimate impact
        const estimatedImpact = this.estimateRebalancingImpact(rebalancingPlan);

        return {
            rebalancingPlan,
            estimatedImpact
        };
    }

    /**
     * Get comprehensive sharding performance metrics
     */
    async getShardingMetrics(collection?: string): Promise<{
        overallPerformance: {
            averageLatency: number;
            totalThroughput: number;
            errorRate: number;
            utilizationDistribution: number[];
        };
        shardMetrics: Array<{
            shardId: string;
            collection: string;
            performance: ShardPerformanceMetrics;
            health: 'excellent' | 'good' | 'fair' | 'poor';
            recommendations: string[];
        }>;
        rebalancingOpportunities: RebalancingOpportunity[];
    }> {
        const collections = collection ? [collection] : Array.from(this.shardingStrategies.keys());

        const allShardMetrics: Array<{
            shardId: string;
            collection: string;
            performance: ShardPerformanceMetrics;
            health: 'excellent' | 'good' | 'fair' | 'poor';
            recommendations: string[];
        }> = [];
        let totalLatency = 0;
        let totalThroughput = 0;
        let totalErrors = 0;
        const utilizationValues: number[] = [];

        for (const coll of collections) {
            const strategy = this.shardingStrategies.get(coll);
            if (!strategy) continue;

            for (const shard of strategy.shards) {
                const metrics = await this.getShardPerformanceMetrics(shard.id);
                const health = this.assessShardHealth(metrics);
                const recommendations = this.generateShardRecommendations(metrics, health);

                allShardMetrics.push({
                    shardId: shard.id,
                    collection: coll,
                    performance: metrics,
                    health,
                    recommendations
                });

                totalLatency += metrics.averageLatency;
                totalThroughput += metrics.throughput;
                totalErrors += metrics.errorCount;
                utilizationValues.push(metrics.utilization);
            }
        }

        const shardCount = allShardMetrics.length;

        return {
            overallPerformance: {
                averageLatency: totalLatency / shardCount,
                totalThroughput,
                errorRate: totalErrors / shardCount,
                utilizationDistribution: utilizationValues
            },
            shardMetrics: allShardMetrics,
            rebalancingOpportunities: await this.identifyRebalancingOpportunities(collections)
        };
    }

    // Private helper methods
    private async determineTargetShards(
        strategy: ShardingStrategy,
        query: FirestoreQuery,
        userContext?: { [k: string]: unknown; tier?: string; region?: string; userId?: string }
    ): Promise<Shard[]> {
        const candidateShards: Shard[] = [];

        for (const shard of strategy.shards) {
            if (this.shardMatchesQuery(shard, query, userContext)) {
                candidateShards.push(shard);
            }
        }

        // If no specific matches, query all shards (broadcast query)
        return candidateShards.length > 0 ? candidateShards : strategy.shards;
    }

    private shardMatchesQuery(shard: Shard, query: FirestoreQuery, userContext?: { [k: string]: unknown }): boolean {
        if (!shard.filter) return true;

        // Parse shard filter and match against query
        const filterConditions = shard.filter.split('&');

        for (const condition of filterConditions) {
            if (condition.includes('=')) {
                const [field, value] = condition.split('=');

                // Check if query has matching filter
                const hasMatchingFilter = query.filters.some(f =>
                    f.field === field && f.value === value
                );

                // Check user context
                if (userContext && (userContext as Record<string, unknown>)[field] === value) {
                    continue;
                }

                if (!hasMatchingFilter) {
                    return false;
                }
            }
        }

        return true;
    }

    private async executeShardQuery(
        shard: Shard,
        query: FirestoreQuery): Promise<{
            documents: FirestoreDocument[];
            count: number;
            latency: number;
            shardId: string;
        }> {
        const startTime = Date.now();

        // Simulate shard query execution
        // In production, this would execute the actual Firestore query on the specific shard
        await new Promise(resolve => setTimeout(resolve, shard.performance.averageLatency));

        const mockDocuments = this.generateMockDocuments(query.limit || 100);
        const endTime = Date.now();

        return {
            documents: mockDocuments,
            count: mockDocuments.length,
            latency: endTime - startTime,
            shardId: shard.id
        };
    }

    private async mergeShardResults(
        results: Array<{ documents: FirestoreDocument[]; count: number; latency: number; shardId: string; }>,
        query: FirestoreQuery
    ): Promise<{ documents: FirestoreDocument[]; totalCount: number; }> {
        // Combine all documents
        const allDocuments = results.flatMap(r => r.documents);

        // Apply sorting if specified
        if (query.orderBy && query.orderBy.length > 0) {
            allDocuments.sort((a, b) => {
                const aRec = a as Record<string, unknown>;
                const bRec = b as Record<string, unknown>;
                for (const order of query.orderBy!) {
                    const aVal = aRec[order.field] as (number | string | undefined);
                    const bVal = bRec[order.field] as (number | string | undefined);
                    if (aVal == null && bVal == null) continue;
                    if (aVal == null) return 1;
                    if (bVal == null) return -1;
                    if (aVal < bVal) return order.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return order.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        // Apply limit if specified
        const finalDocuments = query.limit
            ? allDocuments.slice(0, query.limit)
            : allDocuments;

        return {
            documents: finalDocuments,
            totalCount: results.reduce((sum, r) => sum + r.count, 0)
        };
    }

    private generateMockDocuments(count: number): FirestoreDocument[] {
        const documents: FirestoreDocument[] = [];
        for (let i = 0; i < count; i++) {
            documents.push({
                id: `doc_${i}`,
                data: `mock_data_${i}`,
                timestamp: Date.now() - (Math.random() * 86400000) // Random time in last 24h
            });
        }
        return documents;
    }

    private applyTierOptimizations(filters: QueryFilter[], tier: string): QueryFilter[] {
        const optimizedFilters = [...filters];

        // Add tier-specific filters
        if (!filters.find(f => f.field === 'tier')) {
            optimizedFilters.push({
                field: 'tier',
                operator: '==',
                value: tier
            });
        }

        return optimizedFilters;
    }

    private getMaxLimitForTier(tier: string): number {
        const limits = {
            enterprise: 10000,
            agency: 5000,
            starter: 1000,
            free: 500
        };

        return limits[tier as keyof typeof limits] || 1000;
    }

    private getEssentialFields(collection: string, tier: string): string[] {
        const fieldMaps = {
            neuroSeoAnalyses: {
                enterprise: ['id', 'url', 'score', 'keywords', 'recommendations', 'timestamp'],
                agency: ['id', 'url', 'score', 'keywords', 'timestamp'],
                starter: ['id', 'url', 'score', 'timestamp'],
                free: ['id', 'url', 'score']
            }
        };

        const collectionFields = fieldMaps[collection as keyof typeof fieldMaps];
        return collectionFields?.[tier as keyof typeof collectionFields] || ['id'];
    }

    private estimateOptimizationBenefit(
        originalQuery: FirestoreQuery,
        optimizedQuery: FirestoreQuery,
        userContext?: { tier?: string; region?: string; expectedResultSize?: number }
    ): {
        latencyReduction: number;
        costReduction: number;
        throughputIncrease: number;
    } {
        let latencyReduction = 0;
        let costReduction = 0;
        let throughputIncrease = 0;

        // Estimate benefits based on optimization types
        if (optimizedQuery.limit && !originalQuery.limit) {
            latencyReduction += 0.3; // 30% latency reduction
            costReduction += 0.4;    // 40% cost reduction
        }

        if (optimizedQuery.filters.length > originalQuery.filters.length) {
            latencyReduction += 0.2; // 20% latency reduction
            throughputIncrease += 0.3; // 30% throughput increase
        }

        // Slight additional improvements based on user tier / context
        if (userContext?.tier === 'enterprise') {
            throughputIncrease += 0.1; // enterprise infra advantages
        }
        if (userContext?.expectedResultSize && optimizedQuery.limit) {
            costReduction += 0.05; // better sizing vs expectation
        }

        return {
            latencyReduction,
            costReduction,
            throughputIncrease
        };
    }

    private async trackQueryPerformance(
        collection: string,
        shardIds: string[],
        latency: number
    ): Promise<void> {
        const metricKey = `${collection}_${shardIds.join('_')}`;
        const existing = this.performanceMetrics.get(metricKey) || {
            totalQueries: 0,
            averageLatency: 0,
            minLatency: Infinity,
            maxLatency: 0
        };

        existing.totalQueries++;
        existing.averageLatency =
            (existing.averageLatency * (existing.totalQueries - 1) + latency) / existing.totalQueries;
        existing.minLatency = Math.min(existing.minLatency, latency);
        existing.maxLatency = Math.max(existing.maxLatency, latency);

        this.performanceMetrics.set(metricKey, existing);
    }

    private async analyzeShardPerformance(shards: Shard[]): Promise<ShardAnalysis[]> {
        return shards.map(shard => ({
            shardId: shard.id,
            currentUtilization: shard.performance.utilization,
            averageLatency: shard.performance.averageLatency,
            throughput: shard.performance.throughput,
            capacityUsage: {
                documents: 0.6, // 60% capacity used
                queries: 0.7,   // 70% query capacity used
                storage: 0.5    // 50% storage used
            },
            trends: {
                utilizationTrend: 'increasing',
                latencyTrend: 'stable',
                throughputTrend: 'increasing'
            }
        }));
    }

    private identifyShardImbalances(analysis: ShardAnalysis[]): ShardImbalance[] {
        const imbalances: ShardImbalance[] = [];
        const avgUtilization = analysis.reduce((sum, a) => sum + a.currentUtilization, 0) / analysis.length;

        for (const shard of analysis) {
            if (shard.currentUtilization > avgUtilization * 1.5) {
                imbalances.push({
                    shardId: shard.shardId,
                    type: 'overutilized',
                    severity: shard.currentUtilization > 90 ? 'critical' : 'high',
                    metrics: {
                        currentUtilization: shard.currentUtilization,
                        targetUtilization: avgUtilization,
                        latencyImpact: shard.averageLatency
                    }
                });
            } else if (shard.currentUtilization < avgUtilization * 0.3) {
                imbalances.push({
                    shardId: shard.shardId,
                    type: 'underutilized',
                    severity: 'medium',
                    metrics: {
                        currentUtilization: shard.currentUtilization,
                        targetUtilization: avgUtilization,
                        latencyImpact: shard.averageLatency
                    }
                });
            }
        }

        return imbalances;
    }

    private async generateRebalancingPlan(
        strategy: ShardingStrategy,
        imbalances: ShardImbalance[]
    ): Promise<RebalancingPlan> {
        const actions: RebalancingAction[] = [];

        for (const imbalance of imbalances) {
            if (imbalance.type === 'overutilized') {
                actions.push({
                    type: 'split-shard',
                    sourceShardId: imbalance.shardId,
                    targetShardIds: [`${imbalance.shardId}_split_1`, `${imbalance.shardId}_split_2`],
                    estimatedDocuments: 100000,
                    priority: imbalance.severity === 'critical' ? 'high' : 'medium'
                });
            } else if (imbalance.type === 'underutilized') {
                // Find another underutilized shard to merge with
                const mergeCandidate = imbalances.find(i =>
                    i.type === 'underutilized' &&
                    i.shardId !== imbalance.shardId
                );

                if (mergeCandidate) {
                    actions.push({
                        type: 'merge-shards',
                        sourceShardId: imbalance.shardId,
                        targetShardIds: [mergeCandidate.shardId],
                        estimatedDocuments: 50000,
                        priority: 'low'
                    });
                }
            }
        }

        return {
            strategy: strategy.type,
            actions,
            estimatedDuration: actions.length * 30, // 30 minutes per action
            rollbackPlan: this.generateRollbackPlan(actions)
        };
    }

    private estimateRebalancingImpact(plan: RebalancingPlan): {
        performanceImprovement: number;
        migrationTime: number;
        downtime: number;
    } {
        return {
            performanceImprovement: plan.actions.length * 0.15, // 15% improvement per action
            migrationTime: plan.estimatedDuration,
            downtime: plan.actions.length * 5 // 5 minutes downtime per action
        };
    }

    private generateRollbackPlan(actions: RebalancingAction[]): RollbackStep[] {
        return actions.map(action => ({
            actionId: action.sourceShardId,
            rollbackType: action.type === 'split-shard' ? 'merge-back' : 'split-back',
            estimatedTime: 15 // 15 minutes rollback time
        }));
    }

    private async getShardPerformanceMetrics(_shardId: string): Promise<ShardPerformanceMetrics> {
        // Mock implementation - in production would fetch real metrics
        return {
            averageLatency: 20 + Math.random() * 30,
            throughput: 800 + Math.random() * 400,
            utilization: 40 + Math.random() * 50,
            errorCount: Math.floor(Math.random() * 10),
            queryCount: Math.floor(Math.random() * 1000) + 500,
            documentsStored: Math.floor(Math.random() * 100000) + 50000
        };
    }

    private assessShardHealth(metrics: ShardPerformanceMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
        let score = 100;

        if (metrics.averageLatency > 50) score -= 25;
        if (metrics.utilization > 85) score -= 20;
        if (metrics.errorCount > 5) score -= 15;
        if (metrics.throughput < 500) score -= 20;

        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }

    private generateShardRecommendations(
        metrics: ShardPerformanceMetrics,
        health: string
    ): string[] {
        const recommendations: string[] = [];

        if (metrics.averageLatency > 50) {
            recommendations.push('Consider adding more indexes to reduce query latency');
        }

        if (metrics.utilization > 85) {
            recommendations.push('Shard is highly utilized - consider splitting or adding capacity');
        }

        if (metrics.errorCount > 5) {
            recommendations.push('High error rate detected - investigate query patterns');
        }

        if (health === 'poor') {
            recommendations.push('Immediate attention required - consider maintenance window');
        }

        return recommendations;
    }

    private async identifyRebalancingOpportunities(collections: string[]): Promise<RebalancingOpportunity[]> {
        const opportunities: RebalancingOpportunity[] = [];

        for (const collection of collections) {
            const strategy = this.shardingStrategies.get(collection);
            if (!strategy) continue;

            const analysis = await this.analyzeShardPerformance(strategy.shards);
            const imbalances = this.identifyShardImbalances(analysis);

            if (imbalances.length > 0) {
                opportunities.push({
                    collection,
                    type: 'rebalancing',
                    description: `${imbalances.length} shards require rebalancing`,
                    estimatedBenefit: {
                        performanceGain: imbalances.length * 0.15,
                        costSavings: imbalances.length * 0.1
                    },
                    priority: imbalances.some(i => i.severity === 'critical') ? 'high' : 'medium'
                });
            }
        }

        return opportunities;
    }
}

// Supporting interfaces
interface QueryMetrics {
    totalQueries: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
}

interface ShardAnalysis {
    shardId: string;
    currentUtilization: number;
    averageLatency: number;
    throughput: number;
    capacityUsage: {
        documents: number;
        queries: number;
        storage: number;
    };
    trends: {
        utilizationTrend: 'increasing' | 'decreasing' | 'stable';
        latencyTrend: 'increasing' | 'decreasing' | 'stable';
        throughputTrend: 'increasing' | 'decreasing' | 'stable';
    };
}

interface ShardImbalance {
    shardId: string;
    type: 'overutilized' | 'underutilized';
    severity: 'low' | 'medium' | 'high' | 'critical';
    metrics: {
        currentUtilization: number;
        targetUtilization: number;
        latencyImpact: number;
    };
}

interface RebalancingPlan {
    strategy: string;
    actions: RebalancingAction[];
    estimatedDuration: number;
    rollbackPlan: RollbackStep[];
}

interface RebalancingAction {
    type: 'split-shard' | 'merge-shards' | 'migrate-data';
    sourceShardId: string;
    targetShardIds: string[];
    estimatedDocuments: number;
    priority: 'low' | 'medium' | 'high';
}

interface RollbackStep {
    actionId: string;
    rollbackType: string;
    estimatedTime: number;
}

interface ShardPerformanceMetrics {
    averageLatency: number;
    throughput: number;
    utilization: number;
    errorCount: number;
    queryCount: number;
    documentsStored: number;
}

interface RebalancingOpportunity {
    collection: string;
    type: 'rebalancing' | 'optimization' | 'migration';
    description: string;
    estimatedBenefit: {
        performanceGain: number;
        costSavings: number;
    };
    priority: 'low' | 'medium' | 'high';
}
