"use client";

import type { LatencySparklineProps } from '@/components/performance/latency-sparkline';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiOptimizer } from "@/lib/ai-optimizer";
import { performanceMonitor } from "@/lib/performance-monitor";
import { asVoidHandler } from '@/lib/react/handlers';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Download,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import dynamic from 'next/dynamic';
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
// Dynamic sparkline import (client only) with proper typing (remove any casts)
// Dynamic sparkline import (client only) with explicit type to avoid implicit any
const LatencySparkline = dynamic<LatencySparklineProps>(
  () => import('./performance/latency-sparkline').then(m => m.LatencySparkline),
  { ssr: false, loading: () => <div className="h-9 w-full bg-muted rounded" /> }
);

// Threshold adaptive progress bar wrapper
const AdaptiveProgress: FC<{ value: number; thresholds?: { good: number; warn: number }; label: string; invert?: boolean }> = ({ value, thresholds = { good: 90, warn: 70 }, label, invert }) => {
  const pct = Math.max(0, Math.min(100, value));
  const state = (() => {
    if (invert) {
      if (pct <= thresholds.good) return 'good';
      if (pct <= thresholds.warn) return 'warn';
      return 'bad';
    }
    if (pct >= thresholds.good) return 'good';
    if (pct >= thresholds.warn) return 'warn';
    return 'bad';
  })();
  const color = state === 'good' ? 'bg-success' : state === 'warn' ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="mt-2" role="group" aria-label={label}>
      <Progress value={pct} className="h-2 bg-muted" aria-label={label} />
      <div className="-mt-2 h-2 w-full pointer-events-none relative">
        <div className={`absolute inset-0 ${color} rounded-full transition-all mix-blend-multiply opacity-60`} style={{ transform: `translateX(-${100 - pct}%)` }} aria-hidden="true" />
      </div>
    </div>
  );
};

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
  // Local component state (moved from invalid top-level usage)
  const [initialLoading, setInitialLoading] = useState(true);
  const [latencySamples, setLatencySamples] = useState<number[]>([]);
  const [showPercentileTable, setShowPercentileTable] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"5m" | "1h" | "24h">("5m");
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Persist time range selection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('perfRange');
    if (stored === '5m' || stored === '1h' || stored === '24h') setSelectedTimeRange(stored);
    const ar = window.localStorage.getItem('perfAutoRefresh');
    if (ar === '0') setAutoRefresh(false);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('perfRange', selectedTimeRange);
  }, [selectedTimeRange]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('perfAutoRefresh', autoRefresh ? '1' : '0');
  }, [autoRefresh]);

  const refreshStats = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);

    try {
      const timeRangeMs = {
        "5m": 5 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
      }[selectedTimeRange];

      const aggregates = performanceMonitor.getAggregates(undefined, timeRangeMs);
      const healthStatus = performanceMonitor.getHealthStatus();
      const cacheStats = aiOptimizer.getCacheStats();

      type CacheStat = { entries: number; hitRate: number };
      const totalCacheOps = Object.values(cacheStats as Record<string, CacheStat>).reduce(
        (sum: number, stat: CacheStat) => sum + (stat?.entries || 0),
        0
      );
      const totalCacheHits = Object.values(cacheStats as Record<string, CacheStat>).reduce(
        (sum: number, stat: CacheStat) => sum + (((stat?.hitRate || 0) * (stat?.entries || 0)) / 100),
        0
      );
      const overallCacheHitRate = totalCacheOps > 0 ? (totalCacheHits / totalCacheOps) * 100 : 0;

      const newStats: PerformanceStats = {
        totalOperations: aggregates.totalOperations,
        successRate: aggregates.successRate,
        averageDuration: aggregates.averageDuration,
        p95Duration: aggregates.p95Duration,
        cacheHitRate: overallCacheHitRate,
        activeOperations: 0,
        healthStatus: healthStatus.status,
        recentErrors: healthStatus.issues,
      };
      setStats(newStats);
      setLatencySamples(performanceMonitor.getMetrics(undefined, timeRangeMs).map(m => m.duration || 0));

      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Updated: ops ${newStats.totalOperations}, success ${newStats.successRate.toFixed(1)} percent, p95 ${newStats.p95Duration.toFixed(0)} ms.`;
      }
    } catch (error) {

      console.error("Failed to refresh performance stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    let mounted = true;
    // Wrap async flow to satisfy no-floating-promises & ensure error isolation
    void (async () => {
      try {
        await refreshStats();
        if (mounted) setInitialLoading(false);
      } catch {
        // silent – errors already logged inside refreshStats
      }
    })();
    if (!autoRefresh) return () => { mounted = false; }; // Skip interval if paused
    const interval = setInterval(() => { void refreshStats(); }, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [refreshStats, autoRefresh]);

  if (!stats && initialLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-20 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }
  if (!stats) return null;

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-success-foreground bg-success/10";
      case "degraded":
        return "text-warning-foreground bg-warning/10";
      case "unhealthy":
        return "text-destructive-foreground bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
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
  <div className="flex items-center justify-between" aria-label="Performance dashboard header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor AI operation performance and health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as '5m' | '1h' | '24h')}>
            <TabsList aria-label="Select time range" role="tablist">
              <TabsTrigger value="5m" aria-label="5 minutes range">5m</TabsTrigger>
              <TabsTrigger value="1h" aria-label="1 hour range">1h</TabsTrigger>
              <TabsTrigger value="24h" aria-label="24 hours range">24h</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={autoRefresh ? "secondary" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(a => !a)}
            aria-pressed={autoRefresh}
            title={autoRefresh ? "Pause auto refresh" : "Resume auto refresh"}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={asVoidHandler(() => refreshStats())}
            disabled={isRefreshing}
            aria-label="Refresh metrics"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const json = performanceMonitor.exportMetrics();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'performance-metrics.json'; a.click();
              URL.revokeObjectURL(url);
            }}
            title="Export JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const metrics = performanceMonitor.getMetrics();
              const headers = ['operationType','duration','success','cacheHit','error'];
              const rows = metrics.map(m => [m.operationType, m.duration ?? '', m.success, m.cacheHit ?? '', (m.error||'').replace(/,/g,';')]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'performance-metrics.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
            title="Export CSV"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite" ref={liveRegionRef} />

      {/* Health Status */}
    <Card role="region" aria-labelledby="system-health-title">
        <CardHeader>
      <CardTitle id="system-health-title" className="flex items-center gap-2">
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
                  className="text-sm text-destructive-foreground bg-destructive/10 p-2 rounded"
                >
                  {error}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Key performance indicators">
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
            <AdaptiveProgress value={stats.successRate} label="Success rate" thresholds={{ good: 97, warn: 93 }} />
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
            <div className="mt-2">
              <LatencySparkline samples={latencySamples} id="latency-sparkline" describedBy="latency-percentiles-desc" />
            </div>
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
            <AdaptiveProgress value={stats.cacheHitRate} label="Cache hit rate" thresholds={{ good: 60, warn: 30 }} />
          </CardContent>
        </Card>
      </div>

      {/* Percentile Distribution Badges */}
      {latencySamples.length > 4 && (
        <div className="flex flex-col gap-2" aria-label="Latency percentiles" aria-describedby="latency-percentiles-desc">
          <p id="latency-percentiles-desc" className="sr-only">Latency percentiles summarizing distribution for the selected time range.</p>
          <div className="flex flex-wrap gap-2 text-[11px]">
          {(() => {
            const ordered = [...latencySamples].sort((a,b)=>a-b);
            const pick = (p: number) => ordered[Math.min(ordered.length -1, Math.floor(p * (ordered.length -1)))];
            const p50 = pick(0.50);
            const p90 = pick(0.90);
            const p99 = pick(0.99);
            return [
              { label: 'p50', val: p50 },
              { label: 'p90', val: p90 },
              { label: 'p99', val: p99 },
            ].map(x => (
              <span key={x.label} className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-medium border border-border/50">
                <span className="uppercase text-muted-foreground">{x.label}</span>
                <span className="tabular-nums">{Math.round(x.val)}ms</span>
              </span>
            ));
          })()}
          </div>
          <div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowPercentileTable(v=>!v)} aria-expanded={showPercentileTable} aria-controls="percentile-table">
              {showPercentileTable ? 'Hide Distribution Table' : 'Show Distribution Table'}
            </Button>
          </div>
          {showPercentileTable && (
            <div id="percentile-table" className="overflow-auto rounded border border-border/50">
              <table className="min-w-full text-[11px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">Percentile</th>
                    <th className="text-left px-2 py-1 font-medium">Value (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {['0.50','0.75','0.90','0.95','0.99'].map(p => {
                    const ordered = [...latencySamples].sort((a,b)=>a-b);
                    const idx = Math.min(ordered.length -1, Math.floor(parseFloat(p) * (ordered.length -1)));
                    const val = ordered[idx];
                    return (
                      <tr key={p} className="odd:bg-background even:bg-muted/30">
                        <td className="px-2 py-1">p{p.replace('0.','')}</td>
                        <td className="px-2 py-1 tabular-nums">{Math.round(val)}ms</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="operations" className="w-full">
        <TabsList aria-label="Detailed metrics sections">
          <TabsTrigger value="operations" aria-label="Operations metrics">Operations</TabsTrigger>
          <TabsTrigger value="cache" aria-label="Cache performance metrics">Cache Performance</TabsTrigger>
          <TabsTrigger value="errors" aria-label="Error analysis metrics">Error Analysis</TabsTrigger>
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
                  <CheckCircle className="h-12 w-12 text-success-foreground mx-auto mb-4" />
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
                      className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-destructive-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-destructive-foreground">{error}</div>
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
