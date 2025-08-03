"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Zap,
  RefreshCw,
} from "lucide-react";
import { performanceMonitor } from "@/lib/performance-monitor";
import { aiOptimizer } from "@/lib/ai-optimizer";

interface PerformanceStats {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  cacheHitRate: number;
  activeOperations: number;
  healthStatus: "healthy" | "degraded" | "unhealthy";
  recentErrors: string[];
}

export function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "5m" | "1h" | "24h"
  >("5m");

  const refreshStats = async () => {
    setIsRefreshing(true);

    try {
      // Get time range in milliseconds
      const timeRangeMs = {
        "5m": 5 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
      }[selectedTimeRange];

      // Get performance metrics
      const aggregates = performanceMonitor.getAggregates(
        undefined,
        timeRangeMs
      );
      const healthStatus = performanceMonitor.getHealthStatus();
      const _cacheStats = aiOptimizer.getCacheStats();

      // Calculate overall cache hit rate
      const totalCacheOps = Object.values(_cacheStats).reduce(
        (sum: number, stat: unknown) => {
          const s = stat as { entries: number };
          return sum + s.entries;
        },
        0
      );
      const totalCacheHits = Object.values(_cacheStats).reduce(
        (sum: number, stat: unknown) => {
          const s = stat as { hitRate: number; entries: number };
          return sum + (s.hitRate * s.entries) / 100;
        },
        0
      );
      const overallCacheHitRate =
        totalCacheOps > 0 ? (totalCacheHits / totalCacheOps) * 100 : 0;

      setStats({
        totalOperations: aggregates.totalOperations,
        successRate: aggregates.successRate,
        averageDuration: aggregates.averageDuration,
        p95Duration: aggregates.p95Duration,
        cacheHitRate: overallCacheHitRate,
        activeOperations: 0, // This would come from real-time monitoring
        healthStatus: healthStatus.status,
        recentErrors: healthStatus.issues,
      });
    } catch (_error) {
      console.error("Failed to refresh performance stats:", _error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50";
      case "degraded":
        return "text-yellow-600 bg-yellow-50";
      case "unhealthy":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4" />;
      case "unhealthy":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor AI operation performance and health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={selectedTimeRange}
            onValueChange={(value) => setSelectedTimeRange(value as any)}
          >
            <TabsList>
              <TabsTrigger value="5m">5m</TabsTrigger>
              <TabsTrigger value="1h">1h</TabsTrigger>
              <TabsTrigger value="24h">24h</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHealthStatusIcon(stats.healthStatus)}
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={getHealthStatusColor(stats.healthStatus)}>
              {stats.healthStatus.toUpperCase()}
            </Badge>
            {stats.recentErrors.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {stats.recentErrors.length} issue(s) detected
              </div>
            )}
          </div>
          {stats.recentErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              {stats.recentErrors.map((error, index) => (
                <div
                  key={index}
                  className="text-sm text-red-600 bg-red-50 p-2 rounded"
                >
                  {error}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operations
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOperations.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {selectedTimeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.successRate.toFixed(1)}%
            </div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageDuration.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              P95: {stats.p95Duration.toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cacheHitRate.toFixed(1)}%
            </div>
            <Progress value={stats.cacheHitRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="operations" className="w-full">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operation Performance</CardTitle>
              <CardDescription>
                Performance metrics for different types of AI operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium">Operation Type</div>
                  <div className="font-medium">Avg Duration</div>
                  <div className="font-medium">Success Rate</div>
                </div>
                {/* This would be populated with real operation-specific data */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>Keyword Suggestions</div>
                  <div>2.3s</div>
                  <div>98.5%</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>Content Analysis</div>
                  <div>4.1s</div>
                  <div>96.2%</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>SEO Audit</div>
                  <div>6.8s</div>
                  <div>94.7%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
              <CardDescription>
                Cache hit rates and efficiency metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="font-medium">Cache Type</div>
                  <div className="font-medium">Hit Rate</div>
                  <div className="font-medium">Size</div>
                  <div className="font-medium">TTL</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>OpenAI Requests</div>
                  <div>67.3%</div>
                  <div>45/100</div>
                  <div>10m</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>Data Processing</div>
                  <div>82.1%</div>
                  <div>23/100</div>
                  <div>5m</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>
                Common errors and their frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No errors detected</p>
                  <p className="text-muted-foreground">
                    System is running smoothly
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentErrors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
