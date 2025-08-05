/**
 * Performance monitoring for AI operations
 */

export interface PerformanceMetrics {
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  retryCount: number;
  cacheHit?: boolean;
  tokensProcessed?: number;
  bytesProcessed?: number;
  userId?: string;
}

export interface PerformanceAggregates {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  fastestOperation: number;
  slowestOperation: number;
  cacheHitRate: number;
  commonErrors: { _error: string; count: number }[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 operations

  public startOperation(
    operationType: string,
    userId?: string,
    expectedTokens?: number
  ): string {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetrics = {
      operationType,
      startTime: Date.now(),
      success: false,
      retryCount: 0,
      userId,
      tokensProcessed: expectedTokens,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    return operationId;
  }

  public endOperation(
    operationId: string,
    success: boolean,
    error?: string,
    additionalData?: {
      tokensProcessed?: number;
      bytesProcessed?: number;
      cacheHit?: boolean;
      retryCount?: number;
    }
  ): void {
    const [operationType, timestamp] = operationId.split("-");
    const startTime = parseInt(timestamp);

    const metricIndex = this.metrics.findIndex(
      (m) => m.operationType === operationType && m.startTime === startTime
    );

    if (metricIndex === -1) {
      console.warn(
        `Performance metric not found for operation: ${operationId}`
      );
      return;
    }

    const metric = this.metrics[metricIndex];
    const endTime = Date.now();

    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    if (additionalData) {
      Object.assign(metric, additionalData);
    }

    // Log slow operations
    if (metric.duration && metric.duration > 10000) {
      console.warn(
        `Slow operation detected: ${operationType} took ${metric.duration}ms`
      );
    }

    // Log to analytics (if configured)
    this.logToAnalytics(metric);
  }

  public getMetrics(
    operationType?: string,
    timeRangeMs?: number
  ): PerformanceMetrics[] {
    let filtered = this.metrics.filter((m) => m.endTime !== undefined);

    if (operationType) {
      filtered = filtered.filter((m) => m.operationType === operationType);
    }

    if (timeRangeMs) {
      const cutoff = Date.now() - timeRangeMs;
      filtered = filtered.filter((m) => m.startTime > cutoff);
    }

    return filtered;
  }

  public getAggregates(
    operationType?: string,
    timeRangeMs?: number
  ): PerformanceAggregates {
    const metrics = this.getMetrics(operationType, timeRangeMs);

    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        fastestOperation: 0,
        slowestOperation: 0,
        cacheHitRate: 0,
        commonErrors: [],
      };
    }

    const successfulOps = metrics.filter((m) => m.success);
    const durations = metrics
      .filter((m) => m.duration !== undefined)
      .map((m) => m.duration as number)
      .sort((a, b) => a - b);
    const cacheHits = metrics.filter((m) => m.cacheHit).length;

    // Error aggregation
    const errorCounts = new Map<string, number>();
    metrics
      .filter((m) => m.error)
      .forEach((m) => {
        const error = m.error;
        if (error) {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        }
      });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([_error, count]) => ({ _error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOperations: metrics.length,
      successRate: (successfulOps.length / metrics.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      fastestOperation: Math.min(...durations),
      slowestOperation: Math.max(...durations),
      cacheHitRate: (cacheHits / metrics.length) * 100,
      commonErrors,
    };
  }

  public getHealthStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    recommendations: string[];
  } {
    const recent = this.getAggregates(undefined, 5 * 60 * 1000); // Last 5 minutes
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (recent.totalOperations === 0) {
      return { status: "healthy", issues: [], recommendations: [] };
    }

    // Check success rate
    if (recent.successRate < 95) {
      issues.push(`Low success rate: ${recent.successRate.toFixed(1)}%`);
      recommendations.push(
        "Investigate common errors and implement better error handling"
      );
    }

    // Check performance
    if (recent.averageDuration > 15000) {
      issues.push(
        `Slow average response time: ${recent.averageDuration.toFixed(0)}ms`
      );
      recommendations.push(
        "Consider implementing caching or optimizing AI prompts"
      );
    }

    if (recent.p95Duration > 30000) {
      issues.push(`High p95 response time: ${recent.p95Duration.toFixed(0)}ms`);
      recommendations.push(
        "Implement request timeouts and user feedback for long operations"
      );
    }

    // Check cache hit rate
    if (recent.cacheHitRate < 20) {
      recommendations.push(
        "Consider implementing more aggressive caching strategies"
      );
    }

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (issues.length > 0) {
      status =
        recent.successRate < 90 || recent.averageDuration > 20000
          ? "unhealthy"
          : "degraded";
    }

    return { status, issues, recommendations };
  }

  private logToAnalytics(metric: PerformanceMetrics): void {
    // This would integrate with your analytics service
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("Performance Metric:", {
        operation: metric.operationType,
        duration: metric.duration,
        success: metric.success,
        cacheHit: metric.cacheHit,
      });
    }
  }

  public exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  public clear(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for automatic performance monitoring
export function monitorPerformance(operationType: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value;
    if (!method) {
      throw new Error("Method not found for performance monitoring");
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const operationId = performanceMonitor.startOperation(operationType);

      try {
        const result = await method.apply(this, args);
        performanceMonitor.endOperation(operationId, true);
        return result;
      } catch (error) {
        performanceMonitor.endOperation(
          operationId,
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
        throw error;
      }
    } as T;

    return descriptor;
  };
}

// Wrapper function for monitoring async operations
export async function withPerformanceMonitoring<T>(
  operationType: string,
  operation: () => Promise<T>,
  additionalData?: {
    userId?: string;
    expectedTokens?: number;
  }
): Promise<T> {
  const operationId = performanceMonitor.startOperation(
    operationType,
    additionalData?.userId,
    additionalData?.expectedTokens
  );

  try {
    const result = await operation();
    performanceMonitor.endOperation(operationId, true, undefined, {
      tokensProcessed: additionalData?.expectedTokens,
    });
    return result;
  } catch (error) {
    performanceMonitor.endOperation(
      operationId,
      false,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}
