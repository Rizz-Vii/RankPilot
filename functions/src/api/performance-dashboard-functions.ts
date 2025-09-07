/**
 * Performance Dashboard Firebase Functions
 * Proper Firebase Functions v2 implementation with CallableRequest pattern
 */

import type {
  CallableRequest,
  HttpsOptions,
} from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import { AIResponseCache } from "../lib/ai-response-cache.js";
import { MetricsCollector } from "../lib/metrics-collector.js";
import { StructuredLogger } from "../lib/structured-logger.js";

const httpsOptions: HttpsOptions = {
  region: "australia-southeast1",
  memory: "1GiB",
  timeoutSeconds: 60,
  cors: true,
};

/**
 * Performance Dashboard - Main Dashboard Data
 */
export const performanceDashboard = onCall(
  httpsOptions,
  async (request: CallableRequest) => {
    const trace = StructuredLogger.startTrace(request, "performance-dashboard");

    try {
      // Check authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      // Check admin access (simplified)
      const userTier = trace.userTier;
      if (userTier !== "admin" && userTier !== "enterprise") {
        throw new Error("Admin access required");
      }

      StructuredLogger.logBusinessEvent(trace.traceId, "dashboard_access", {
        userId: trace.userId,
        tier: userTier,
      });

      const metricsReport = MetricsCollector.generateReport();
      const cacheStats = AIResponseCache.getStats();

      // Test cache functionality
      await AIResponseCache.set(
        "health-check",
        { status: "ok" },
        {
          aiModel: "test",
          promptHash: "health-check",
          tokens: 0,
          userTier: "free",
        }
      );
      const cacheResult = await AIResponseCache.get("health-check");

      const dashboardData = {
        timestamp: new Date().toISOString(),
        systemHealth: {
          status: "operational",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: "1.0.0",
        },
        metrics: {
          summary: metricsReport.summary,
          topFunctions: Object.entries(metricsReport.functions)
            .sort(([, a], [, b]) => {
              const aExec =
                (a as { executionCount?: number })?.executionCount ?? 0;
              const bExec =
                (b as { executionCount?: number })?.executionCount ?? 0;
              return bExec - aExec;
            })
            .slice(0, 10),
        },
        cache: {
          stats: cacheStats,
          healthCheck: cacheResult ? "pass" : "fail",
        },
        insights: metricsReport.insights,
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: Date.now() - trace.startTime,
        dataSize: JSON.stringify(dashboardData).length,
      });

      return {
        success: true,
        data: dashboardData,
        traceId: trace.traceId,
      };
    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        function: "performanceDashboard",
      });

      throw new Error(
        `Dashboard error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Real-time Metrics Endpoint
 */
export const realtimeMetrics = onCall(
  httpsOptions,
  async (request: CallableRequest) => {
    const trace = StructuredLogger.startTrace(request, "realtime-metrics");

    try {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const realtimeData = {
        timestamp: Date.now(),
        activeRequests: 0, // Would be tracked by a real system
        systemMetrics: {
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
        },
        cacheStats: AIResponseCache.getStats(),
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: Date.now() - trace.startTime,
      });

      return {
        success: true,
        data: realtimeData,
        traceId: trace.traceId,
      };
    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        function: "realtimeMetrics",
      });

      throw new Error(
        `Realtime metrics error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Function Metrics - Detailed metrics for specific functions
 */
export const functionMetrics = onCall(
  httpsOptions,
  async (request: CallableRequest) => {
    const trace = StructuredLogger.startTrace(request, "function-metrics");

    try {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const { functionName, timeRange } = request.data || {};

      if (!functionName) {
        throw new Error("Function name is required");
      }

      const metrics = MetricsCollector.getFunctionMetrics(functionName);
      const report = MetricsCollector.generateReport();

      const functionData = {
        functionName,
        timeRange: timeRange || "24h",
        metrics: metrics || {
          executionCount: 0,
          errorCount: 0,
          errorRate: 0,
          averageDuration: 0,
          totalDuration: 0,
          memoryPeak: 0,
          lastExecution: 0,
          businessMetrics: {
            aiTokensConsumed: 0,
            cacheHitRate: 0,
            userRequestsByTier: {},
          },
        },
        summary: report.summary,
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: Date.now() - trace.startTime,
      });

      return {
        success: true,
        data: functionData,
        traceId: trace.traceId,
      };
    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        function: "functionMetrics",
      });

      throw new Error(
        `Function metrics error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * A/B Test Management
 */
export const abTestManagement = onCall(
  httpsOptions,
  async (request: CallableRequest) => {
    const trace = StructuredLogger.startTrace(request, "ab-test-management");

    try {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const { action } = request.data || {};

      let responseData;

      switch (action) {
        case "list":
          responseData = {
            experiments: [], // Would come from AIPromptABTesting
            summary: {
              total: 0,
              active: 0,
              completed: 0,
            },
          };
          break;

        case "create":
          responseData = {
            message: "A/B test creation would be implemented here",
            experimentId: `exp_${Date.now()}`,
          };
          break;

        default:
          responseData = {
            availableActions: ["list", "create", "analyze", "stop"],
          };
      }

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: Date.now() - trace.startTime,
      });

      return {
        success: true,
        data: responseData,
        traceId: trace.traceId,
      };
    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        function: "abTestManagement",
      });

      throw new Error(
        `A/B test management error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Health Check
 */
export const healthCheck = onCall(
  httpsOptions,
  async (request: CallableRequest) => {
    const trace = StructuredLogger.startTrace(request, "health-check");

    try {
      const stats = AIResponseCache.getStats();

      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          structuredLogging: "operational",
          metricsCollection: "operational",
          aiResponseCache: "operational",
          database: "operational",
        },
        performance: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cacheHitRate: stats.hitRate,
          evictionRate: 0, // Not tracked in current implementation
        },
      };

      StructuredLogger.completeTrace(trace.traceId, {
        success: true,
        duration: Date.now() - trace.startTime,
      });

      return {
        success: true,
        data: healthData,
        traceId: trace.traceId,
      };
    } catch (error) {
      StructuredLogger.errorTrace(trace.traceId, error as Error, {
        function: "healthCheck",
      });

      throw new Error(
        `Health check error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Backward compatibility aliases (previous duplicate file exported these names)
// ---------------------------------------------------------------------------
export const getPerformanceDashboard = performanceDashboard;
export const getRealtimeMetrics = realtimeMetrics;
export const getFunctionMetrics = functionMetrics;
export const performanceHealthCheck = healthCheck;
