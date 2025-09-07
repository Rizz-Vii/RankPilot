/**
 * AI Response Optimization - Caching, Batching, and Smart Retry
 */

import {
  performanceMonitor,
  withPerformanceMonitoring,
} from "./performance-monitor";
import type { TimeoutResult } from "./timeout";
import { withAITimeout } from "./timeout";

export interface CacheOptions {
  ttlMs?: number;
  maxSize?: number;
  keyGenerator?: (...args: unknown[]) => string;
}

export interface BatchOptions {
  maxBatchSize?: number;
  batchTimeoutMs?: number;
  maxWaitMs?: number;
}

export interface OptimizationOptions extends CacheOptions, BatchOptions {
  retryCount?: number;
  retryDelay?: number;
  enableCaching?: boolean;
  enableBatching?: boolean;
  operationType?: "simple" | "complex" | "llm-generation" | "data-processing";
  expectedTokens?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface BatchRequest<T> {
  args: unknown[];
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timestamp: number;
}

class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and timestamp for LRU
    entry.hits++;
    entry.timestamp = Date.now();
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 1,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; hitRate: number; entries: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = entries.length;

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      entries: totalRequests,
    };
  }

  private evictOldest(): void {
    let oldestKey = "";
    let oldestTime = Date.now();
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by hits first, then by age
      if (
        entry.hits < lowestHits ||
        (entry.hits === lowestHits && entry.timestamp < oldestTime)
      ) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestHits = entry.hits;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

class RequestBatcher<T> {
  private pendingRequests = new Map<string, BatchRequest<T>[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly maxBatchSize: number;
  private readonly batchTimeoutMs: number;
  private readonly maxWaitMs: number;

  constructor(options: BatchOptions = {}) {
    this.maxBatchSize = options.maxBatchSize || 5;
    this.batchTimeoutMs = options.batchTimeoutMs || 100;
    this.maxWaitMs = options.maxWaitMs || 1000;
  }

  async batch<A extends unknown[]>(
    batchKey: string,
    args: A,
    batchProcessor: (batchedArgs: A[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest<T> = {
        args,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to pending requests
      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }

      const requests = this.pendingRequests.get(batchKey)!;
      requests.push(request);

      // Process immediately if batch is full
      if (requests.length >= this.maxBatchSize) {
        void this.processBatch(batchKey, batchProcessor);
        return;
      }

      // Set timeout for processing if this is the first request
      if (requests.length === 1) {
        const timeoutId = setTimeout(() => {
          void this.processBatch(batchKey, batchProcessor);
        }, this.batchTimeoutMs);

        this.batchTimeouts.set(batchKey, timeoutId);
      }

      // Check for expired requests
      const now = Date.now();
      const expiredIndex = requests.findIndex(
        (r) => now - r.timestamp > this.maxWaitMs
      );
      if (expiredIndex !== -1) {
        void this.processBatch(batchKey, batchProcessor);
      }
    });
  }

  private async processBatch<A extends unknown[]>(
    batchKey: string,
    batchProcessor: (batchedArgs: A[]) => Promise<T[]>
  ): Promise<void> {
    const requests = this.pendingRequests.get(batchKey);
    if (!requests || requests.length === 0) return;

    // Clear pending state
    this.pendingRequests.delete(batchKey);
    const timeoutId = this.batchTimeouts.get(batchKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.batchTimeouts.delete(batchKey);
    }

    try {
      const batchedArgs = requests.map((r) => r.args) as A[];
      const results = await batchProcessor(batchedArgs);

      // Resolve individual requests
      requests.forEach((request, index) => {
        if (index < results.length) {
          request.resolve(results[index]);
        } else {
          request.reject(
            new Error("Batch processing failed: insufficient results")
          );
        }
      });
    } catch (error) {
      // Reject all requests in the batch
      requests.forEach((request) => {
        request.reject(error);
      });
    }
  }
}

class AIResponseOptimizer {
  // Internal generic maps (value stored as ResponseCache<unknown>/RequestBatcher<unknown>)
  private caches: Map<string, ResponseCache<unknown>> = new Map();
  private batchers: Map<string, RequestBatcher<unknown>> = new Map();

  private getCache<T>(
    operationType: string,
    options: CacheOptions
  ): ResponseCache<T> {
    if (!this.caches.has(operationType)) {
      this.caches.set(operationType, new ResponseCache<unknown>(options));
    }
    return this.caches.get(operationType)! as ResponseCache<T>;
  }

  private getBatcher<T>(
    operationType: string,
    options: BatchOptions
  ): RequestBatcher<T> {
    if (!this.batchers.has(operationType)) {
      this.batchers.set(operationType, new RequestBatcher<unknown>(options));
    }
    return this.batchers.get(operationType)! as RequestBatcher<T>;
  }

  async optimizeRequest<T, A extends unknown[]>(
    operationType: string,
    operation: (...args: A) => Promise<T>,
    args: A,
    options: OptimizationOptions = {}
  ): Promise<TimeoutResult<T>> {
    const {
      enableCaching = true,
      enableBatching = false,
      keyGenerator = (...args) => JSON.stringify(args),
      operationType: timeoutOperationType = "simple",
    } = options;

    return withPerformanceMonitoring(operationType, async () => {
      // Generate cache key
      let cacheKey: string;
      try {
        cacheKey = keyGenerator(...args);
      } catch {
        cacheKey = `${operationType}:${args.map((a) => (typeof a === "string" ? a.slice(0, 50) : JSON.stringify(a).slice(0, 50))).join("|")}`;
      }

      // Try cache first
      if (enableCaching) {
        const cache = this.getCache<T>(operationType, options);
        const cached = cache.get(cacheKey);
        if (cached) {
          return withAITimeout(Promise.resolve(cached), {
            operationType: timeoutOperationType,
          });
        }
      }

      let resultPromise: Promise<T>;

      // Use batching if enabled
      if (enableBatching) {
        const batcher = this.getBatcher<T>(operationType, options);
        resultPromise = batcher.batch(
          operationType,
          args,
          async (batchedArgs: A[]) => {
            return Promise.all(
              batchedArgs.map((batchArgs) => operation(...batchArgs))
            );
          }
        );
      } else {
        resultPromise = operation(...args);
      }

      // Apply timeout
      const timeoutResult = await withAITimeout(resultPromise, {
        operationType: timeoutOperationType,
        onSlowResponse: (elapsedTime) => {
          console.log(
            `Slow response for ${operationType}: ${elapsedTime}ms elapsed`
          );
        },
      });

      // Cache successful results
      if (enableCaching && timeoutResult.result) {
        const cache = this.getCache<T>(operationType, options);
        cache.set(cacheKey, timeoutResult.result);
      }

      return timeoutResult;
    });
  }

  // Specialized optimization for common AI operations
  async optimizeOpenAIRequest<T>(
    operation: (prompt: string) => Promise<T>,
    prompt: string,
    options: Partial<OptimizationOptions> = {}
  ): Promise<TimeoutResult<T>> {
    return this.optimizeRequest("openai-request", operation, [prompt], {
      enableCaching: true,
      ttlMs: 10 * 60 * 1000, // 10 minutes for AI responses
      operationType: "llm-generation",
      keyGenerator: (p: unknown) => {
        const str = String(p);
        const slice = str.slice(0, 200);
        if (
          typeof window !== "undefined" &&
          typeof window.btoa === "function"
        ) {
          return `openai:${window.btoa(slice)}`;
        }
        try {
          return `openai:${Buffer.from(slice, "utf-8").toString("base64")}`;
        } catch {
          return `openai:${slice}`;
        }
      },
      ...options,
    });
  }

  async optimizeDataProcessing<T>(
    operation: (data: unknown) => Promise<T>,
    data: unknown,
    options: Partial<OptimizationOptions> = {}
  ): Promise<TimeoutResult<T>> {
    return this.optimizeRequest("data-processing", operation, [data], {
      enableCaching: true,
      enableBatching: true,
      maxBatchSize: 3,
      operationType: "data-processing",
      keyGenerator: (data: unknown) =>
        `data:${JSON.stringify(data).slice(0, 100)}`,
      ...options,
    });
  }

  // Cache management
  clearCache(operationType?: string): void {
    if (operationType) {
      this.caches.get(operationType)?.clear();
    } else {
      this.caches.forEach((cache) => cache.clear());
    }
  }

  getCacheStats(operationType?: string): Record<string, unknown> {
    if (operationType) {
      const cache = this.caches.get(operationType);
      return cache ? { [operationType]: cache.getStats() } : {};
    }

    const stats: Record<string, unknown> = {};
    this.caches.forEach((cache, type) => {
      stats[type] = cache.getStats();
    });
    return stats;
  }

  getHealthStatus(): {
    cacheHealth: Record<string, unknown>;
    performanceHealth: unknown;
    recommendations: string[];
  } {
    const cacheStats = this.getCacheStats();
    const performanceHealth = performanceMonitor.getHealthStatus();
    const recommendations: string[] = [];

    // Analyze cache performance
    Object.entries(cacheStats).forEach(([type, statsUnknown]) => {
      const stats = statsUnknown as { hitRate?: number; size?: number };
      if ((stats.hitRate ?? 0) < 30) {
        recommendations.push(
          `Consider increasing cache TTL for ${type} operations`
        );
      }
      if ((stats.size ?? 0) > 80) {
        recommendations.push(
          `Consider increasing cache size for ${type} operations`
        );
      }
    });

    return {
      cacheHealth: cacheStats,
      performanceHealth,
      recommendations: [
        ...recommendations,
        ...performanceHealth.recommendations,
      ],
    };
  }
}

// Global optimizer instance
export const aiOptimizer = new AIResponseOptimizer();

// Convenience functions
export async function optimizeAICall<T>(
  operationType: string,
  operation: () => Promise<T>,
  options: OptimizationOptions = {}
): Promise<T> {
  const result = await aiOptimizer.optimizeRequest(
    operationType,
    operation,
    [],
    options
  );
  return result.result as T;
}

export async function optimizeOpenAI<T>(
  operation: (prompt: string) => Promise<T>,
  prompt: string,
  options: Partial<OptimizationOptions> = {}
): Promise<T> {
  const result = await aiOptimizer.optimizeOpenAIRequest(
    operation,
    prompt,
    options
  );
  return result.result as T;
}
