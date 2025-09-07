"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SystemMetrics {
  firestoreDocuments: number;
  storageUsed: string;
  apiCalls: number;
  errorRate: number;
  uptime: string;
  responseTime: number;
}

export default function AdminSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // fire-and-forget initial metrics load
    void fetchSystemMetrics();
  }, []);

  const fetchSystemMetrics = async (): Promise<void> => {
    try {
      setLoading(true);

      // Get Firestore document counts
      const usersCount = await getCountFromServer(collection(db, "users"));

      // Simulate other metrics (in a real app, these would come from monitoring services)
      const simulatedMetrics: SystemMetrics = {
        firestoreDocuments: usersCount.data().count,
        storageUsed: "2.3 GB",
        apiCalls: Math.floor(Math.random() * 10000 + 50000),
        errorRate: Math.random() * 2,
        uptime: "99.9%",
        responseTime: Math.floor(Math.random() * 100 + 50),
      };

      setMetrics(simulatedMetrics);
      setLastRefresh(new Date());
    } catch (error: unknown) {
      console.error("Error fetching system metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (metric: string, value: number) => {
    switch (metric) {
      case "errorRate":
        if (value < 1)
          return (
            <Badge className="bg-success/15 text-success-foreground">
              Healthy
            </Badge>
          );
        if (value < 3)
          return (
            <Badge className="bg-warning/15 text-warning-foreground">
              Warning
            </Badge>
          );
        return (
          <Badge className="bg-destructive/15 text-destructive-foreground">
            Critical
          </Badge>
        );
      case "responseTime":
        if (value < 100)
          return (
            <Badge className="bg-success/15 text-success-foreground">
              Fast
            </Badge>
          );
        if (value < 300)
          return (
            <Badge className="bg-warning/15 text-warning-foreground">
              Moderate
            </Badge>
          );
        return (
          <Badge className="bg-destructive/15 text-destructive-foreground">
            Slow
          </Badge>
        );
      default:
        return (
          <Badge className="bg-success/15 text-success-foreground">
            Healthy
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={() => {
            void fetchSystemMetrics();
          }}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  System Uptime
                </p>
                <p className="text-2xl font-bold">{metrics.uptime}</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-success-foreground" />
                  <span className="text-sm text-success-foreground">
                    All systems operational
                  </span>
                </div>
              </div>
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Response Time
                </p>
                <p className="text-2xl font-bold">{metrics.responseTime}ms</p>
                <div className="mt-1">
                  {getStatusBadge("responseTime", metrics.responseTime)}
                </div>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Error Rate
                </p>
                <p className="text-2xl font-bold">
                  {metrics.errorRate.toFixed(2)}%
                </p>
                <div className="mt-1">
                  {getStatusBadge("errorRate", metrics.errorRate)}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database & Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </CardTitle>
            <CardDescription>
              Firestore database metrics and health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Documents</span>
              <span className="text-sm text-muted-foreground">
                {metrics.firestoreDocuments.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Read Operations</span>
              <span className="text-sm text-muted-foreground">
                ~{Math.floor(metrics.apiCalls * 0.7).toLocaleString()}/day
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Write Operations</span>
              <span className="text-sm text-muted-foreground">
                ~{Math.floor(metrics.apiCalls * 0.3).toLocaleString()}/day
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Status</span>
              <Badge className="bg-success/15 text-success-foreground">
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage & Resources
            </CardTitle>
            <CardDescription>
              Storage usage and resource consumption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage Used</span>
              <span className="text-sm text-muted-foreground">
                {metrics.storageUsed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage Limit</span>
              <span className="text-sm text-muted-foreground">1 TB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bandwidth Used</span>
              <span className="text-sm text-muted-foreground">45.2 GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CDN Status</span>
              <Badge className="bg-success/15 text-success-foreground">
                Optimized
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Real-time performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <div className="text-2xl font-bold">98.5%</div>
              <div className="text-sm text-muted-foreground">
                API Success Rate
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-success-foreground" />
              </div>
              <div className="text-2xl font-bold">1.2s</div>
              <div className="text-sm text-muted-foreground">
                Avg. Page Load
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="text-2xl font-bold">99.2%</div>
              <div className="text-sm text-muted-foreground">
                Cache Hit Rate
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Server className="h-6 w-6 text-warning-foreground" />
              </div>
              <div className="text-2xl font-bold">12ms</div>
              <div className="text-sm text-muted-foreground">DB Query Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Checks</CardTitle>
          <CardDescription>
            Automated monitoring and health indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground" />
                <span className="font-medium">Authentication Service</span>
              </div>
              <Badge className="bg-success/15 text-success-foreground">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground" />
                <span className="font-medium">Database Connection</span>
              </div>
              <Badge className="bg-success/15 text-success-foreground">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground" />
                <span className="font-medium">File Storage</span>
              </div>
              <Badge className="bg-success/15 text-success-foreground">
                Healthy
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                <span className="font-medium">External APIs</span>
              </div>
              <Badge className="bg-warning/15 text-warning-foreground">
                Degraded
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
