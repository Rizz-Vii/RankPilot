/**
 * Global Infrastructure Optimization System
 * Phase 5 Priority 2: Multi-region deployment and CDN optimization
 */

import { EventEmitter } from 'events';

export interface EdgeLocation {
    id: string;
    name: string;
    region: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
    capabilities: string[];
    status: 'active' | 'maintenance' | 'offline';
    performance: {
        avg_latency: number;
        cache_hit_rate: number;
        bandwidth_usage: number;
        error_rate: number;
        uptime: number;
    };
    resources: {
        cpu_usage: number;
        memory_usage: number;
        storage_usage: number;
        network_throughput: number;
    };
    last_updated: number;
}

export interface CacheRule {
    id: string;
    name: string;
    pattern: string;
    cache_duration: number;
    cache_type: 'static' | 'dynamic' | 'api' | 'edge';
    conditions: Array<{
        type: 'path' | 'header' | 'query' | 'method' | 'user_agent';
        operator: 'equals' | 'contains' | 'starts_with' | 'regex';
        _value: string;
    }>;
    actions: Array<{
        type: 'cache' | 'bypass' | 'purge' | 'transform';
        parameters: Record<string, any>;
    }>;
    priority: number;
    enabled: boolean;
    statistics: {
        hits: number;
        misses: number;
        hit_rate: number;
        bytes_served: number;
        requests_count: number;
    };
}

export interface LoadBalancingRule {
    id: string;
    name: string;
    algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'geographic' | 'performance';
    targets: Array<{
        id: string;
        endpoint: string;
        weight: number;
        health_check: boolean;
        status: 'healthy' | 'unhealthy' | 'draining';
        current_connections: number;
        response_time: number;
    }>;
    health_check: {
        enabled: boolean;
        path: string;
        interval: number;
        timeout: number;
        failure_threshold: number;
        success_threshold: number;
    };
    geographic_routing: {
        enabled: boolean;
        rules: Array<{
            region: string;
            preferred_targets: string[];
            fallback_targets: string[];
        }>;
    };
    performance_routing: {
        enabled: boolean;
        latency_threshold: number;
        error_rate_threshold: number;
    };
}

export interface PerformanceOptimization {
    id: string;
    type: 'compression' | 'minification' | 'image_optimization' | 'prefetch' | 'http2_push';
    enabled: boolean;
    configuration: Record<string, any>;
    impact: {
        size_reduction: number;
        performance_improvement: number;
        bandwidth_savings: number;
    };
    compatibility: string[];
}

export interface DatabaseOptimization {
    id: string;
    type: 'index' | 'query' | 'connection_pool' | 'cache' | 'replication';
    description: string;
    implementation: string;
    performance_impact: {
        query_time_improvement: number;
        throughput_increase: number;
        resource_usage_reduction: number;
    };
    status: 'pending' | 'implementing' | 'active' | 'failed';
    created_at: number;
    implemented_at?: number;
}

export class GlobalInfrastructureOptimizer extends EventEmitter {
    private edgeLocations: Map<string, EdgeLocation> = new Map();
    private cacheRules: Map<string, CacheRule> = new Map();
    private loadBalancingRules: Map<string, LoadBalancingRule> = new Map();
    private optimizations: Map<string, PerformanceOptimization> = new Map();
    private databaseOptimizations: Map<string, DatabaseOptimization> = new Map();
    private isOptimizing: boolean = false;
    private optimizationInterval?: NodeJS.Timer;

    constructor() {
        super();
        this.initializeDefaultConfiguration();
    }

    /**
     * Start global optimization monitoring
     */
    startOptimization(): void {
        if (this.isOptimizing) return;

        this.isOptimizing = true;
        this.optimizationInterval = setInterval(() => {
            this.runOptimizationCycle();
        }, 300000); // Every 5 minutes

        this.emit('optimization-started');
    }

    /**
     * Stop global optimization monitoring
     */
    stopOptimization(): void {
        if (!this.isOptimizing) return;

        this.isOptimizing = false;
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval as NodeJS.Timeout);
            this.optimizationInterval = undefined;
        }

        this.emit('optimization-stopped');
    }

    /**
     * Add or update edge location
     */
    updateEdgeLocation(location: EdgeLocation): void {
        this.edgeLocations.set(location.id, location);
        this.emit('edge-location-updated', location);
    }

    /**
     * Get optimal edge location for user
     */
    getOptimalEdgeLocation(userLocation: { latitude: number; longitude: number; }): EdgeLocation | null {
        const activeLocations = Array.from(this.edgeLocations.values())
            .filter(loc => loc.status === 'active');

        if (activeLocations.length === 0) return null;

        // Calculate distances and select best location
        const locationsWithDistance = activeLocations.map(location => ({
            location,
            distance: this.calculateDistance(userLocation, {
                latitude: location.latitude,
                longitude: location.longitude
            }),
            performance_score: this.calculatePerformanceScore(location)
        }));

        // Sort by combined distance and performance score
        locationsWithDistance.sort((a, b) => {
            const scoreA = a.distance * 0.6 + (1 - a.performance_score) * 0.4;
            const scoreB = b.distance * 0.6 + (1 - b.performance_score) * 0.4;
            return scoreA - scoreB;
        });

        return locationsWithDistance[0].location;
    }

    /**
     * Add or update cache rule
     */
    setCacheRule(rule: CacheRule): void {
        this.cacheRules.set(rule.id, rule);
        this.emit('cache-rule-updated', rule);
    }

    /**
     * Evaluate cache rules for a request
     */
    evaluateCacheRules(_request: {
        path: string;
        method: string;
        headers: Record<string, string>;
        query: Record<string, string>;
    }): CacheRule | null {
        const applicableRules = Array.from(this.cacheRules.values())
            .filter(rule => rule.enabled)
            .filter(rule => this.matchesCacheRule(_request, rule))
            .sort((a, b) => b.priority - a.priority);

        return applicableRules[0] || null;
    }

    /**
     * Purge cache for specific patterns
     */
    async purgeCache(patterns: string[], locations?: string[]): Promise<{
        success: boolean;
        purged_items: number;
        locations_affected: string[];
        duration: number;
    }> {
        const startTime = Date.now();
        let purgedItems = 0;
        const affectedLocations: string[] = [];

        const targetLocations = locations || Array.from(this.edgeLocations.keys());

        for (const locationId of targetLocations) {
            const location = this.edgeLocations.get(locationId);
            if (!location || location.status !== 'active') continue;

            // Simulate cache purging
            const itemsPurged = await this.purgeCacheAtLocation(locationId, patterns);
            purgedItems += itemsPurged;
            affectedLocations.push(locationId);
        }

        const result = {
            success: true,
            purged_items: purgedItems,
            locations_affected: affectedLocations,
            duration: Date.now() - startTime
        };

        this.emit('cache-purged', result);
        return result;
    }

    /**
     * Set load balancing configuration
     */
    setLoadBalancingRule(rule: LoadBalancingRule): void {
        this.loadBalancingRules.set(rule.id, rule);
        this.emit('load-balancing-updated', rule);
    }

    /**
     * Get optimal target for load balancing
     */
    getOptimalTarget(ruleId: string, clientInfo?: {
        ip: string;
        country: string;
        region: string;
    }): string | null {
        const rule = this.loadBalancingRules.get(ruleId);
        if (!rule) return null;

        const healthyTargets = rule.targets.filter(t => t.status === 'healthy');
        if (healthyTargets.length === 0) return null;

        switch (rule.algorithm) {
            case 'round_robin':
                return this.getRoundRobinTarget(healthyTargets);

            case 'least_connections':
                return this.getLeastConnectionsTarget(healthyTargets);

            case 'weighted':
                return this.getWeightedTarget(healthyTargets);

            case 'geographic':
                return this.getGeographicTarget(rule, healthyTargets, clientInfo);

            case 'performance':
                return this.getPerformanceTarget(healthyTargets);

            default:
                return healthyTargets[0].id;
        }
    }

    /**
     * Add performance optimization
     */
    setPerformanceOptimization(optimization: PerformanceOptimization): void {
        this.optimizations.set(optimization.id, optimization);
        this.emit('optimization-updated', optimization);
    }

    /**
     * Optimize static assets
     */
    async optimizeAssets(assets: Array<{
        path: string;
        type: 'css' | 'js' | 'image' | 'font';
        size: number;
        content?: string;
    }>): Promise<Array<{
        path: string;
        original_size: number;
        optimized_size: number;
        savings: number;
        optimizations_applied: string[];
    }>> {
        const results = [];

        for (const asset of assets) {
            const optimized = await this.optimizeAsset(asset);
            results.push(optimized);
        }

        this.emit('assets-optimized', results);
        return results;
    }

    /**
     * Add database optimization
     */
    addDatabaseOptimization(optimization: DatabaseOptimization): void {
        this.databaseOptimizations.set(optimization.id, optimization);
        this.emit('database-optimization-added', optimization);
    }

    /**
     * Implement database optimization
     */
    async implementDatabaseOptimization(optimizationId: string): Promise<{
        success: boolean;
        performance_impact: DatabaseOptimization['performance_impact'];
        implementation_time: number;
    }> {
        const optimization = this.databaseOptimizations.get(optimizationId);
        if (!optimization) {
            throw new Error(`Database optimization ${optimizationId} not found`);
        }

        optimization.status = 'implementing';
        const startTime = Date.now();

        try {
            // Simulate implementation
            await this.simulateOptimizationImplementation(optimization);

            optimization.status = 'active';
            optimization.implemented_at = Date.now();

            const result = {
                success: true,
                performance_impact: optimization.performance_impact,
                implementation_time: Date.now() - startTime
            };

            this.emit('database-optimization-implemented', { optimization, result });
            return result;

        } catch (_error) {
            optimization.status = 'failed';
            throw _error;
        }
    }

    /**
     * Get global performance metrics
     */
    getGlobalPerformanceMetrics(): {
        edge_locations: {
            total: number;
            active: number;
            avg_latency: number;
            avg_cache_hit_rate: number;
            total_bandwidth: number;
        };
        cache_performance: {
            total_rules: number;
            active_rules: number;
            global_hit_rate: number;
            bandwidth_savings: number;
        };
        load_balancing: {
            total_rules: number;
            healthy_targets: number;
            avg_response_time: number;
            request_distribution: Record<string, number>;
        };
        optimizations: {
            active_optimizations: number;
            total_size_reduction: number;
            performance_improvement: number;
            bandwidth_savings: number;
        };
        database: {
            active_optimizations: number;
            avg_query_improvement: number;
            throughput_increase: number;
        };
    } {
        const edgeMetrics = this.calculateEdgeMetrics();
        const cacheMetrics = this.calculateCacheMetrics();
        const loadBalancingMetrics = this.calculateLoadBalancingMetrics();
        const optimizationMetrics = this.calculateOptimizationMetrics();
        const databaseMetrics = this.calculateDatabaseMetrics();

        return {
            edge_locations: edgeMetrics,
            cache_performance: cacheMetrics,
            load_balancing: loadBalancingMetrics,
            optimizations: optimizationMetrics,
            database: databaseMetrics
        };
    }

    /**
     * Generate optimization recommendations
     */
    async generateOptimizationRecommendations(): Promise<Array<{
        type: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        expected_impact: {
            performance_improvement: number;
            cost_savings: number;
            implementation_effort: string;
        };
        implementation_steps: string[];
    }>> {
        const recommendations = [];

        // Analyze edge performance
        const edgeRecommendations = await this.analyzeEdgePerformance();
        recommendations.push(...edgeRecommendations);

        // Analyze cache efficiency
        const cacheRecommendations = await this.analyzeCacheEfficiency();
        recommendations.push(...cacheRecommendations);

        // Analyze database performance
        const databaseRecommendations = await this.analyzeDatabasePerformance();
        recommendations.push(...databaseRecommendations);

        // Sort by priority and expected impact
        recommendations.sort((a, b) => {
            const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityWeight[(b as any).priority as keyof typeof priorityWeight] - priorityWeight[(a as any).priority as keyof typeof priorityWeight];
        });

        return recommendations as any;
    }

    // Private methods
    private runOptimizationCycle(): void {
        // Monitor edge locations
        this.monitorEdgeLocations();

        // Optimize cache rules
        this.optimizeCacheRules();

        // Update load balancing
        this.updateLoadBalancing();

        // Apply performance optimizations
        this.applyPerformanceOptimizations();

        this.emit('optimization-cycle-completed');
    }

    private calculateDistance(
        point1: { latitude: number; longitude: number; },
        point2: { latitude: number; longitude: number; }
    ): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(point2.latitude - point1.latitude);
        const dLon = this.toRad(point2.longitude - point1.longitude);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.latitude)) * Math.cos(this.toRad(point2.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private calculatePerformanceScore(location: EdgeLocation): number {
        const { performance } = location;

        // Weighted score based on multiple factors
        const latencyScore = Math.max(0, 1 - (performance.avg_latency / 1000)); // Lower is better
        const cacheScore = performance.cache_hit_rate;
        const uptimeScore = performance.uptime;
        const errorScore = Math.max(0, 1 - performance.error_rate); // Lower is better

        return (latencyScore * 0.3 + cacheScore * 0.3 + uptimeScore * 0.2 + errorScore * 0.2);
    }

    private matchesCacheRule(_request: any, rule: CacheRule): boolean {
        // Check if request path matches rule pattern
        const pathMatches = new RegExp(rule.pattern).test(_request.path);
        if (!pathMatches) return false;

        // Check additional conditions
        for (const condition of rule.conditions) {
            if (!this.evaluateCondition(_request, condition)) {
                return false;
            }
        }

        return true;
    }

    private evaluateCondition(_request: any, condition: any): boolean {
        let value: string;

        switch (condition.type) {
            case 'path':
                value = _request.path;
                break;
            case 'method':
                value = _request.method;
                break;
            case 'header':
                value = _request.headers[condition.name] || '';
                break;
            case 'query':
                value = _request.query[condition.name] || '';
                break;
            default:
                return true;
        }

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'contains':
                return value.includes(condition._value);
            case 'starts_with':
                return value.startsWith(condition._value);
            case 'regex':
                return new RegExp(condition._value).test(value);
            default:
                return true;
        }
    }

    private async purgeCacheAtLocation(locationId: string, patterns: string[]): Promise<number> {
        // Simulate cache purging at specific location
        return patterns.length * Math.floor(Math.random() * 100 + 50);
    }

    private getRoundRobinTarget(targets: any[]): string {
        // Simple round-robin implementation
        const index = Date.now() % targets.length;
        return targets[index].id;
    }

    private getLeastConnectionsTarget(targets: any[]): string {
        return targets.reduce((min, target) =>
            target.current_connections < min.current_connections ? target : min
        ).id;
    }

    private getWeightedTarget(targets: any[]): string {
        const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
        const random = Math.random() * totalWeight;

        let accumulated = 0;
        for (const target of targets) {
            accumulated += target.weight;
            if (random <= accumulated) {
                return target.id;
            }
        }

        return targets[0].id;
    }

    private getGeographicTarget(rule: LoadBalancingRule, targets: any[], clientInfo?: any): string {
        if (!rule.geographic_routing.enabled || !clientInfo) {
            return this.getRoundRobinTarget(targets);
        }

        const geoRule = rule.geographic_routing.rules.find(r => r.region === clientInfo.region);
        if (geoRule) {
            const preferredTargets = targets.filter(t => geoRule.preferred_targets.includes(t.id));
            if (preferredTargets.length > 0) {
                return this.getRoundRobinTarget(preferredTargets);
            }
        }

        return this.getRoundRobinTarget(targets);
    }

    private getPerformanceTarget(targets: any[]): string {
        return targets.reduce((best, target) =>
            target.response_time < best.response_time ? target : best
        ).id;
    }

    private async optimizeAsset(asset: any): Promise<any> {
        let optimizedSize = asset.size;
        const appliedOptimizations = [];

        // Simulate various optimizations based on asset type
        switch (asset.type) {
            case 'js':
                optimizedSize *= 0.7; // 30% reduction
                appliedOptimizations.push('minification', 'tree-shaking');
                break;
            case 'css':
                optimizedSize *= 0.8; // 20% reduction
                appliedOptimizations.push('minification', 'unused-css-removal');
                break;
            case 'image':
                optimizedSize *= 0.6; // 40% reduction
                appliedOptimizations.push('compression', 'format-conversion');
                break;
            case 'font':
                optimizedSize *= 0.9; // 10% reduction
                appliedOptimizations.push('subset-generation');
                break;
        }

        return {
            path: asset.path,
            original_size: asset.size,
            optimized_size: Math.floor(optimizedSize),
            savings: asset.size - Math.floor(optimizedSize),
            optimizations_applied: appliedOptimizations
        };
    }

    private async simulateOptimizationImplementation(optimization: DatabaseOptimization): Promise<void> {
        // Simulate implementation delay
        return new Promise(resolve => {
            setTimeout(resolve, Math.random() * 5000 + 1000);
        });
    }

    private calculateEdgeMetrics(): any {
        const locations = Array.from(this.edgeLocations.values());
        const active = locations.filter(l => l.status === 'active');

        return {
            total: locations.length,
            active: active.length,
            avg_latency: active.reduce((sum, l) => sum + l.performance.avg_latency, 0) / active.length || 0,
            avg_cache_hit_rate: active.reduce((sum, l) => sum + l.performance.cache_hit_rate, 0) / active.length || 0,
            total_bandwidth: active.reduce((sum, l) => sum + l.performance.bandwidth_usage, 0)
        };
    }

    private calculateCacheMetrics(): any {
        const rules = Array.from(this.cacheRules.values());
        const active = rules.filter(r => r.enabled);

        return {
            total_rules: rules.length,
            active_rules: active.length,
            global_hit_rate: active.reduce((sum, r) => sum + r.statistics.hit_rate, 0) / active.length || 0,
            bandwidth_savings: active.reduce((sum, r) => sum + r.statistics.bytes_served, 0)
        };
    }

    private calculateLoadBalancingMetrics(): any {
        const rules = Array.from(this.loadBalancingRules.values());
        const allTargets = rules.flatMap(r => r.targets);
        const healthy = allTargets.filter(t => t.status === 'healthy');

        return {
            total_rules: rules.length,
            healthy_targets: healthy.length,
            avg_response_time: healthy.reduce((sum, t) => sum + t.response_time, 0) / healthy.length || 0,
            request_distribution: {}
        };
    }

    private calculateOptimizationMetrics(): any {
        const optimizations = Array.from(this.optimizations.values());
        const active = optimizations.filter(o => o.enabled);

        return {
            active_optimizations: active.length,
            total_size_reduction: active.reduce((sum, o) => sum + o.impact.size_reduction, 0),
            performance_improvement: active.reduce((sum, o) => sum + o.impact.performance_improvement, 0),
            bandwidth_savings: active.reduce((sum, o) => sum + o.impact.bandwidth_savings, 0)
        };
    }

    private calculateDatabaseMetrics(): any {
        const optimizations = Array.from(this.databaseOptimizations.values());
        const active = optimizations.filter(o => o.status === 'active');

        return {
            active_optimizations: active.length,
            avg_query_improvement: active.reduce((sum, o) => sum + o.performance_impact.query_time_improvement, 0) / active.length || 0,
            throughput_increase: active.reduce((sum, o) => sum + o.performance_impact.throughput_increase, 0) / active.length || 0
        };
    }

    private monitorEdgeLocations(): void {
        // Update edge location metrics
        for (const location of this.edgeLocations.values()) {
            if (location.status === 'active') {
                this.updateEdgeLocationMetrics(location);
            }
        }
    }

    private updateEdgeLocationMetrics(location: EdgeLocation): void {
        // Simulate metric updates
        location.performance.avg_latency += (Math.random() - 0.5) * 10;
        location.performance.cache_hit_rate = Math.max(0, Math.min(1, location.performance.cache_hit_rate + (Math.random() - 0.5) * 0.05));
        location.last_updated = Date.now();
    }

    private optimizeCacheRules(): void {
        // Analyze and optimize cache rules based on performance
        for (const rule of this.cacheRules.values()) {
            if (rule.enabled && rule.statistics.hit_rate < 0.5) {
                // Suggest cache rule optimization
                this.emit('cache-optimization-suggested', {
                    rule_id: rule.id,
                    current_hit_rate: rule.statistics.hit_rate,
                    suggestions: ['Increase cache duration', 'Broaden cache pattern']
                });
            }
        }
    }

    private updateLoadBalancing(): void {
        // Update load balancing targets based on health and performance
        for (const rule of this.loadBalancingRules.values()) {
            for (const target of rule.targets) {
                // Simulate health check updates
                target.response_time += (Math.random() - 0.5) * 50;
                target.current_connections += Math.floor((Math.random() - 0.5) * 10);

                // Update health status based on response time
                if (target.response_time > 5000) {
                    target.status = 'unhealthy';
                } else if (target.status === 'unhealthy' && target.response_time < 2000) {
                    target.status = 'healthy';
                }
            }
        }
    }

    private applyPerformanceOptimizations(): void {
        // Apply and monitor performance optimizations
        for (const optimization of this.optimizations.values()) {
            if (optimization.enabled) {
                // Update optimization impact metrics
                optimization.impact.performance_improvement += (Math.random() - 0.5) * 0.01;
                optimization.impact.bandwidth_savings += Math.random() * 1000;
            }
        }
    }

    private async analyzeEdgePerformance(): Promise<unknown[]> {
        const recommendations = [];

        for (const location of this.edgeLocations.values()) {
            if (location.performance.avg_latency > 500) {
                recommendations.push({
                    type: 'edge_optimization',
                    priority: 'high' as const,
                    description: `Edge location ${location.name} has high latency (${location.performance.avg_latency}ms)`,
                    expected_impact: {
                        performance_improvement: 0.3,
                        cost_savings: 5000,
                        implementation_effort: 'medium'
                    },
                    implementation_steps: [
                        'Analyze traffic patterns',
                        'Optimize caching configuration',
                        'Consider hardware upgrade'
                    ]
                });
            }
        }

        return recommendations;
    }

    private async analyzeCacheEfficiency(): Promise<unknown[]> {
        const recommendations = [];

        for (const rule of this.cacheRules.values()) {
            if (rule.enabled && rule.statistics.hit_rate < 0.7) {
                recommendations.push({
                    type: 'cache_optimization',
                    priority: 'medium' as const,
                    description: `Cache rule ${rule.name} has low hit rate (${rule.statistics.hit_rate})`,
                    expected_impact: {
                        performance_improvement: 0.2,
                        cost_savings: 2000,
                        implementation_effort: 'low'
                    },
                    implementation_steps: [
                        'Review cache patterns',
                        'Adjust cache duration',
                        'Optimize cache keys'
                    ]
                });
            }
        }

        return recommendations;
    }

    private async analyzeDatabasePerformance(): Promise<unknown[]> {
        // Analyze database performance and suggest optimizations
        return [
            {
                type: 'database_index',
                priority: 'high' as const,
                description: 'Slow queries detected on user search functionality',
                expected_impact: {
                    performance_improvement: 0.5,
                    cost_savings: 10000,
                    implementation_effort: 'medium'
                },
                implementation_steps: [
                    'Analyze query patterns',
                    'Create composite indexes',
                    'Optimize query structure'
                ]
            }
        ];
    }

    private initializeDefaultConfiguration(): void {
        // Initialize default edge locations
        this.updateEdgeLocation({
            id: 'us-east-1',
            name: 'US East (Virginia)',
            region: 'us-east',
            country: 'US',
            city: 'Virginia',
            latitude: 39.0458,
            longitude: -76.6413,
            capabilities: ['compute', 'cache', 'storage'],
            status: 'active',
            performance: {
                avg_latency: 150,
                cache_hit_rate: 0.85,
                bandwidth_usage: 1000000,
                error_rate: 0.01,
                uptime: 0.999
            },
            resources: {
                cpu_usage: 0.65,
                memory_usage: 0.70,
                storage_usage: 0.45,
                network_throughput: 10000
            },
            last_updated: Date.now()
        });

        // Initialize default cache rules
        this.setCacheRule({
            id: 'static-assets',
            name: 'Static Assets Cache',
            pattern: '\\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$',
            cache_duration: 86400, // 24 hours
            cache_type: 'static',
            conditions: [],
            actions: [{
                type: 'cache',
                parameters: { max_age: 86400 }
            }],
            priority: 100,
            enabled: true,
            statistics: {
                hits: 10000,
                misses: 1000,
                hit_rate: 0.91,
                bytes_served: 50000000,
                requests_count: 11000
            }
        });

        // Initialize default performance optimizations
        this.setPerformanceOptimization({
            id: 'gzip-compression',
            type: 'compression',
            enabled: true,
            configuration: {
                level: 6,
                mime_types: ['text/html', 'text/css', 'application/javascript', 'application/json']
            },
            impact: {
                size_reduction: 0.7,
                performance_improvement: 0.3,
                bandwidth_savings: 1000000
            },
            compatibility: ['modern_browsers']
        });
    }
}

// Global instance for infrastructure optimization
export const globalInfrastructureOptimizer = new GlobalInfrastructureOptimizer();

// Auto-start optimization
if (typeof window === 'undefined') { // Server-side only
    globalInfrastructureOptimizer.startOptimization();
}
