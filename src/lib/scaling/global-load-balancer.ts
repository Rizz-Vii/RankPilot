/**
 * Global Load Balancer and CDN Manager
 * DevNext Part III Step 2: Global Distribution for 10,000+ Users
 */

export interface GlobalEndpoint {
    region: string;
    url: string;
    capacity: number;
    currentLoad: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
    latency: {
        average: number;
        p95: number;
        p99: number;
    };
    features: string[];
}

export interface LoadBalancingRule {
    id: string;
    name: string;
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'intelligent-routing' | 'geographic';
    healthChecks: {
        enabled: boolean;
        interval: string;
        timeout: string;
        healthyThreshold: number;
        unhealthyThreshold: number;
        path?: string;
    };
    targets: LoadBalancingTarget[];
    failover: {
        enabled: boolean;
        primaryRegion: string;
        failoverRegions: string[];
        autoFailback: boolean;
    };
}

export interface LoadBalancingTarget {
    region: string;
    endpoint: string;
    weight: number;
    capacity: number;
    latencyTarget: string;
    priority: number;
}

export interface CDNConfiguration {
    providers: CDNProvider[];
    cachingRules: CachingRule[];
    edgeLocations: EdgeLocation[];
    optimizationSettings: {
        imageOptimization: boolean;
        cssMinification: boolean;
        jsMinification: boolean;
        gzipCompression: boolean;
        brotliCompression: boolean;
    };
}

export interface CDNProvider {
    name: string;
    regions: string[];
    capabilities: string[];
    priority: number;
    configuration: {
        apiKey?: string;
        zoneId?: string;
        distributionId?: string;
    };
}

export interface CachingRule {
    id: string;
    pattern: string;
    ttl: number;
    browserTTL: number;
    edgeTTL: number;
    cacheLevel: 'bypass' | 'standard' | 'aggressive';
    conditions: {
        paths?: string[];
        extensions?: string[];
        userAgent?: string[];
        headers?: Record<string, string>;
    };
}

export interface EdgeLocation {
    id: string;
    region: string;
    city: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    capacity: {
        bandwidth: number;
        storage: number;
        computeUnits: number;
    };
    status: 'active' | 'maintenance' | 'offline';
    connectedUsers: number;
}

export interface TrafficDistribution {
    totalRequests: number;
    regionDistribution: Record<string, number>;
    responseTimeDistribution: Record<string, number>;
    errorRateByRegion: Record<string, number>;
    cachingEfficiency: {
        hitRate: number;
        missRate: number;
        bypassRate: number;
    };
}

/**
 * Enterprise Global Load Balancer
 * Handles intelligent traffic distribution for 10,000+ concurrent users
 */
export class EnterpriseGlobalLoadBalancer {
    private endpoints: Map<string, GlobalEndpoint> = new Map();
    private loadBalancingRules: Map<string, LoadBalancingRule> = new Map();
    private cdnConfiguration: CDNConfiguration;
    private healthCheckInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.cdnConfiguration = this.initializeCDNConfiguration();
        this.initializeGlobalEndpoints();
        this.initializeLoadBalancingRules();
        this.startHealthChecking();
    }

    /**
     * Initialize global endpoints for enterprise scale
     */
    private initializeGlobalEndpoints(): void {
        // Primary APAC region (Australia)
        this.endpoints.set('apac-primary', {
            region: 'australia-southeast2',
            url: 'https://apac.rankpilot.ai',
            capacity: 4000,
            currentLoad: 0,
            healthStatus: 'healthy',
            latency: {
                average: 45,
                p95: 75,
                p99: 120
            },
            features: ['primary-database', 'full-features', 'enterprise-support']
        });

        // Americas region (US Central)
        this.endpoints.set('americas-primary', {
            region: 'us-central1',
            url: 'https://us.rankpilot.ai',
            capacity: 3000,
            currentLoad: 0,
            healthStatus: 'healthy',
            latency: {
                average: 55,
                p95: 85,
                p99: 130
            },
            features: ['database-replica', 'full-features', 'business-hours-support']
        });

        // Europe region (West)
        this.endpoints.set('europe-primary', {
            region: 'europe-west1',
            url: 'https://eu.rankpilot.ai',
            capacity: 3000,
            currentLoad: 0,
            healthStatus: 'healthy',
            latency: {
                average: 60,
                p95: 90,
                p99: 140
            },
            features: ['database-replica', 'full-features', 'gdpr-compliant']
        });

        // Edge endpoints for API acceleration
        this.endpoints.set('edge-global', {
            region: 'global',
            url: 'https://api.rankpilot.ai',
            capacity: 10000,
            currentLoad: 0,
            healthStatus: 'healthy',
            latency: {
                average: 25,
                p95: 45,
                p99: 80
            },
            features: ['api-gateway', 'caching', 'ddos-protection']
        });
    }

    /**
     * Initialize intelligent load balancing rules
     */
    private initializeLoadBalancingRules(): void {
        // Main application load balancing
        this.loadBalancingRules.set('main-app', {
            id: 'main-app',
            name: 'Main Application Load Balancing',
            algorithm: 'intelligent-routing',
            healthChecks: {
                enabled: true,
                interval: '30s',
                timeout: '10s',
                healthyThreshold: 2,
                unhealthyThreshold: 3,
                path: '/health'
            },
            targets: [
                {
                    region: 'australia-southeast2',
                    endpoint: 'https://apac.rankpilot.ai',
                    weight: 40,
                    capacity: 4000,
                    latencyTarget: '50ms',
                    priority: 1
                },
                {
                    region: 'us-central1',
                    endpoint: 'https://us.rankpilot.ai',
                    weight: 30,
                    capacity: 3000,
                    latencyTarget: '75ms',
                    priority: 2
                },
                {
                    region: 'europe-west1',
                    endpoint: 'https://eu.rankpilot.ai',
                    weight: 30,
                    capacity: 3000,
                    latencyTarget: '75ms',
                    priority: 2
                }
            ],
            failover: {
                enabled: true,
                primaryRegion: 'australia-southeast2',
                failoverRegions: ['us-central1', 'europe-west1'],
                autoFailback: true
            }
        });

        // API-specific load balancing
        this.loadBalancingRules.set('api-gateway', {
            id: 'api-gateway',
            name: 'API Gateway Load Balancing',
            algorithm: 'geographic',
            healthChecks: {
                enabled: true,
                interval: '15s',
                timeout: '5s',
                healthyThreshold: 2,
                unhealthyThreshold: 2,
                path: '/api/health'
            },
            targets: [
                {
                    region: 'global',
                    endpoint: 'https://api.rankpilot.ai',
                    weight: 100,
                    capacity: 10000,
                    latencyTarget: '25ms',
                    priority: 1
                }
            ],
            failover: {
                enabled: true,
                primaryRegion: 'global',
                failoverRegions: ['australia-southeast2', 'us-central1'],
                autoFailback: true
            }
        });
    }

    /**
     * Initialize CDN configuration for global distribution
     */
    private initializeCDNConfiguration(): CDNConfiguration {
        return {
            providers: [
                {
                    name: 'CloudFlare',
                    regions: ['global'],
                    capabilities: ['ddos-protection', 'edge-computing', 'ssl-termination', 'bot-management'],
                    priority: 1,
                    configuration: {
                        zoneId: process.env.CLOUDFLARE_ZONE_ID
                    }
                },
                {
                    name: 'Google Cloud CDN',
                    regions: ['apac', 'americas', 'europe'],
                    capabilities: ['firebase-integration', 'auto-scaling', 'global-anycast'],
                    priority: 2,
                    configuration: {
                        // Google Cloud CDN configuration would go here
                    }
                },
                {
                    name: 'AWS CloudFront',
                    regions: ['global'],
                    capabilities: ['lambda-edge', 'real-time-logs', 'origin-shield'],
                    priority: 3,
                    configuration: {
                        distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID
                    }
                }
            ],

            cachingRules: [
                {
                    id: 'static-assets',
                    pattern: '/static/*',
                    ttl: 86400,      // 24 hours
                    browserTTL: 3600, // 1 hour
                    edgeTTL: 86400,   // 24 hours
                    cacheLevel: 'aggressive',
                    conditions: {
                        extensions: ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2']
                    }
                },
                {
                    id: 'api-responses',
                    pattern: '/api/*',
                    ttl: 300,        // 5 minutes
                    browserTTL: 60,  // 1 minute
                    edgeTTL: 300,    // 5 minutes
                    cacheLevel: 'standard',
                    conditions: {
                        paths: ['/api/neuroseo/cached', '/api/keywords/public']
                    }
                },
                {
                    id: 'dynamic-content',
                    pattern: '/dashboard/*',
                    ttl: 0,          // No caching
                    browserTTL: 0,   // No browser cache
                    edgeTTL: 0,      // No edge cache
                    cacheLevel: 'bypass',
                    conditions: {
                        paths: ['/dashboard', '/settings', '/profile']
                    }
                },
                {
                    id: 'reports-cache',
                    pattern: '/reports/*',
                    ttl: 1800,       // 30 minutes
                    browserTTL: 300, // 5 minutes
                    edgeTTL: 1800,   // 30 minutes
                    cacheLevel: 'standard',
                    conditions: {
                        headers: { 'Cache-Control': 'public' }
                    }
                }
            ],

            edgeLocations: [
                {
                    id: 'sydney-1',
                    region: 'apac',
                    city: 'Sydney',
                    coordinates: { latitude: -33.8688, longitude: 151.2093 },
                    capacity: { bandwidth: 10000, storage: 1000, computeUnits: 500 },
                    status: 'active',
                    connectedUsers: 0
                },
                {
                    id: 'singapore-1',
                    region: 'apac',
                    city: 'Singapore',
                    coordinates: { latitude: 1.3521, longitude: 103.8198 },
                    capacity: { bandwidth: 8000, storage: 800, computeUnits: 400 },
                    status: 'active',
                    connectedUsers: 0
                },
                {
                    id: 'los-angeles-1',
                    region: 'americas',
                    city: 'Los Angeles',
                    coordinates: { latitude: 34.0522, longitude: -118.2437 },
                    capacity: { bandwidth: 12000, storage: 1200, computeUnits: 600 },
                    status: 'active',
                    connectedUsers: 0
                },
                {
                    id: 'new-york-1',
                    region: 'americas',
                    city: 'New York',
                    coordinates: { latitude: 40.7128, longitude: -74.0060 },
                    capacity: { bandwidth: 15000, storage: 1500, computeUnits: 750 },
                    status: 'active',
                    connectedUsers: 0
                },
                {
                    id: 'london-1',
                    region: 'europe',
                    city: 'London',
                    coordinates: { latitude: 51.5074, longitude: -0.1278 },
                    capacity: { bandwidth: 10000, storage: 1000, computeUnits: 500 },
                    status: 'active',
                    connectedUsers: 0
                },
                {
                    id: 'frankfurt-1',
                    region: 'europe',
                    city: 'Frankfurt',
                    coordinates: { latitude: 50.1109, longitude: 8.6821 },
                    capacity: { bandwidth: 8000, storage: 800, computeUnits: 400 },
                    status: 'active',
                    connectedUsers: 0
                }
            ],

            optimizationSettings: {
                imageOptimization: true,
                cssMinification: true,
                jsMinification: true,
                gzipCompression: true,
                brotliCompression: true
            }
        };
    }

    /**
     * Get optimal endpoint for user based on location and current load
     */
    async getOptimalEndpoint(userLocation: {
        latitude: number;
        longitude: number;
        country?: string;
        region?: string;
    }): Promise<{
        endpoint: GlobalEndpoint;
        estimatedLatency: number;
        loadBalancingRule: string;
        reason: string;
    }> {
        // Find the best endpoint based on multiple factors
        const candidates = Array.from(this.endpoints.values())
            .filter(endpoint => endpoint.healthStatus === 'healthy')
            .map(endpoint => ({
                endpoint,
                distance: this.calculateDistance(userLocation, this.getEndpointLocation(endpoint)),
                loadScore: this.calculateLoadScore(endpoint),
                latencyScore: this.calculateLatencyScore(endpoint, userLocation),
                capacityScore: this.calculateCapacityScore(endpoint)
            }))
            .sort((a, b) => {
                // Weighted scoring: 40% latency, 30% load, 20% capacity, 10% distance
                const scoreA = (a.latencyScore * 0.4) + (a.loadScore * 0.3) + (a.capacityScore * 0.2) + ((1 - a.distance / 20000) * 0.1);
                const scoreB = (b.latencyScore * 0.4) + (b.loadScore * 0.3) + (b.capacityScore * 0.2) + ((1 - b.distance / 20000) * 0.1);
                return scoreB - scoreA;
            });

        if (candidates.length === 0) {
            throw new Error('No healthy endpoints available');
        }

        const best = candidates[0];
        const estimatedLatency = this.estimateLatency(best.endpoint, userLocation);

        return {
            endpoint: best.endpoint,
            estimatedLatency,
            loadBalancingRule: this.determineLoadBalancingRule(best.endpoint),
            reason: this.generateSelectionReason(best, candidates.slice(1, 3))
        };
    }

    /**
     * Handle failover when primary endpoint becomes unhealthy
     */
    async handleFailover(unhealthyEndpoint: string): Promise<{
        failoverEndpoint: GlobalEndpoint;
        affectedUsers: number;
        estimatedRecoveryTime: number;
        actions: string[];
    }> {
        const endpoint = this.endpoints.get(unhealthyEndpoint);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${unhealthyEndpoint}`);
        }

        // Mark endpoint as unhealthy
        endpoint.healthStatus = 'unhealthy';

        // Find best failover candidate
        const failoverCandidates = Array.from(this.endpoints.values())
            .filter(e =>
                e.healthStatus === 'healthy' &&
                e.region !== endpoint.region &&
                e.capacity > e.currentLoad * 1.5 // Ensure sufficient capacity
            )
            .sort((a, b) => {
                // Prioritize by capacity and performance
                const scoreA = (a.capacity - a.currentLoad) * 0.6 + (1 / a.latency.average) * 0.4;
                const scoreB = (b.capacity - b.currentLoad) * 0.6 + (1 / b.latency.average) * 0.4;
                return scoreB - scoreA;
            });

        if (failoverCandidates.length === 0) {
            throw new Error('No suitable failover endpoints available');
        }

        const failoverEndpoint = failoverCandidates[0];
        const affectedUsers = endpoint.currentLoad;

        // Estimate recovery time based on complexity
        const estimatedRecoveryTime = this.estimateFailoverTime(endpoint, failoverEndpoint);

        // Generate action plan
        const actions = [
            `Redirect traffic from ${endpoint.region} to ${failoverEndpoint.region}`,
            'Update DNS records with reduced TTL',
            'Notify monitoring systems of failover event',
            'Scale up failover endpoint capacity',
            'Begin health recovery procedures for failed endpoint'
        ];

        // Execute failover
        await this.executeFailover(endpoint, failoverEndpoint);

        return {
            failoverEndpoint,
            affectedUsers,
            estimatedRecoveryTime,
            actions
        };
    }

    /**
     * Optimize caching strategy based on traffic patterns
     */
    async optimizeCaching(trafficAnalysis: {
        requestPatterns: Record<string, number>;
        cacheHitRates: Record<string, number>;
        userRegions: Record<string, number>;
    }): Promise<{
        optimizedRules: CachingRule[];
        expectedImprovement: {
            hitRateIncrease: number;
            latencyReduction: number;
            bandwidthSavings: number;
        };
        implementationPlan: string[];
    }> {
        const optimizedRules: CachingRule[] = [];

        // Analyze current cache performance
        const currentHitRate = Object.values(trafficAnalysis.cacheHitRates)
            .reduce((sum, rate) => sum + rate, 0) / Object.keys(trafficAnalysis.cacheHitRates).length;

        // Optimize rules based on request patterns
        for (const [pattern, requestCount] of Object.entries(trafficAnalysis.requestPatterns)) {
            const currentRule = this.cdnConfiguration.cachingRules.find(r =>
                pattern.includes(r.pattern.replace('*', ''))
            );

            if (!currentRule) continue;

            const optimizedRule = { ...currentRule };

            // High-traffic patterns get longer cache times
            if (requestCount > 1000) {
                optimizedRule.ttl = Math.min(optimizedRule.ttl * 2, 86400); // Max 24 hours
                optimizedRule.edgeTTL = Math.min(optimizedRule.edgeTTL * 2, 86400);
            }

            // Low hit rate patterns get adjusted cache levels
            const hitRate = trafficAnalysis.cacheHitRates[pattern] || 0;
            if (hitRate < 0.5) {
                optimizedRule.cacheLevel = 'standard';
                optimizedRule.ttl = Math.max(optimizedRule.ttl * 0.5, 300); // Min 5 minutes
            }

            optimizedRules.push(optimizedRule);
        }

        // Add new rules for high-traffic patterns without existing rules
        for (const [pattern, requestCount] of Object.entries(trafficAnalysis.requestPatterns)) {
            if (requestCount > 500 && !optimizedRules.find(r => pattern.includes(r.pattern.replace('*', '')))) {
                optimizedRules.push({
                    id: `auto-${pattern.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    pattern: `/${pattern}/*`,
                    ttl: 3600,      // 1 hour
                    browserTTL: 1800, // 30 minutes
                    edgeTTL: 3600,   // 1 hour
                    cacheLevel: 'standard',
                    conditions: {
                        paths: [`/${pattern}`]
                    }
                });
            }
        }

        const expectedImprovement = {
            hitRateIncrease: Math.min(0.3, (1 - currentHitRate) * 0.5), // Up to 30% improvement
            latencyReduction: 0.25, // 25% latency reduction from better caching
            bandwidthSavings: 0.35  // 35% bandwidth savings
        };

        const implementationPlan = [
            'Deploy optimized caching rules to edge locations',
            'Update CDN provider configurations',
            'Monitor cache hit rate improvements',
            'Adjust rules based on performance data',
            'Roll out to all edge locations'
        ];

        return {
            optimizedRules,
            expectedImprovement,
            implementationPlan
        };
    }

    /**
     * Get comprehensive traffic distribution analytics
     */
    async getTrafficDistribution(timeRange: {
        start: Date;
        end: Date;
    }): Promise<TrafficDistribution> {
        // Mock implementation - in production would fetch real analytics
        const totalRequests = 1500000; // 1.5M requests in time range

        const regionDistribution = {
            'australia-southeast2': 0.35, // 35% APAC
            'us-central1': 0.32,          // 32% Americas
            'europe-west1': 0.28,         // 28% Europe
            'global': 0.05                // 5% Edge/API
        };

        const responseTimeDistribution = {
            '<100ms': 0.45,    // 45% under 100ms
            '100-200ms': 0.30, // 30% between 100-200ms
            '200-500ms': 0.20, // 20% between 200-500ms
            '>500ms': 0.05     // 5% over 500ms
        };

        const errorRateByRegion = {
            'australia-southeast2': 0.001, // 0.1% error rate
            'us-central1': 0.002,          // 0.2% error rate
            'europe-west1': 0.0015,        // 0.15% error rate
            'global': 0.0005               // 0.05% error rate
        };

        return {
            totalRequests,
            regionDistribution: Object.fromEntries(
                Object.entries(regionDistribution).map(([region, percent]) =>
                    [region, Math.floor(totalRequests * percent)]
                )
            ),
            responseTimeDistribution: Object.fromEntries(
                Object.entries(responseTimeDistribution).map(([range, percent]) =>
                    [range, Math.floor(totalRequests * percent)]
                )
            ),
            errorRateByRegion: Object.fromEntries(
                Object.entries(errorRateByRegion).map(([region, rate]) =>
                    [region, Math.floor(totalRequests * regionDistribution[region as keyof typeof regionDistribution] * rate)]
                )
            ),
            cachingEfficiency: {
                hitRate: 0.75,   // 75% cache hit rate
                missRate: 0.20,  // 20% cache miss rate
                bypassRate: 0.05 // 5% cache bypass rate
            }
        };
    }

    /**
     * Scale endpoint capacity based on demand
     */
    async scaleEndpointCapacity(
        endpointId: string,
        targetCapacity: number,
        reason: string
    ): Promise<{
        success: boolean;
        previousCapacity: number;
        newCapacity: number;
        scalingTime: number;
    }> {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${endpointId}`);
        }

        const previousCapacity = endpoint.capacity;
        const startTime = Date.now();

        // Simulate scaling operation
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second scaling time

        // Update endpoint capacity
        endpoint.capacity = targetCapacity;

        const scalingTime = Date.now() - startTime;

        console.log(`Scaled endpoint ${endpointId} from ${previousCapacity} to ${targetCapacity} capacity. Reason: ${reason}`);

        return {
            success: true,
            previousCapacity,
            newCapacity: targetCapacity,
            scalingTime
        };
    }

    // Private helper methods
    private startHealthChecking(): void {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, 30000); // Check every 30 seconds
    }

    private async performHealthChecks(): Promise<void> {
        for (const [id, endpoint] of this.endpoints) {
            try {
                const healthStatus = await this.checkEndpointHealth(endpoint);
                endpoint.healthStatus = healthStatus;

                if (healthStatus === 'unhealthy') {
                    console.warn(`Endpoint ${id} is unhealthy - triggering failover`);
                    await this.handleFailover(id);
                }
            } catch (_error) {
                console.error(`Health check failed for endpoint ${id}:`, _error);
                endpoint.healthStatus = 'unhealthy';
            }
        }
    }

    private async checkEndpointHealth(endpoint: GlobalEndpoint): Promise<'healthy' | 'degraded' | 'unhealthy'> {
        // Mock health check - in production would make actual HTTP requests
        const randomHealth = Math.random();

        if (randomHealth > 0.95) return 'unhealthy';   // 5% chance unhealthy
        if (randomHealth > 0.85) return 'degraded';   // 10% chance degraded
        return 'healthy';                              // 85% chance healthy
    }

    private calculateDistance(
        point1: { latitude: number; longitude: number; },
        point2: { latitude: number; longitude: number; }
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(point2.latitude - point1.latitude);
        const dLon = this.toRadians(point2.longitude - point1.longitude);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private getEndpointLocation(endpoint: GlobalEndpoint): { latitude: number; longitude: number; } {
        // Map regions to approximate coordinates
        const regionCoordinates = {
            'australia-southeast2': { latitude: -33.8688, longitude: 151.2093 },
            'us-central1': { latitude: 41.2619, longitude: -95.8608 },
            'europe-west1': { latitude: 50.4501, longitude: 3.8196 },
            'global': { latitude: 0, longitude: 0 } // Global endpoint - use origin
        };

        return regionCoordinates[endpoint.region as keyof typeof regionCoordinates] ||
            { latitude: 0, longitude: 0 };
    }

    private calculateLoadScore(endpoint: GlobalEndpoint): number {
        const utilization = endpoint.currentLoad / endpoint.capacity;
        return Math.max(0, 1 - utilization); // Higher score for lower utilization
    }

    private calculateLatencyScore(endpoint: GlobalEndpoint, userLocation: { latitude: number; longitude: number; }): number {
        const baseLatency = endpoint.latency.average;
        const distance = this.calculateDistance(userLocation, this.getEndpointLocation(endpoint));
        const estimatedLatency = baseLatency + (distance * 0.01); // Add 0.01ms per km

        return Math.max(0, 1 - (estimatedLatency / 500)); // Normalize against 500ms
    }

    private calculateCapacityScore(endpoint: GlobalEndpoint): number {
        const availableCapacity = endpoint.capacity - endpoint.currentLoad;
        return Math.min(1, availableCapacity / 1000); // Normalize against 1000 capacity units
    }

    private estimateLatency(endpoint: GlobalEndpoint, userLocation: { latitude: number; longitude: number; }): number {
        const baseLatency = endpoint.latency.average;
        const distance = this.calculateDistance(userLocation, this.getEndpointLocation(endpoint));
        return baseLatency + (distance * 0.01); // Add 0.01ms per km
    }

    private determineLoadBalancingRule(endpoint: GlobalEndpoint): string {
        if (endpoint.features.includes('api-gateway')) {
            return 'api-gateway';
        }
        return 'main-app';
    }

    private generateSelectionReason(
        selected: {
            latencyScore: number;
            loadScore: number;
            capacityScore: number;
            distance: number;
        },
        alternatives: {
            latencyScore: number;
            loadScore: number;
            capacityScore: number;
            distance: number;
        }[]
    ): string {
        const reasons = [];

        if (selected.latencyScore > 0.8) {
            reasons.push('optimal latency');
        }

        if (selected.loadScore > 0.7) {
            reasons.push('low current load');
        }

        if (selected.capacityScore > 0.8) {
            reasons.push('high available capacity');
        }

        if (selected.distance < 5000) {
            reasons.push('geographic proximity');
        }

        return `Selected for: ${reasons.join(', ')}`;
    }

    private estimateFailoverTime(
        failedEndpoint: GlobalEndpoint,
        failoverEndpoint: GlobalEndpoint
    ): number {
        // Base failover time
        let estimatedTime = 60; // 1 minute base time

        // Add time based on affected user count
        estimatedTime += Math.ceil(failedEndpoint.currentLoad / 100) * 5; // 5 seconds per 100 users

        // Add time based on regional distance
        const distance = this.calculateDistance(
            this.getEndpointLocation(failedEndpoint),
            this.getEndpointLocation(failoverEndpoint)
        );
        estimatedTime += Math.ceil(distance / 1000) * 2; // 2 seconds per 1000km

        return estimatedTime;
    }

    private async executeFailover(
        failedEndpoint: GlobalEndpoint,
        failoverEndpoint: GlobalEndpoint
    ): Promise<void> {
        // Transfer load to failover endpoint
        failoverEndpoint.currentLoad += failedEndpoint.currentLoad;
        failedEndpoint.currentLoad = 0;

        // Update load balancing rules
        for (const rule of this.loadBalancingRules.values()) {
            const failedTarget = rule.targets.find(t => t.region === failedEndpoint.region);
            const failoverTarget = rule.targets.find(t => t.region === failoverEndpoint.region);

            if (failedTarget && failoverTarget) {
                // Redistribute weights
                failoverTarget.weight += failedTarget.weight;
                failedTarget.weight = 0;
            }
        }

        console.log(`Executed failover from ${failedEndpoint.region} to ${failoverEndpoint.region}`);
    }
}
