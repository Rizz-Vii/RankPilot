/**
 * AI-Powered Anomaly Detection System
 * Phase 5 Priority 1: Machine learning-based system health monitoring
 */

import { EventEmitter } from 'events';

export interface AnomalyPattern {
    id: string;
    name: string;
    description: string;
    type: 'statistical' | 'seasonal' | 'trending' | 'threshold' | 'ml_model';
    parameters: Record<string, any>;
    sensitivity: number;
    confidence_threshold: number;
    enabled: boolean;
    created_at: number;
    last_updated: number;
}

export interface DataPoint {
    timestamp: number;
    value: number;
    metadata?: Record<string, any>;
}

export interface Anomaly {
    id: string;
    pattern_id: string;
    timestamp: number;
    value: number;
    expected_value: number;
    deviation_score: number;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggested_actions: string[];
    metadata: Record<string, any>;
    acknowledged: boolean;
    resolved: boolean;
    resolution_time?: number;
}

export interface PredictionResult {
    metric: string;
    current_value: number;
    predicted_values: Array<{
        timestamp: number;
        value: number;
        confidence_interval: [number, number];
    }>;
    trend: 'up' | 'down' | 'stable';
    change_rate: number;
    confidence: number;
    factors: Array<{
        name: string;
        influence: number;
        description: string;
    }>;
}

export interface ScalingRecommendation {
    resource: string;
    current_usage: number;
    predicted_usage: number;
    recommended_action: 'scale_up' | 'scale_down' | 'maintain';
    confidence: number;
    time_to_action: number;
    cost_impact: {
        current_cost: number;
        predicted_cost: number;
        savings_potential: number;
    };
    reasoning: string;
}

export class AIAnomalyDetector extends EventEmitter {
    private patterns: Map<string, AnomalyPattern> = new Map();
    private dataHistory: Map<string, DataPoint[]> = new Map();
    private anomalies: Map<string, Anomaly> = new Map();
    private models: Map<string, any> = new Map();
    private isAnalyzing: boolean = false;
    private analysisInterval?: ReturnType<typeof setInterval>;

    constructor() {
        super();
        this.initializeDefaultPatterns();
    }

    /**
     * Start anomaly detection analysis
     */
    startAnalysis(intervalMs: number = 60000): void {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.analysisInterval = setInterval(() => {
            this.runAnomalyDetection();
        }, intervalMs);

        this.emit('analysis-started');
    }

    /**
     * Stop anomaly detection analysis
     */
    stopAnalysis(): void {
        if (!this.isAnalyzing) return;

        this.isAnalyzing = false;
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = undefined;
        }

        this.emit('analysis-stopped');
    }

    /**
     * Cleanup old anomalies to prevent memory growth
     */
    private cleanupOldAnomalies(): void {
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        for (const [id, anomaly] of this.anomalies.entries()) {
            if (anomaly.timestamp < twentyFourHoursAgo) {
                this.anomalies.delete(id);
            }
        }
    }

    /**
     * Complete cleanup - dispose of all data and stop analysis
     */
    dispose(): void {
        this.stopAnalysis();
        this.dataHistory.clear();
        this.anomalies.clear();
        this.patterns.clear();
        this.models.clear();
        this.removeAllListeners();
    }

    /**
     * Add data point for analysis
     */
    addDataPoint(metric: string, dataPoint: DataPoint): void {
        if (!this.dataHistory.has(metric)) {
            this.dataHistory.set(metric, []);
        }

        const history = this.dataHistory.get(metric)!;
        history.push(dataPoint);

        // Keep only last 1000 data points per metric (reduced from 10000)
        if (history.length > 1000) {
            // Remove older data points more aggressively
            history.splice(0, history.length - 1000);
        }

        // Cleanup old anomalies (older than 24 hours)
        this.cleanupOldAnomalies();

        // Sort by timestamp
        history.sort((a, b) => a.timestamp - b.timestamp);

        this.emit('data-point-added', { metric, dataPoint });
    }

    /**
     * Register anomaly detection pattern
     */
    registerPattern(pattern: AnomalyPattern): void {
        this.patterns.set(pattern.id, pattern);
        this.emit('pattern-registered', pattern);
    }

    /**
     * Get detected anomalies
     */
    getAnomalies(query?: {
        metric?: string;
        severity?: string;
        timeRange?: { start: number; end: number; };
        acknowledged?: boolean;
        resolved?: boolean;
    }): Anomaly[] {
        let results = Array.from(this.anomalies.values());

        if (query) {
            results = results.filter(anomaly => {
                if (query.severity && anomaly.severity !== query.severity) return false;
                if (query.acknowledged !== undefined && anomaly.acknowledged !== query.acknowledged) return false;
                if (query.resolved !== undefined && anomaly.resolved !== query.resolved) return false;

                if (query.timeRange) {
                    const { start, end } = query.timeRange;
                    if (anomaly.timestamp < start || anomaly.timestamp > end) return false;
                }

                return true;
            });
        }

        return results.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Acknowledge anomaly
     */
    acknowledgeAnomaly(anomalyId: string, userId: string): void {
        const anomaly = this.anomalies.get(anomalyId);
        if (anomaly) {
            anomaly.acknowledged = true;
            anomaly.metadata.acknowledged_by = userId;
            anomaly.metadata.acknowledged_at = Date.now();
            this.emit('anomaly-acknowledged', anomaly);
        }
    }

    /**
     * Resolve anomaly
     */
    resolveAnomaly(anomalyId: string, userId: string, resolution: string): void {
        const anomaly = this.anomalies.get(anomalyId);
        if (anomaly) {
            anomaly.resolved = true;
            anomaly.resolution_time = Date.now();
            anomaly.metadata.resolved_by = userId;
            anomaly.metadata.resolution = resolution;
            this.emit('anomaly-resolved', anomaly);
        }
    }

    /**
     * Generate performance predictions
     */
    async predictPerformance(
        metric: string,
        horizonHours: number = 24,
        confidence: number = 0.95
    ): Promise<PredictionResult> {
        const history = this.dataHistory.get(metric) || [];
        if (history.length < 100) {
            throw new Error(`Insufficient data for prediction. Need at least 100 points, got ${history.length}`);
        }

        // Simple linear regression for demonstration (real implementation would use ML models)
        const predictions = this.generatePredictions(history, horizonHours);
        const trend = this.analyzeTrend(history);
        const factors = this.identifyInfluencingFactors(metric, history);

        return {
            metric,
            current_value: history[history.length - 1].value,
            predicted_values: predictions,
            trend: trend.direction,
            change_rate: trend.rate,
            confidence: Math.min(confidence, 0.85), // Cap at 85% for simple model
            factors
        };
    }

    /**
     * Generate scaling recommendations
     */
    async generateScalingRecommendations(): Promise<ScalingRecommendation[]> {
        const recommendations: ScalingRecommendation[] = [];

        // Analyze CPU usage
        const cpuHistory = this.dataHistory.get('system.cpu_usage') || [];
        if (cpuHistory.length > 0) {
            const cpuRecommendation = await this.analyzeResourceScaling('cpu', cpuHistory);
            recommendations.push(cpuRecommendation);
        }

        // Analyze memory usage
        const memoryHistory = this.dataHistory.get('system.memory_usage') || [];
        if (memoryHistory.length > 0) {
            const memoryRecommendation = await this.analyzeResourceScaling('memory', memoryHistory);
            recommendations.push(memoryRecommendation);
        }

        // Analyze API response times
        const apiHistory = this.dataHistory.get('api.response_time') || [];
        if (apiHistory.length > 0) {
            const apiRecommendation = await this.analyzeResourceScaling('api_capacity', apiHistory);
            recommendations.push(apiRecommendation);
        }

        return recommendations;
    }

    /**
     * Train ML model for specific metric
     */
    async trainModel(metric: string, modelType: 'linear' | 'seasonal' | 'lstm' = 'linear'): Promise<void> {
        const history = this.dataHistory.get(metric) || [];
        if (history.length < 1000) {
            throw new Error(`Insufficient data for training. Need at least 1000 points, got ${history.length}`);
        }

        // Simplified model training (real implementation would use TensorFlow.js or similar)
        const model = this.createSimpleModel(history, modelType);
        this.models.set(metric, model);

        this.emit('model-trained', { metric, modelType, dataPoints: history.length });
    }

    /**
     * Get anomaly insights and patterns
     */
    getAnomalyInsights(timeRange: { start: number; end: number; }): {
        summary: {
            total_anomalies: number;
            by_severity: Record<string, number>;
            by_metric: Record<string, number>;
            resolution_rate: number;
            avg_resolution_time: number;
        };
        patterns: Array<{
            description: string;
            frequency: number;
            impact: string;
            recommendation: string;
        }>;
        trends: Array<{
            metric: string;
            trend: string;
            confidence: number;
        }>;
    } {
        const anomalies = this.getAnomalies({ timeRange });

        const summary = {
            total_anomalies: anomalies.length,
            by_severity: this.groupBy(anomalies, 'severity'),
            by_metric: this.groupBy(anomalies, (a: Anomaly) => a.metadata.metric || 'unknown'),
            resolution_rate: anomalies.filter(a => a.resolved).length / anomalies.length,
            avg_resolution_time: this.calculateAverageResolutionTime(anomalies)
        };

        const patterns = this.identifyAnomalyPatterns(anomalies);
        const trends = this.analyzeAnomalyTrends(anomalies);

        return { summary, patterns, trends };
    }

    // Private methods
    private runAnomalyDetection(): void {
        for (const [metric, history] of this.dataHistory.entries()) {
            if (history.length < 10) continue; // Need minimum data

            for (const pattern of this.patterns.values()) {
                if (!pattern.enabled) continue;

                const anomaly = this.detectAnomalyWithPattern(metric, history, pattern);
                if (anomaly) {
                    this.anomalies.set(anomaly.id, anomaly);
                    this.emit('anomaly-detected', anomaly);
                }
            }
        }
    }

    private detectAnomalyWithPattern(
        metric: string,
        history: DataPoint[],
        pattern: AnomalyPattern
    ): Anomaly | null {
        const latest = history[history.length - 1];

        switch (pattern.type) {
            case 'statistical':
                return this.detectStatisticalAnomaly(metric, history, pattern, latest);
            case 'threshold':
                return this.detectThresholdAnomaly(metric, history, pattern, latest);
            case 'seasonal':
                return this.detectSeasonalAnomaly(metric, history, pattern, latest);
            case 'trending':
                return this.detectTrendingAnomaly(metric, history, pattern, latest);
            default:
                return null;
        }
    }

    private detectStatisticalAnomaly(
        metric: string,
        history: DataPoint[],
        pattern: AnomalyPattern,
        latest: DataPoint
    ): Anomaly | null {
        const values = history.slice(-100).map(p => p.value); // Last 100 points
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        const zScore = Math.abs((latest.value - mean) / stdDev);
        const threshold = pattern.sensitivity * 2; // 2 sigma default

        if (zScore > threshold) {
            return {
                id: this.generateAnomalyId(),
                pattern_id: pattern.id,
                timestamp: latest.timestamp,
                value: latest.value,
                expected_value: mean,
                deviation_score: zScore,
                confidence: Math.min(zScore / threshold, 1.0),
                severity: this.calculateSeverity(zScore, threshold),
                description: `Statistical anomaly detected in ${metric}. Value ${latest.value} is ${zScore.toFixed(2)} standard deviations from mean ${mean.toFixed(2)}`,
                suggested_actions: [
                    'Investigate recent changes',
                    'Check system resources',
                    'Review error logs'
                ],
                metadata: { metric, pattern_type: 'statistical', z_score: zScore },
                acknowledged: false,
                resolved: false
            };
        }

        return null;
    }

    private detectThresholdAnomaly(
        metric: string,
        history: DataPoint[],
        pattern: AnomalyPattern,
        latest: DataPoint
    ): Anomaly | null {
        const threshold = pattern.parameters.threshold;
        const operator = pattern.parameters.operator || 'greater_than';

        let isAnomaly = false;
        switch (operator) {
            case 'greater_than':
                isAnomaly = latest.value > threshold;
                break;
            case 'less_than':
                isAnomaly = latest.value < threshold;
                break;
            case 'equals':
                isAnomaly = Math.abs(latest.value - threshold) < 0.001;
                break;
        }

        if (isAnomaly) {
            return {
                id: this.generateAnomalyId(),
                pattern_id: pattern.id,
                timestamp: latest.timestamp,
                value: latest.value,
                expected_value: threshold,
                deviation_score: Math.abs(latest.value - threshold) / threshold,
                confidence: 1.0,
                severity: pattern.parameters.severity || 'medium',
                description: `Threshold anomaly detected in ${metric}. Value ${latest.value} ${operator} ${threshold}`,
                suggested_actions: pattern.parameters.actions || ['Review threshold configuration'],
                metadata: { metric, pattern_type: 'threshold', operator, threshold },
                acknowledged: false,
                resolved: false
            };
        }

        return null;
    }

    private detectSeasonalAnomaly(
        metric: string,
        history: DataPoint[],
        pattern: AnomalyPattern,
        latest: DataPoint
    ): Anomaly | null {
        // Simplified seasonal detection (real implementation would use time series analysis)
        const seasonalPeriod = pattern.parameters.period || 24 * 60 * 60 * 1000; // 24 hours
        const seasonalData = history.filter(p =>
            (latest.timestamp - p.timestamp) % seasonalPeriod < 3600000 // Within 1 hour of seasonal pattern
        );

        if (seasonalData.length < 3) return null;

        const seasonalMean = seasonalData.reduce((sum, p) => sum + p.value, 0) / seasonalData.length;
        const seasonalStdDev = Math.sqrt(
            seasonalData.reduce((sum, p) => sum + Math.pow(p.value - seasonalMean, 2), 0) / seasonalData.length
        );

        const zScore = Math.abs((latest.value - seasonalMean) / seasonalStdDev);
        const threshold = pattern.sensitivity * 2;

        if (zScore > threshold) {
            return {
                id: this.generateAnomalyId(),
                pattern_id: pattern.id,
                timestamp: latest.timestamp,
                value: latest.value,
                expected_value: seasonalMean,
                deviation_score: zScore,
                confidence: Math.min(zScore / threshold, 1.0),
                severity: this.calculateSeverity(zScore, threshold),
                description: `Seasonal anomaly detected in ${metric}. Value deviates from seasonal pattern`,
                suggested_actions: [
                    'Check for seasonal factors',
                    'Review historical patterns',
                    'Validate time-based configurations'
                ],
                metadata: { metric, pattern_type: 'seasonal', seasonal_period: seasonalPeriod },
                acknowledged: false,
                resolved: false
            };
        }

        return null;
    }

    private detectTrendingAnomaly(
        metric: string,
        history: DataPoint[],
        pattern: AnomalyPattern,
        latest: DataPoint
    ): Anomaly | null {
        if (history.length < 20) return null;

        const recent = history.slice(-20);
        const trend = this.calculateTrend(recent);
        const threshold = pattern.parameters.trend_threshold || 0.1;

        if (Math.abs(trend) > threshold) {
            return {
                id: this.generateAnomalyId(),
                pattern_id: pattern.id,
                timestamp: latest.timestamp,
                value: latest.value,
                expected_value: latest.value - trend * 10, // Extrapolated stable value
                deviation_score: Math.abs(trend),
                confidence: 0.8,
                severity: Math.abs(trend) > threshold * 2 ? 'high' : 'medium',
                description: `Trending anomaly detected in ${metric}. ${trend > 0 ? 'Increasing' : 'Decreasing'} trend detected`,
                suggested_actions: [
                    'Investigate trend causes',
                    'Check for capacity issues',
                    'Review growth patterns'
                ],
                metadata: { metric, pattern_type: 'trending', trend_rate: trend },
                acknowledged: false,
                resolved: false
            };
        }

        return null;
    }

    private generatePredictions(history: DataPoint[], horizonHours: number): Array<{
        timestamp: number;
        value: number;
        confidence_interval: [number, number];
    }> {
        const trend = this.calculateTrend(history.slice(-100));
        const predictions = [];
        const latest = history[history.length - 1];

        for (let i = 1; i <= horizonHours; i++) {
            const timestamp = latest.timestamp + (i * 60 * 60 * 1000);
            const value = latest.value + (trend * i);
            const uncertainty = Math.sqrt(i) * 0.1 * Math.abs(value); // Increasing uncertainty

            predictions.push({
                timestamp,
                value,
                confidence_interval: [value - uncertainty, value + uncertainty] as [number, number]
            });
        }

        return predictions;
    }

    private analyzeTrend(history: DataPoint[]): { direction: 'up' | 'down' | 'stable'; rate: number; } {
        const trend = this.calculateTrend(history);

        if (Math.abs(trend) < 0.01) {
            return { direction: 'stable', rate: trend };
        }

        return {
            direction: trend > 0 ? 'up' : 'down',
            rate: Math.abs(trend)
        };
    }

    private calculateTrend(_data: DataPoint[]): number {
        if (_data.length < 2) return 0;

        const n = _data.length;
        const sumX = _data.reduce((sum: number, _: DataPoint, i: number) => sum + i, 0);
        const sumY = _data.reduce((sum: number, p: DataPoint) => sum + p.value, 0);
        const sumXY = _data.reduce((sum: number, p: DataPoint, i: number) => sum + (i * p.value), 0);
        const sumXX = _data.reduce((sum: number, _: DataPoint, i: number) => sum + (i * i), 0);

        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    private identifyInfluencingFactors(metric: string, history: DataPoint[]): Array<{
        name: string;
        influence: number;
        description: string;
    }> {
        // Simplified factor analysis (real implementation would use correlation analysis)
        return [
            {
                name: 'time_of_day',
                influence: 0.3,
                description: 'Metric shows correlation with time of day patterns'
            },
            {
                name: 'user_activity',
                influence: 0.5,
                description: 'Metric correlates with user activity levels'
            },
            {
                name: 'system_load',
                influence: 0.2,
                description: 'System load appears to influence this metric'
            }
        ];
    }

    private async analyzeResourceScaling(resource: string, history: DataPoint[]): Promise<ScalingRecommendation> {
        const currentUsage = history[history.length - 1].value;
        const trend = this.calculateTrend(history.slice(-50));
        const predictedUsage = currentUsage + (trend * 24); // 24 hours ahead

        let recommended_action: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';
        let confidence = 0.7;

        if (predictedUsage > 0.8) {
            recommended_action = 'scale_up';
            confidence = 0.9;
        } else if (predictedUsage < 0.3 && currentUsage < 0.5) {
            recommended_action = 'scale_down';
            confidence = 0.8;
        }

        return {
            resource,
            current_usage: currentUsage,
            predicted_usage: predictedUsage,
            recommended_action,
            confidence,
            time_to_action: recommended_action === 'maintain' ? 0 : 2 * 60 * 60 * 1000, // 2 hours
            cost_impact: {
                current_cost: currentUsage * 100, // Simplified cost calculation
                predicted_cost: predictedUsage * 100,
                savings_potential: recommended_action === 'scale_down' ? (currentUsage - predictedUsage) * 100 : 0
            },
            reasoning: `Based on trend analysis, ${resource} usage is ${trend > 0 ? 'increasing' : 'decreasing'} at rate ${Math.abs(trend).toFixed(3)}`
        };
    }

    private createSimpleModel(history: DataPoint[], modelType: string): any {
        // Simplified model creation (real implementation would use proper ML libraries)
        const trend = this.calculateTrend(history);
        const mean = history.reduce((sum, p) => sum + p.value, 0) / history.length;

        return {
            type: modelType,
            parameters: { trend, mean },
            trained_at: Date.now(),
            data_points: history.length
        };
    }

    private calculateSeverity(score: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
        const ratio = score / threshold;
        if (ratio > 3) return 'critical';
        if (ratio > 2) return 'high';
        if (ratio > 1.5) return 'medium';
        return 'low';
    }

    private groupBy<T>(array: T[], keyFn: string | ((_item: T) => string)): Record<string, number> {
        const _result: Record<string, number> = {};

        for (const item of array) {
            const _key = typeof keyFn === 'string' ? (item as any)[keyFn] : keyFn(item);
            _result[_key] = (_result[_key] || 0) + 1;
        }

        return _result;
    }

    private calculateAverageResolutionTime(anomalies: Anomaly[]): number {
        const resolved = anomalies.filter(a => a.resolved && a.resolution_time);
        if (resolved.length === 0) return 0;

        const totalTime = resolved.reduce((sum, a) => sum + (a.resolution_time! - a.timestamp), 0);
        return totalTime / resolved.length;
    }

    private identifyAnomalyPatterns(anomalies: Anomaly[]): Array<{
        description: string;
        frequency: number;
        impact: string;
        recommendation: string;
    }> {
        // Simplified pattern identification
        return [
            {
                description: 'High CPU usage during peak hours',
                frequency: 0.3,
                impact: 'Performance degradation',
                recommendation: 'Consider auto-scaling configuration'
            }
        ];
    }

    private analyzeAnomalyTrends(anomalies: Anomaly[]): Array<{
        metric: string;
        trend: string;
        confidence: number;
    }> {
        // Simplified trend analysis
        return [
            {
                metric: 'api.response_time',
                trend: 'increasing',
                confidence: 0.85
            }
        ];
    }

    private initializeDefaultPatterns(): void {
        // Statistical anomaly detection
        this.registerPattern({
            id: 'statistical-outlier',
            name: 'Statistical Outlier Detection',
            description: 'Detects values that are statistical outliers using z-score analysis',
            type: 'statistical',
            parameters: { window_size: 100 },
            sensitivity: 2.0,
            confidence_threshold: 0.8,
            enabled: true,
            created_at: Date.now(),
            last_updated: Date.now()
        });

        // Performance threshold monitoring
        this.registerPattern({
            id: 'performance-threshold',
            name: 'Performance Threshold',
            description: 'Monitors performance metrics against defined thresholds',
            type: 'threshold',
            parameters: {
                threshold: 4000,
                operator: 'greater_than',
                severity: 'high',
                actions: ['Scale up resources', 'Optimize queries', 'Check for bottlenecks']
            },
            sensitivity: 1.0,
            confidence_threshold: 1.0,
            enabled: true,
            created_at: Date.now(),
            last_updated: Date.now()
        });

        // Trending pattern detection
        this.registerPattern({
            id: 'trending-performance',
            name: 'Performance Trending',
            description: 'Detects trending changes in performance metrics',
            type: 'trending',
            parameters: { trend_threshold: 0.05 },
            sensitivity: 1.5,
            confidence_threshold: 0.7,
            enabled: true,
            created_at: Date.now(),
            last_updated: Date.now()
        });
    }

    private generateAnomalyId(): string {
        return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Global instance for AI anomaly detection
export const aiAnomalyDetector = new AIAnomalyDetector();

// Auto-start analysis
if (typeof window !== 'undefined') {
    aiAnomalyDetector.startAnalysis();

    // Add cleanup on page unload to prevent memory leaks
    window.addEventListener('beforeunload', () => {
        aiAnomalyDetector.dispose();
    });
}
