/**
 * Performance Monitoring Functions - Firebase Functions v2
 * Follows RankPilot patterns with comprehensive observability
 */

import { onCall, HttpsOptions } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { StructuredLogger } from "../lib/structured-logger";
import { MetricsCollector } from "../lib/metrics-collector";
import { AIResponseCache } from "../lib/ai-response-cache";

// Enhanced Firebase Functions v2 configuration (RankPilot standard)
const functionsConfig: HttpsOptions = {
  timeoutSeconds: 60,
  memory: "512MiB",
  minInstances: 0,
  maxInstances: 10,
  region: "australia-southeast2", // RankPilot standard region
};

interface DashboardRequest {
    timeRange?: string;
    functionName?: string;
    action?: string;
}

/**
 * Main Performance Dashboard - Admin Access Required
 * Returns comprehensive system metrics and insights
 */
export const getPerformanceDashboard = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (_request) => {
    const trace = StructuredLogger.startTrace(_request, "getPerformanceDashboard");

    try {
      // Verify admin access
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const userTier = (request.auth.token as any)?.tier || "free";
      if (userTier !== "admin" && userTier !== "enterprise") {
        throw new Error("Admin access required");
      }

      StructuredLogger.logBusinessEvent(trace.traceId, "dashboard_access", {
        userId: request.auth.uid,
        userTier,
        timestamp: Date.now()
      });

      // Collect real-time metrics using static methods
      const metricsReport = MetricsCollector.generateReport();
      const cacheStats = AIResponseCache.getStats();

      const dashboardData = {
        overview: {
          totalFunctions: metricsReport.summary.totalFunctions,
          activeExperiments: 0, // Placeholder
          cacheHitRate: cacheStats.hitRate,
          overallSuccessRate: 100 - metricsReport.summary.overallErrorRate,
          averageResponseTime: calculateAverageResponseTime(_metricsReport),
          totalRequests24h: metricsReport.summary.totalExecutions,
          activeUsers: getActiveUsersCount(),
          systemHealth: assessSystemHealth(_metricsReport)
        },
        metrics: {
          functions: metricsReport.functions,
          trends: buildTrendData(_metricsReport),
          topErrors: getTopErrors(_metricsReport)
        },
        caching: {
          stats: _cacheStats,
          hitRateByTier: cacheStats.tierDistribution,
          evictionRate: 0, // Not tracked in current implementation
          compressionRate: calculateCompressionRate(_cacheStats)
        },
        rateLimiting: {
          globalStats: {}, // Placeholder
          blockedRequestsByTier: {},
          burstAllowanceUsage: {}
        },
        abTesting: {
          activeTests: [],
          results: [],
          recommendations: []
        },
        warming: {
          stats: {},
          predictiveInsights: [],
          nextWarmingSchedule: []
        },
        insights: generateActionableInsights(_metricsReport, _cacheStats)
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        responseSize: JSON.stringify(dashboardData).length,
        metricsCount: Object.keys(metricsReport.functions).length
      });

      return {
        success: true,
        _data: dashboardData,
        timestamp: Date.now(),
        traceId: trace.traceId
      };

    } catch (_error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "performance_dashboard"
      });

      logger.error("Performance dashboard _error:", _error);
      throw new Error(`Dashboard _error: ${(error as Error).message}`);
    }
  }
);

/**
 * Real-time Metrics Endpoint - Admin Access Required
 * Returns live system metrics for monitoring dashboards
 */
export const getRealtimeMetrics = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (_request) => {
    const trace = StructuredLogger.startTrace(_request, "getRealtimeMetrics");

    try {
      // Verify admin access
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const userTier = (request.auth.token as any)?.tier || "free";
      if (userTier !== "admin" && userTier !== "enterprise") {
        throw new Error("Admin access required");
      }

      const realtimeData = {
        timestamp: Date.now(),
        systemStatus: {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
          uptime: process.uptime()
        },
        activeConnections: getActiveConnectionsCount(),
        requestsPerSecond: getCurrentRPS(),
        errorRate: getCurrentErrorRate(),
        cacheHitRate: AIResponseCache.getStats().hitRate,
        topFunctions: getTopPerformingFunctions(),
        alerts: getActiveAlerts()
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        responseSize: JSON.stringify(realtimeData).length
      });

      return {
        success: true,
        _data: realtimeData,
        timestamp: Date.now()
      };

    } catch (_error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "realtime_metrics"
      });

      logger.error("Realtime metrics _error:", _error);
      throw new Error(`Realtime metrics _error: ${(error as Error).message}`);
    }
  }
);

/**
 * Function-Specific Metrics - Admin Access Required
 * Returns detailed metrics for a specific function
 */
export const getFunctionMetrics = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (_request) => {
    const trace = StructuredLogger.startTrace(_request, "getFunctionMetrics");
    const { _functionName, timeRange = "24h" } = request.data as DashboardRequest;

    try {
      // Verify admin access
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const userTier = (request.auth.token as any)?.tier || "free";
      if (userTier !== "admin" && userTier !== "enterprise") {
        throw new Error("Admin access required");
      }

      if (!_functionName) {
        throw new Error("Function name is required");
      }

      const functionMetrics = MetricsCollector.getFunctionMetrics(_functionName);

      if (!functionMetrics) {
        throw new Error(`Function ${functionName} not found in metrics`);
      }

      const detailedMetrics = {
        _functionName,
        timeRange,
        metrics: functionMetrics,
        performance: {
          averageResponseTime: functionMetrics.averageDuration,
          p95ResponseTime: calculateP95(_functionName),
          p99ResponseTime: calculateP99(_functionName),
          throughput: calculateThroughput(_functionName, timeRange),
          errorRate: functionMetrics.errorRate
        },
        resources: {
          memoryUsage: functionMetrics.memoryPeak,
          memoryTrend: getMemoryTrend(_functionName),
          invocationCount: functionMetrics.executionCount
        },
        business: functionMetrics.businessMetrics,
        recommendations: generateFunctionRecommendations(functionMetrics)
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        _functionName,
        metricsCount: Object.keys(detailedMetrics).length
      });

      return {
        success: true,
        _data: detailedMetrics,
        timestamp: Date.now()
      };

    } catch (_error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "function_metrics",
        functionName
      });

      logger.error("Function metrics _error:", _error);
      throw new Error(`Function metrics _error: ${(error as Error).message}`);
    }
  }
);

/**
 * System Health Check - Public Access
 * Basic health check for system monitoring
 */
export const performanceHealthCheck = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (_request) => {
    try {
      // Test cache functionality
      await AIResponseCache.set("health-check", { status: "ok" }, {
        aiModel: "test",
        promptHash: "health-check",
        tokens: 0,
        userTier: "free"
      });
      const cacheResult = await AIResponseCache.get("health-check");

      // Test metrics collection
      const healthMetrics = {
        timestamp: Date.now(),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          version: process.version
        },
        cache: {
          operational: cacheResult !== null,
          stats: AIResponseCache.getStats()
        },
        metrics: {
          operational: true,
          functionsCount: Object.keys(MetricsCollector.generateReport().functions).length
        }
      };

      return {
        status: "healthy",
        timestamp: Date.now(),
        _data: healthMetrics
      };

    } catch (_error) {
      logger.error("Health check failed:", _error);
      return {
        status: "unhealthy",
        timestamp: Date.now(),
        _error: (error as Error).message
      };
    }
  }
);

// Helper functions (not methods, so no 'this' context issues)
function calculateAverageResponseTime(_metricsReport: unknown): number {
  const functions = Object.values(metricsReport.functions) as unknown[];
  if (functions.length === 0) return 0;

  const totalDuration = functions.reduce((sum, fn) => sum + fn.averageDuration, 0);
  return totalDuration / functions.length;
}

function getActiveUsersCount(): number {
  // Implementation would connect to user analytics
  return 0; // Placeholder
}

function assessSystemHealth(_metricsReport: unknown): "healthy" | "warning" | "critical" {
  const errorRate = metricsReport.summary.overallErrorRate;
  if (errorRate > 10) return "critical";
  if (errorRate > 5) return "warning";
  return "healthy";
}

function buildTrendData(_metricsReport: unknown): unknown[] {
  // Implementation would build trend data from historical metrics
  return []; // Placeholder
}

function getTopErrors(_metricsReport: unknown): unknown[] {
  const functions = Object.entries(metricsReport.functions) as [string, any][];
  return functions
    .filter(([_, fn]) => fn.errorCount > 0)
    .sort(([_, a], [__, b]) => b.errorCount - a.errorCount)
    .slice(0, 10)
    .map(([_functionName, fn]) => ({
      _functionName,
      errorCount: fn.errorCount,
      errorRate: fn.errorRate,
      lastOccurrence: fn.lastExecution
    }));
}

function calculateCompressionRate(_cacheStats: unknown): number {
  // Implementation would calculate compression efficiency
  return 0.85; // Placeholder
}

function getActiveConnectionsCount(): number {
  // Implementation would track active connections
  return 0; // Placeholder
}

function getCurrentRPS(): number {
  // Implementation would calculate current requests per second
  return 0; // Placeholder
}

function getCurrentErrorRate(): number {
  // Implementation would calculate current error rate
  return 0; // Placeholder
}

function getTopPerformingFunctions(): unknown[] {
  // Implementation would return top performing functions
  return []; // Placeholder
}

function getActiveAlerts(): unknown[] {
  // Implementation would return active system alerts
  return []; // Placeholder
}

function calculateP95(_functionName: string): number {
  // Implementation would calculate 95th percentile response time
  return 0; // Placeholder
}

function calculateP99(_functionName: string): number {
  // Implementation would calculate 99th percentile response time
  return 0; // Placeholder
}

function calculateThroughput(_functionName: string, timeRange: string): number {
  // Implementation would calculate function throughput
  return 0; // Placeholder
}

function getMemoryTrend(_functionName: string): unknown[] {
  // Implementation would return memory usage trend
  return []; // Placeholder
}

function generateFunctionRecommendations(functionMetrics: unknown): string[] {
  const recommendations = [];

  if (functionMetrics.errorRate > 5) {
    recommendations.push("High error rate detected - investigate error patterns");
  }

  if (functionMetrics.averageDuration > 10000) {
    recommendations.push("High response time - consider optimization");
  }

  if (functionMetrics.memoryPeak > 400) {
    recommendations.push("High memory usage - consider memory optimization");
  }

  return recommendations;
}

function generateActionableInsights(_metricsReport: unknown, _cacheStats: unknown): string[] {
  const insights = [];

  if (cacheStats.hitRate < 0.7) {
    insights.push("Cache hit rate is below optimal - consider cache warming strategies");
  }

  if (metricsReport.summary.overallErrorRate > 3) {
    insights.push("System error rate is elevated - review error patterns and implement fixes");
  }

  return insights;
}
