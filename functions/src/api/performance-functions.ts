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
  async (request) => {
    const trace = StructuredLogger.startTrace(request, "getPerformanceDashboard");

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

      // Cast summary to expected type
      const summary = metricsReport.summary as {
        totalFunctions: number;
        totalExecutions: number;
        totalErrors: number;
        overallErrorRate: number;
        averageExecutionTime: number;
      };

      const dashboardData = {
        overview: {
          totalFunctions: summary.totalFunctions,
          activeExperiments: 0, // Placeholder
          cacheHitRate: cacheStats.hitRate,
          overallSuccessRate: 100 - summary.overallErrorRate,
          averageResponseTime: calculateAverageResponseTime(metricsReport),
          totalRequests24h: summary.totalExecutions,
          activeUsers: getActiveUsersCount(),
          systemHealth: assessSystemHealth(metricsReport)
        },
        metrics: {
          functions: metricsReport.functions,
          trends: buildTrendData(metricsReport),
          topErrors: getTopErrors(metricsReport)
        },
        caching: {
          stats: cacheStats,
          hitRateByTier: cacheStats.tierDistribution,
          evictionRate: 0, // Not tracked in current implementation
          compressionRate: calculateCompressionRate(cacheStats)
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
        insights: generateActionableInsights(metricsReport, cacheStats)
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        responseSize: JSON.stringify(dashboardData).length,
        metricsCount: Object.keys(metricsReport.functions).length
      });

      return {
        success: true,
        data: dashboardData,
        timestamp: Date.now(),
        traceId: trace.traceId
      };

    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "performance_dashboard"
      });

      logger.error("Performance dashboard error:", error);
      throw new Error(`Dashboard error: ${(error as Error).message}`);
    }
  }
);

/**
 * Real-time Metrics Endpoint - Admin Access Required
 * Returns live system metrics for monitoring dashboards
 */
export const getRealtimeMetrics = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (request) => {
    const trace = StructuredLogger.startTrace(request, "getRealtimeMetrics");

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
        data: realtimeData,
        timestamp: Date.now()
      };

    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "realtime_metrics"
      });

      logger.error("Realtime metrics error:", error);
      throw new Error(`Realtime metrics error: ${(error as Error).message}`);
    }
  }
);

/**
 * Function-Specific Metrics - Admin Access Required
 * Returns detailed metrics for a specific function
 */
export const getFunctionMetrics = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (request) => {
    const trace = StructuredLogger.startTrace(request, "getFunctionMetrics");
    const { functionName, timeRange = "24h" } = request.data as DashboardRequest;

    try {
      // Verify admin access
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const userTier = (request.auth.token as any)?.tier || "free";
      if (userTier !== "admin" && userTier !== "enterprise") {
        throw new Error("Admin access required");
      }

      if (!functionName) {
        throw new Error("Function name is required");
      }

      const functionMetrics = MetricsCollector.getFunctionMetrics(functionName);

      if (!functionMetrics) {
        throw new Error(`Function ${functionName} not found in metrics`);
      }

      const detailedMetrics = {
        functionName,
        timeRange,
        metrics: functionMetrics,
        performance: {
          averageResponseTime: functionMetrics.averageDuration,
          p95ResponseTime: calculateP95(functionName),
          p99ResponseTime: calculateP99(functionName),
          throughput: calculateThroughput(functionName, timeRange),
          errorRate: functionMetrics.errorRate
        },
        resources: {
          memoryUsage: functionMetrics.memoryPeak,
          memoryTrend: getMemoryTrend(functionName),
          invocationCount: functionMetrics.executionCount
        },
        business: functionMetrics.businessMetrics,
        recommendations: generateFunctionRecommendations(functionMetrics)
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        functionName,
        metricsCount: Object.keys(detailedMetrics).length
      });

      return {
        success: true,
        data: detailedMetrics,
        timestamp: Date.now()
      };

    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        context: "function_metrics",
        functionName
      });

      logger.error("Function metrics error:", error);
      throw new Error(`Function metrics error: ${(error as Error).message}`);
    }
  }
);

/**
 * System Health Check - Public Access
 * Basic health check for system monitoring
 */
export const performanceHealthCheck = onCall(
  { ...functionsConfig, enforceAppCheck: false },
  async (request) => {
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
        data: healthMetrics
      };

    } catch (error) {
      logger.error("Health check failed:", error);
      return {
        status: "unhealthy",
        timestamp: Date.now(),
        error: (error as Error).message
      };
    }
  }
);

// Helper functions (not methods, so no 'this' context issues)
function calculateAverageResponseTime(metricsReport: any): number {
  const functions = Object.values(metricsReport.functions) as any[];
  if (functions.length === 0) return 0;

  const totalDuration = functions.reduce((sum, fn) => sum + fn.averageDuration, 0);
  return totalDuration / functions.length;
}

function getActiveUsersCount(): number {
  // Implementation would connect to user analytics
  return 0; // Placeholder
}

function assessSystemHealth(metricsReport: any): "healthy" | "warning" | "critical" {
  const errorRate = metricsReport.summary.overallErrorRate;
  if (errorRate > 10) return "critical";
  if (errorRate > 5) return "warning";
  return "healthy";
}

function buildTrendData(metricsReport: any): any[] {
  // Implementation would build trend data from historical metrics
  return []; // Placeholder
}

function getTopErrors(metricsReport: any): any[] {
  const functions = Object.entries(metricsReport.functions) as [string, any][];
  return functions
    .filter(([_, fn]) => fn.errorCount > 0)
    .sort(([_, a], [__, b]) => b.errorCount - a.errorCount)
    .slice(0, 10)
    .map(([functionName, fn]) => ({
      functionName,
      errorCount: fn.errorCount,
      errorRate: fn.errorRate,
      lastOccurrence: fn.lastExecution
    }));
}

function calculateCompressionRate(cacheStats: any): number {
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

function getTopPerformingFunctions(): any[] {
  // Implementation would return top performing functions
  return []; // Placeholder
}

function getActiveAlerts(): any[] {
  // Implementation would return active system alerts
  return []; // Placeholder
}

function calculateP95(functionName: string): number {
  // Implementation would calculate 95th percentile response time
  return 0; // Placeholder
}

function calculateP99(functionName: string): number {
  // Implementation would calculate 99th percentile response time
  return 0; // Placeholder
}

function calculateThroughput(functionName: string, timeRange: string): number {
  // Implementation would calculate function throughput
  return 0; // Placeholder
}

function getMemoryTrend(functionName: string): any[] {
  // Implementation would return memory usage trend
  return []; // Placeholder
}

function generateFunctionRecommendations(functionMetrics: any): string[] {
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

function generateActionableInsights(metricsReport: any, cacheStats: any): string[] {
  const insights = [];

  if (cacheStats.hitRate < 0.7) {
    insights.push("Cache hit rate is below optimal - consider cache warming strategies");
  }

  if (metricsReport.summary.overallErrorRate > 3) {
    insights.push("System error rate is elevated - review error patterns and implement fixes");
  }

  return insights;
}
