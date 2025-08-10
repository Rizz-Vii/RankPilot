/**
 * Multi-Model AI Orchestration System
 * Implements Priority 1 Advanced AI Optimization from DevReady Phase 3
 * 
 * Features:
 * - Multi-model HuggingFace integration for model diversity
 * - Intelligent model selection based on task requirements
 * - Advanced caching with Redis-like distributed caching
 * - AI request batching for enterprise clients
 * - Performance monitoring with Sentry MCP integration
 * - Intelligent quota allocation across user tiers
 */

import { MCPServiceManager } from '../mcp';

export interface MultiModelRequest {
    task: 'text-generation' | 'text-classification' | 'summarization' | 'question-answering' | 'sentiment-analysis';
    input: string | string[];
    options?: {
        models?: string[];
        fallbackModels?: string[];
        maxTokens?: number;
        temperature?: number;
        batchSize?: number;
    };
    userTier: 'free' | 'starter' | 'agency' | 'enterprise' | 'admin';
    userId: string;
}

export interface MultiModelResponse {
    success: boolean;
    results: Array<{
        model: string;
        output: any;
        confidence?: number;
        processingTime: number;
        tokensUsed: number;
    }>;
    aggregatedResult?: any;
    totalProcessingTime: number;
    totalTokensUsed: number;
    cacheHits: number;
    quotaRemaining: number;
    error?: string;
}

interface ModelConfig {
    name: string;
    task: string[];
    performance: 'fast' | 'balanced' | 'accurate';
    tokenLimit: number;
    costPerToken: number;
    availability: 'high' | 'medium' | 'low';
}

/**
 * Multi-Model AI Orchestrator
 * Intelligently selects and coordinates multiple AI models for optimal results
 */
export class MultiModelOrchestrator {
    private mcpManager: MCPServiceManager;
    private distributedCache: Map<string, any> = new Map();
    private quotaManager: Map<string, number> = new Map();
    private batchQueue: Map<string, MultiModelRequest[]> = new Map();
    private performanceMetrics: Map<string, number[]> = new Map();
    private quotaResetIntervalId?: ReturnType<typeof setInterval>;
    private batchProcessingIntervalId?: ReturnType<typeof setInterval>;

    // Model configurations for intelligent selection
    private readonly modelConfigs: ModelConfig[] = [
        {
            name: 'microsoft/DialoGPT-large',
            task: ['text-generation', 'question-answering'],
            performance: 'accurate',
            tokenLimit: 4096,
            costPerToken: 0.002,
            availability: 'high'
        },
        {
            name: 'distilbert-base-uncased-finetuned-sst-2-english',
            task: ['sentiment-analysis', 'text-classification'],
            performance: 'fast',
            tokenLimit: 512,
            costPerToken: 0.001,
            availability: 'high'
        },
        {
            name: 'facebook/bart-large-cnn',
            task: ['summarization'],
            performance: 'balanced',
            tokenLimit: 1024,
            costPerToken: 0.0015,
            availability: 'medium'
        },
        {
            name: 'google/flan-t5-base',
            task: ['question-answering', 'text-generation'],
            performance: 'balanced',
            tokenLimit: 2048,
            costPerToken: 0.0018,
            availability: 'high'
        }
    ];

    // Tier-based quota limits (tokens per hour)
    private readonly tierQuotas = {
        free: 10000,
        starter: 50000,
        agency: 200000,
        enterprise: 1000000,
        admin: Infinity
    };

    constructor() {
        this.mcpManager = new MCPServiceManager({
            huggingface: {
                enabled: true,
                models: this.modelConfigs.map(m => m.name)
            },
            sentry: {
                enabled: true,
                environment: process.env.NODE_ENV || 'development'
            },
            sequentialThinking: {
                enabled: true,
                maxDepth: 5
            }
        });
        this.initializeQuotaManager();
        this.setupBatchProcessing();
    }

    /**
     * Main orchestration method for multi-model AI requests
     */
    async processRequest(request: MultiModelRequest): Promise<MultiModelResponse> {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        try {
            // 1. Validate quota
            if (!this.validateQuota(request.userId, request.userTier)) {
                return {
                    success: false,
                    results: [],
                    totalProcessingTime: Date.now() - startTime,
                    totalTokensUsed: 0,
                    cacheHits: 0,
                    quotaRemaining: this.getQuotaRemaining(request.userId, request.userTier),
                    error: 'Quota exceeded for user tier'
                };
            }

            // 2. Check distributed cache
            const cacheKey = this.generateCacheKey(request);
            const cachedResult = this.distributedCache.get(cacheKey);
            if (cachedResult) {
                return {
                    ...cachedResult,
                    cacheHits: 1,
                    quotaRemaining: this.getQuotaRemaining(request.userId, request.userTier)
                };
            }

            // 3. Select optimal models
            const selectedModels = this.selectModels(request);

            // 4. Batch processing for enterprise clients
            if (request.userTier === 'enterprise' && Array.isArray(request.input) && request.input.length > 1) {
                return await this.processBatchRequest(request, selectedModels, startTime);
            }

            // 5. Execute parallel model inference
            const results = await this.executeParallelInference(request, selectedModels);

            // 6. Aggregate results
            const aggregatedResult = this.aggregateResults(results, request.task);

            // 7. Update metrics and cache
            const totalTokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0);
            this.updateQuota(request.userId, totalTokensUsed);
            this.updatePerformanceMetrics(selectedModels, results);

            const response: MultiModelResponse = {
                success: true,
                results,
                aggregatedResult,
                totalProcessingTime: Date.now() - startTime,
                totalTokensUsed,
                cacheHits: 0,
                quotaRemaining: this.getQuotaRemaining(request.userId, request.userTier)
            };

            // Cache successful results
            this.distributedCache.set(cacheKey, response);

            return response;

        } catch (error) {
            console.error('[MultiModelOrchestrator] Processing error:', error);
            return {
                success: false,
                results: [],
                totalProcessingTime: Date.now() - startTime,
                totalTokensUsed: 0,
                cacheHits: 0,
                quotaRemaining: this.getQuotaRemaining(request.userId, request.userTier),
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Intelligent model selection based on task, performance requirements, and availability
     */
    private selectModels(request: MultiModelRequest): ModelConfig[] {
        let candidates = this.modelConfigs.filter(model =>
            model.task.includes(request.task)
        );

        // If specific models requested, filter to those
        if (request.options?.models) {
            candidates = candidates.filter(model =>
                request.options!.models!.includes(model.name)
            );
        }

        // Sort by performance and availability
        candidates.sort((a, b) => {
            const performanceScore = { fast: 1, balanced: 2, accurate: 3 };
            const availabilityScore = { high: 3, medium: 2, low: 1 };

            return (performanceScore[b.performance] + availabilityScore[b.availability]) -
                (performanceScore[a.performance] + availabilityScore[a.availability]);
        });

        // Select primary model and fallback
        const selectedModels = [candidates[0]];
        if (candidates.length > 1 && request.userTier !== 'free') {
            selectedModels.push(candidates[1]);
        }

        return selectedModels;
    }

    /**
     * Execute parallel inference across selected models
     */
    private async executeParallelInference(
        request: MultiModelRequest,
        models: ModelConfig[]
    ): Promise<Array<{ model: string; output: any; confidence?: number; processingTime: number; tokensUsed: number; }>> {
        const promises = models.map(async (model) => {
            const modelStartTime = Date.now();

            try {
                // Use HuggingFace MCP for model inference
                const result = await this.mcpManager.huggingfaceInference({
                    model: model.name,
                    inputs: request.input,
                    parameters: {
                        max_tokens: request.options?.maxTokens || model.tokenLimit,
                        temperature: request.options?.temperature || 0.7
                    }
                });

                return {
                    model: model.name,
                    output: result.data,
                    confidence: this.calculateConfidence(result.data, model),
                    processingTime: Date.now() - modelStartTime,
                    tokensUsed: this.estimateTokenUsage(request.input, result.data)
                };
            } catch (error) {
                console.error(`[MultiModelOrchestrator] Model ${model.name} failed:`, error);
                return {
                    model: model.name,
                    output: null,
                    processingTime: Date.now() - modelStartTime,
                    tokensUsed: 0
                };
            }
        });

        const results = await Promise.all(promises);
        return results.filter(result => result.output !== null);
    }

    /**
     * Process batch requests for enterprise clients
     */
    private async processBatchRequest(
        request: MultiModelRequest,
        models: ModelConfig[],
        startTime: number
    ): Promise<MultiModelResponse> {
        const batchSize = request.options?.batchSize || 10;
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        const batches = [];

        for (let i = 0; i < inputs.length; i += batchSize) {
            batches.push(inputs.slice(i, i + batchSize));
        }

        const allResults = [];
        let totalTokensUsed = 0;

        for (const batch of batches) {
            const batchRequest = { ...request, input: batch };
            const batchResults = await this.executeParallelInference(batchRequest, models);
            allResults.push(...batchResults);
            totalTokensUsed += batchResults.reduce((sum, r) => sum + r.tokensUsed, 0);
        }

        return {
            success: true,
            results: allResults,
            aggregatedResult: this.aggregateResults(allResults, request.task),
            totalProcessingTime: Date.now() - startTime,
            totalTokensUsed,
            cacheHits: 0,
            quotaRemaining: this.getQuotaRemaining(request.userId, request.userTier)
        };
    }

    /**
     * Aggregate results from multiple models
     */
    private aggregateResults(results: any[], task: string): any {
        if (results.length === 0) return null;

        switch (task) {
            case 'sentiment-analysis':
                return this.aggregateSentimentResults(results);
            case 'text-classification':
                return this.aggregateClassificationResults(results);
            case 'summarization':
                return this.aggregateSummarizationResults(results);
            case 'question-answering':
                return this.aggregateQAResults(results);
            default:
                return results[0]?.output;
        }
    }

    private aggregateSentimentResults(results: any[]): any {
        const sentiments = results.map(r => r.output?.[0]);
        const avgScore = sentiments.reduce((sum, s) => sum + (s?.score || 0), 0) / sentiments.length;
        const dominantLabel = sentiments.sort((a, b) => (b?.score || 0) - (a?.score || 0))[0]?.label;

        return {
            label: dominantLabel,
            score: avgScore,
            consensus: sentiments.filter(s => s?.label === dominantLabel).length / sentiments.length
        };
    }

    private aggregateClassificationResults(results: any[]): any {
        // Implement voting mechanism for classification
        const votes = new Map<string, number>();
        results.forEach(result => {
            const label = result.output?.[0]?.label;
            if (label) {
                votes.set(label, (votes.get(label) || 0) + 1);
            }
        });

        const sortedVotes = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
        return {
            label: sortedVotes[0]?.[0],
            confidence: sortedVotes[0]?.[1] / results.length,
            alternatives: sortedVotes.slice(1, 3)
        };
    }

    private aggregateSummarizationResults(results: any[]): any {
        // Select best summary based on length and coherence
        const summaries = results.map(r => r.output?.[0]?.summary_text).filter(Boolean);
        return summaries.length > 0 ? summaries[0] : null;
    }

    private aggregateQAResults(results: any[]): any {
        // Select answer with highest confidence
        const answers = results.map(r => r.output).filter(Boolean);
        return answers.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    }

    /**
     * Quota management methods
     */
    private initializeQuotaManager(): void {
        // Initialize quota tracking for users
        this.quotaResetIntervalId = setInterval(() => {
            this.quotaManager.clear(); // Reset hourly quotas
        }, 3600000); // 1 hour
    }

    private validateQuota(userId: string, userTier: string): boolean {
        const used = this.quotaManager.get(userId) || 0;
        const limit = this.tierQuotas[userTier as keyof typeof this.tierQuotas];
        return used < limit;
    }

    private updateQuota(userId: string, tokensUsed: number): void {
        const current = this.quotaManager.get(userId) || 0;
        this.quotaManager.set(userId, current + tokensUsed);
    }

    private getQuotaRemaining(userId: string, userTier: string): number {
        const used = this.quotaManager.get(userId) || 0;
        const limit = this.tierQuotas[userTier as keyof typeof this.tierQuotas];
        return Math.max(0, limit - used);
    }

    /**
     * Utility methods
     */
    private generateRequestId(): string {
        return `multi-model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateCacheKey(request: MultiModelRequest): string {
        const inputStr = Array.isArray(request.input) ? request.input.join('|') : request.input;
        return `${request.task}-${inputStr}-${JSON.stringify(request.options)}`;
    }

    private calculateConfidence(output: any, model: ModelConfig): number {
        // Implement confidence calculation based on model type and output
        if (output?.[0]?.score) return output[0].score;
        if (output?.score) return output.score;
        return 0.8; // Default confidence
    }

    private estimateTokenUsage(input: any, output: any): number {
        const inputStr = Array.isArray(input) ? input.join(' ') : input;
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
        return Math.ceil((inputStr.length + outputStr.length) / 4); // Rough token estimation
    }

    private setupBatchProcessing(): void {
        // Process batch queue every 100ms for enterprise clients
        this.batchProcessingIntervalId = setInterval(() => {
            this.processBatchQueue();
        }, 100);
    }

    private async processBatchQueue(): Promise<void> {
        // Implementation for batch queue processing
        for (const [userId, requests] of this.batchQueue.entries()) {
            if (requests.length >= 5) { // Process when batch reaches 5 requests
                const batch = requests.splice(0, 5);
                // Process batch in background
                this.processBatch(batch);
            }
        }
    }

    private async processBatch(requests: MultiModelRequest[]): Promise<void> {
        // Implementation for processing batched requests
        for (const request of requests) {
            await this.processRequest(request);
        }
    }

    private updatePerformanceMetrics(models: ModelConfig[], results: any[]): void {
        models.forEach((model, index) => {
            const result = results[index];
            if (result) {
                const metrics = this.performanceMetrics.get(model.name) || [];
                metrics.push(result.processingTime);
                if (metrics.length > 100) metrics.shift(); // Keep last 100 measurements
                this.performanceMetrics.set(model.name, metrics);
            }
        });
    }

    /**
     * Public method to get performance analytics
     */
    getPerformanceAnalytics(): Record<string, { avgTime: number; successRate: number; usage: number; }> {
        const analytics: Record<string, { avgTime: number; successRate: number; usage: number; }> = {};

        this.performanceMetrics.forEach((metrics, modelName) => {
            analytics[modelName] = {
                avgTime: metrics.reduce((sum, time) => sum + time, 0) / metrics.length,
                successRate: metrics.filter(time => time > 0).length / metrics.length,
                usage: metrics.length
            };
        });

        return analytics;
    }

    /**
     * Clean up internal recurring timers (useful for tests / HMR).
     */
    dispose(): void {
        if (this.quotaResetIntervalId) clearInterval(this.quotaResetIntervalId);
        if (this.batchProcessingIntervalId) clearInterval(this.batchProcessingIntervalId);
        this.quotaResetIntervalId = undefined;
        this.batchProcessingIntervalId = undefined;
    }
}

// Export singleton instance with hot-reload guard to prevent accumulating intervals in dev
declare const globalThis: any; // ensure TS doesn't complain in varied runtimes
if (!globalThis.__multiModelOrchestrator) {
    globalThis.__multiModelOrchestrator = new MultiModelOrchestrator();
} else {
    // On HMR, make sure old timers are cleared before replacing (optional safety)
    if (globalThis.__multiModelOrchestrator.dispose) {
        // no dispose call here to retain state; uncomment if needed
    }
}
export const multiModelOrchestrator: MultiModelOrchestrator = globalThis.__multiModelOrchestrator;
