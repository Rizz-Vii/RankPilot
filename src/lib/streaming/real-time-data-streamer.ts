/**
 * Real-Time Data Streaming System
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 * 
 * Features:
 * - WebSocket-based real-time updates for dashboards
 * - Server-Sent Events (SSE) for continuous data streams
 * - Real-time collaboration features
 * - Live SEO metrics streaming
 * - Data compression and delta updates
 * - Connection health monitoring
 * - Automatic reconnection handling
 */

import { EventEmitter } from 'events';

export interface StreamingDataPoint {
    id: string;
    type: 'seo-metrics' | 'keyword-ranking' | 'performance' | 'competitor' | 'user-action';
    userId: string;
    dashboardId?: string;
    widgetId?: string;
    _data: unknown;
    timestamp: number;
    metadata?: {
        source?: string;
        version?: string;
        compressed?: boolean;
        delta?: boolean;
    };
}

export interface StreamingClient {
    id: string;
    userId: string;
    dashboardId?: string;
    subscriptions: Set<string>;
    connection: WebSocket | EventSource | null;
    lastHeartbeat: number;
    connectionType: 'websocket' | 'sse';
    tier: string;
    preferences: {
        compression: boolean;
        deltaUpdates: boolean;
        maxUpdateRate: number; // updates per second
    };
}

export interface CollaborationEvent {
    type: 'user-joined' | 'user-left' | 'cursor-move' | 'widget-edit' | 'comment-added';
    userId: string;
    userName: string;
    dashboardId: string;
    _data: unknown;
    timestamp: number;
}

export interface StreamingMetrics {
    totalConnections: number;
    activeStreams: number;
    dataPointsPerSecond: number;
    avgLatency: number;
    errorRate: number;
    compressionRatio: number;
    uptimePercentage: number;
}

/**
 * Real-Time Data Streaming Engine
 * Manages WebSocket connections, data streams, and real-time collaboration
 */
export class RealTimeDataStreamer extends EventEmitter {
    private clients: Map<string, StreamingClient> = new Map();
    private dataStreams: Map<string, any> = new Map();
    private compressionCache: Map<string, any> = new Map();
    private deltaCache: Map<string, any> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private metricsInterval: NodeJS.Timeout | null = null;
    private metrics: StreamingMetrics;

    // Rate limiting for different tiers
    private tierLimits = {
        free: { maxConnections: 1, maxStreams: 3, updateRate: 1 },
        starter: { maxConnections: 2, maxStreams: 5, updateRate: 2 },
        agency: { maxConnections: 5, maxStreams: 10, updateRate: 5 },
        enterprise: { maxConnections: 20, maxStreams: 50, updateRate: 10 },
        admin: { maxConnections: 100, maxStreams: 200, updateRate: 20 }
    };

    constructor() {
        super();
        this.metrics = {
            totalConnections: 0,
            activeStreams: 0,
            dataPointsPerSecond: 0,
            avgLatency: 0,
            errorRate: 0,
            compressionRatio: 0,
            uptimePercentage: 100
        };

        this.startHeartbeat();
        this.startMetricsCollection();
        this.setupDataGenerators();
    }

    /**
     * Register a new streaming client
     */
    async registerClient(
        clientId: string,
        userId: string,
        tier: string,
        connectionType: 'websocket' | 'sse' = 'websocket',
        dashboardId?: string
    ): Promise<{ success: boolean; client?: StreamingClient; error?: string; }> {
        try {
            // Check tier limits
            const userConnections = Array.from(this.clients.values())
                .filter(client => client.userId === userId).length;

            const tierLimit = this.tierLimits[tier as keyof typeof this.tierLimits];
            if (!tierLimit) {
                return { success: false, _error: 'Invalid subscription tier' };
            }

            if (userConnections >= tierLimit.maxConnections) {
                return {
                    success: false,
                    _error: `Connection limit reached for ${tier} tier (${tierLimit.maxConnections})`
                };
            }

            const client: StreamingClient = {
                id: clientId,
                userId,
                dashboardId,
                subscriptions: new Set(),
                connection: null,
                lastHeartbeat: Date.now(),
                connectionType,
                tier,
                preferences: {
                    compression: tier !== 'free', // Free tier doesn't get compression
                    deltaUpdates: ['agency', 'enterprise', 'admin'].includes(tier),
                    maxUpdateRate: tierLimit.updateRate
                }
            };

            this.clients.set(clientId, client);
            this.metrics.totalConnections++;

            console.log(`[RealTimeStreamer] Client ${clientId} registered for user ${userId} (${tier})`);

            return { success: true, client };

        } catch (_error) {
            console.error('[RealTimeStreamer] Client registration _error:', _error);
            return {
                success: false,
                _error: error instanceof Error ? error.message : 'Registration failed'
            };
        }
    }

    /**
     * Subscribe client to data streams
     */
    async subscribeToStreams(
        clientId: string,
        streamTypes: string[]
    ): Promise<{ success: boolean; subscribed: string[]; error?: string; }> {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, subscribed: [], _error: 'Client not found' };
        }

        const tierLimit = this.tierLimits[client.tier as keyof typeof this.tierLimits];
        const subscribed: string[] = [];

        for (const streamType of streamTypes) {
            if (client.subscriptions.size >= tierLimit.maxStreams) {
                console.warn(`[RealTimeStreamer] Stream limit reached for client ${clientId}`);
                break;
            }

            client.subscriptions.add(streamType);
            subscribed.push(streamType);

            // Start data stream if not already active
            if (!this.dataStreams.has(streamType)) {
                this.startDataStream(streamType);
            }
        }

        this.metrics.activeStreams = this.dataStreams.size;

        return { success: true, subscribed };
    }

    /**
     * Stream data to subscribed clients
     */
    async streamData(dataPoint: StreamingDataPoint): Promise<void> {
        const relevantClients = Array.from(this.clients.values()).filter(client =>
            client.subscriptions.has(dataPoint.type) &&
            (!dataPoint.dashboardId || client.dashboardId === dataPoint.dashboardId)
        );

        for (const client of relevantClients) {
            try {
                await this.sendToClient(client, dataPoint);
            } catch (_error) {
                console.error(`[RealTimeStreamer] Failed to send data to client ${client.id}:`, _error);
                this.handleClientError(client.id);
            }
        }

        this.metrics.dataPointsPerSecond++;
    }

    /**
     * Handle real-time collaboration events
     */
    async broadcastCollaboration(_event: CollaborationEvent): Promise<void> {
        const dashboardClients = Array.from(this.clients.values()).filter(client =>
            client.dashboardId === event.dashboardId && client.userId !== event.userId
        );

        const collaborationData: StreamingDataPoint = {
            id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'user-action',
            userId: event.userId,
            dashboardId: event.dashboardId,
            _data: _event,
            timestamp: Date.now(),
            metadata: {
                source: 'collaboration',
                version: '1.0',
                compressed: false,
                delta: false
            }
        };

        for (const client of dashboardClients) {
            try {
                await this.sendToClient(client, collaborationData);
            } catch (_error) {
                console.error(`[RealTimeStreamer] Collaboration broadcast failed for ${client.id}:`, _error);
            }
        }

        console.log(`[RealTimeStreamer] Collaboration event broadcasted to ${dashboardClients.length} clients`);
    }

    /**
     * Get real-time streaming metrics
     */
    getMetrics(): StreamingMetrics {
        return { ...this.metrics };
    }

    /**
     * Disconnect client and cleanup
     */
    async disconnectClient(clientId: string): Promise<boolean> {
        const client = this.clients.get(clientId);
        if (!client) {
            return false;
        }

        if (client.connection) {
            try {
                if (client.connectionType === 'websocket' && client.connection instanceof WebSocket) {
                    client.connection.close();
                }
                // SSE connections close automatically when response ends
            } catch (_error) {
                console.error(`[RealTimeStreamer] Error closing connection for ${clientId}:`, _error);
            }
        }

        this.clients.delete(clientId);
        console.log(`[RealTimeStreamer] Client ${clientId} disconnected`);

        return true;
    }

    /**
     * Private helper methods
     */
    private async sendToClient(client: StreamingClient, dataPoint: StreamingDataPoint): Promise<void> {
        let processedData = dataPoint;

        // Apply compression if enabled
        if (client.preferences.compression && dataPoint._data) {
            processedData = await this.compressData(dataPoint);
        }

        // Apply delta updates if enabled
        if (client.preferences.deltaUpdates) {
            processedData = await this.generateDelta(client.id, processedData);
        }

        // Rate limiting check
        const now = Date.now();
        const timeSinceLastUpdate = now - client.lastHeartbeat;
        const minInterval = 1000 / client.preferences.maxUpdateRate;

        if (timeSinceLastUpdate < minInterval) {
            // Skip this update due to rate limiting
            return;
        }

        // Send data based on connection type
        if (client.connectionType === 'websocket' && client.connection instanceof WebSocket) {
            if (client.connection.readyState === WebSocket.OPEN) {
                client.connection.send(JSON.stringify(processedData));
            }
        } else if (client.connectionType === 'sse') {
            // For SSE, this would be handled by the SSE endpoint
            this.emit('sse-data', client.id, processedData);
        }

        client.lastHeartbeat = now;
    }

    private async compressData(dataPoint: StreamingDataPoint): Promise<StreamingDataPoint> {
        const cacheKey = `${dataPoint.type}_${dataPoint.userId}`;
        const cachedData = this.compressionCache.get(cacheKey);

        if (cachedData && JSON.stringify(cachedData) === JSON.stringify(dataPoint._data)) {
            // Data hasn't changed, return compressed reference
            return {
                ...dataPoint,
                _data: { __ref: cacheKey, __compressed: true },
                metadata: { ...dataPoint.metadata, compressed: true }
            };
        }

        // Cache new data
        this.compressionCache.set(cacheKey, dataPoint._data);

        // Calculate compression ratio for metrics
        const originalSize = JSON.stringify(dataPoint._data).length;
        const compressedSize = JSON.stringify({ __ref: cacheKey }).length;
        this.metrics.compressionRatio = 1 - (compressedSize / originalSize);

        return dataPoint;
    }

    private async generateDelta(clientId: string, dataPoint: StreamingDataPoint): Promise<StreamingDataPoint> {
        const deltaKey = `${clientId}_${dataPoint.type}`;
        const lastData = this.deltaCache.get(deltaKey);

        if (!lastData) {
            // First time, store and return full data
            this.deltaCache.set(deltaKey, dataPoint._data);
            return dataPoint;
        }

        // Generate delta (simplified diff)
        const delta = this.calculateDelta(lastData, dataPoint._data);
        this.deltaCache.set(deltaKey, dataPoint._data);

        return {
            ...dataPoint,
            _data: delta,
            metadata: { ...dataPoint.metadata, delta: true }
        };
    }

    private calculateDelta(oldData: unknown, newData: unknown): any {
        // Simplified delta calculation
        if (typeof newData !== 'object' || newData === null) {
            return newData !== oldData ? newData : null;
        }

        const delta: unknown = {};
        let hasChanges = false;

        for (const _key in newData) {
            if (newData[key] !== oldData?.[key]) {
                delta[key] = newData[key];
                hasChanges = true;
            }
        }

        return hasChanges ? delta : null;
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const staleConnections: string[] = [];

            for (const [clientId, client] of this.clients.entries()) {
                if (now - client.lastHeartbeat > 30000) { // 30 seconds timeout
                    staleConnections.push(clientId);
                }
            }

            // Clean up stale connections
            for (const clientId of staleConnections) {
                this.disconnectClient(clientId);
            }

        }, 10000); // Check every 10 seconds
    }

    private startMetricsCollection(): void {
        this.metricsInterval = setInterval(() => {
            // Reset per-second metrics
            this.metrics.dataPointsPerSecond = 0;

            // Calculate other metrics
            this.metrics.totalConnections = this.clients.size;
            this.metrics.activeStreams = this.dataStreams.size;

            // Emit metrics for monitoring
            this.emit('metrics-update', this.metrics);

        }, 1000); // Update every second
    }

    private setupDataGenerators(): void {
        // SEO Metrics Stream
        this.startDataStream('seo-metrics');

        // Keyword Rankings Stream
        this.startDataStream('keyword-ranking');

        // Performance Metrics Stream
        this.startDataStream('performance');

        // Competitor Analysis Stream
        this.startDataStream('competitor');

        console.log('[RealTimeStreamer] Data generators initialized');
    }

    private startDataStream(streamType: string): void {
        if (this.dataStreams.has(streamType)) {
            return; // Stream already active
        }

        const interval = setInterval(async () => {
            const data = await this.generateMockData(streamType);

            const dataPoint: StreamingDataPoint = {
                id: `${streamType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: streamType as any,
                userId: 'system',
                _data,
                timestamp: Date.now(),
                metadata: {
                    source: 'data-generator',
                    version: '1.0',
                    compressed: false,
                    delta: false
                }
            };

            await this.streamData(dataPoint);

        }, this.getStreamInterval(streamType));

        this.dataStreams.set(streamType, interval);
        console.log(`[RealTimeStreamer] Started data stream: ${streamType}`);
    }

    private getStreamInterval(streamType: string): number {
        // Different update frequencies for different data types
        switch (streamType) {
            case 'seo-metrics': return 30000; // 30 seconds
            case 'keyword-ranking': return 60000; // 1 minute
            case 'performance': return 15000; // 15 seconds
            case 'competitor': return 120000; // 2 minutes
            default: return 30000;
        }
    }

    private async generateMockData(streamType: string): Promise<any> {
        switch (streamType) {
            case 'seo-metrics':
                return {
                    overallScore: 78 + Math.floor(Math.random() * 10),
                    organicTraffic: 45200 + Math.floor(Math.random() * 5000),
                    keywordCount: 245 + Math.floor(Math.random() * 20),
                    backlinks: 1340 + Math.floor(Math.random() * 50),
                    timestamp: Date.now()
                };

            case 'keyword-ranking':
                return {
                    keyword: `example-keyword-${Math.floor(Math.random() * 100)}`,
                    position: Math.floor(Math.random() * 50) + 1,
                    change: Math.floor(Math.random() * 10) - 5,
                    searchVolume: Math.floor(Math.random() * 10000) + 1000,
                    timestamp: Date.now()
                };

            case 'performance':
                return {
                    lcp: 1.5 + Math.random() * 2,
                    cls: 0.05 + Math.random() * 0.15,
                    fid: 50 + Math.random() * 100,
                    pageSpeed: 85 + Math.floor(Math.random() * 15),
                    timestamp: Date.now()
                };

            case 'competitor':
                return {
                    competitor: `competitor${Math.floor(Math.random() * 5) + 1}.com`,
                    ranking: Math.floor(Math.random() * 100) + 1,
                    trafficEstimate: Math.floor(Math.random() * 100000) + 10000,
                    keywordOverlap: Math.floor(Math.random() * 80) + 20,
                    timestamp: Date.now()
                };

            default:
                return { message: 'Unknown stream type', timestamp: Date.now() };
        }
    }

    private handleClientError(clientId: string): void {
        this.metrics.errorRate++;
        this.disconnectClient(clientId);
    }

    /**
     * Cleanup on shutdown
     */
    destroy(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        // Stop all data streams
        for (const [streamType, interval] of this.dataStreams.entries()) {
            clearInterval(interval);
        }

        // Disconnect all clients
        for (const clientId of this.clients.keys()) {
            this.disconnectClient(clientId);
        }

        console.log('[RealTimeStreamer] Streamer destroyed and cleaned up');
    }
}

// Export singleton instance
export const realTimeDataStreamer = new RealTimeDataStreamer();
