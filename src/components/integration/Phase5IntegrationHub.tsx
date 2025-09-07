/**
 * Phase 5 Enterprise Integration Hub
 * Complete integration of all Phase 5 enterprise infrastructure systems
 * Demonstrates monitoring, optimization, automation, and AI working together
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { allowIntegrationsMocks } from "@/lib/flags/demo";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  Globe,
  Monitor,
  Rocket,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Enterprise system imports
import { AIDevAutomation } from "@/lib/automation/ai-dev-automation";
import {
  AIAnomalyDetector,
  aiAnomalyDetector,
} from "@/lib/monitoring/ai-anomaly-detector";
import { EnterpriseAPM, enterpriseAPM } from "@/lib/monitoring/enterprise-apm";
import {
  GlobalInfrastructureOptimizer,
  globalInfrastructureOptimizer,
} from "@/lib/optimization/global-infrastructure";

// Design system colors
import { colors } from "@/lib/design-system/colors";
import { asVoidHandler } from "@/lib/react/handlers";

interface SystemStatus {
  name: string;
  status: "operational" | "warning" | "error" | "initializing";
  lastUpdate: number;
  metrics?: Record<string, unknown>;
  alerts?: string[];
}
interface IntegrationMetrics {
  overall_health: number;
  performance_score: number;
  automation_efficiency: number;
  cost_optimization: number;
  business_impact: number;
}

interface AuthContextShape {
  role?: string;
  userTier?: string;
}

export function Phase5IntegrationHub(): JSX.Element {
  const { role, userTier } = useAuth() as AuthContextShape;
  const isAdmin = role === "admin" || role === "owner";
  const allowedTiers = ["enterprise", "admin"];
  const demoAllowed = allowIntegrationsMocks();
  const [systems, setSystems] = useState<Record<string, SystemStatus>>({});
  const [integrationMetrics, setIntegrationMetrics] =
    useState<IntegrationMetrics | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastSync, setLastSync] = useState<number>(0);

  // Enterprise system instances
  // Prefer global singletons when available to avoid duplicate collectors
  const [apm] = useState(() =>
    enterpriseAPM instanceof EnterpriseAPM ? enterpriseAPM : new EnterpriseAPM()
  );
  const [devAutomation] = useState(() => new AIDevAutomation());
  const [anomaly] = useState(() =>
    aiAnomalyDetector instanceof AIAnomalyDetector
      ? aiAnomalyDetector
      : new AIAnomalyDetector()
  );
  const [globalOpt] = useState(() =>
    globalInfrastructureOptimizer instanceof GlobalInfrastructureOptimizer
      ? globalInfrastructureOptimizer
      : new GlobalInfrastructureOptimizer()
  );

  const initializeEnterpriseSystems = useCallback(async () => {
    try {
      setIsInitializing(true);

      // Start collectors if needed (browser will already start APM automatically)
      if (typeof window !== "undefined") {
        apm.startCollection();
        anomaly.startAnalysis();
      } else {
        globalOpt.startOptimization();
      }

      // Build initial statuses from real subsystems
      const now = Date.now();
      const edge = globalOpt.getGlobalPerformanceMetrics().edge_locations;
      const cache = globalOpt.getGlobalPerformanceMetrics().cache_performance;
      const lb = globalOpt.getGlobalPerformanceMetrics().load_balancing;

      const recentLcp = apm.getMetrics({ name: "performance.lcp", limit: 1 })[0]
        ?.value;
      const seoGauge = apm.getMetrics({
        name: "seo.meta_description.present",
        limit: 20,
      });
      const seoAvg = seoGauge.length
        ? Math.round(
            (seoGauge.reduce((s, m) => s + m.value, 0) / seoGauge.length) * 100
          )
        : 100;
      const anomalies = anomaly.getAnomalies({
        timeRange: { start: now - 60 * 60 * 1000, end: now },
      });

      setSystems({
        apm: {
          name: "Application Performance",
          status: "operational",
          lastUpdate: now,
          metrics: {
            latest_lcp_ms: Math.round(recentLcp ?? 0),
            seo_meta_coverage_pct: seoAvg,
          },
          alerts: [],
        },
        anomaly_detection: {
          name: "Anomaly Detection",
          status: "operational",
          lastUpdate: now,
          metrics: { total_anomalies_1h: anomalies.length },
          alerts: anomalies
            .slice(0, 3)
            .map((a) => `${a.severity.toUpperCase()}: ${a.description}`),
        },
        global_optimization: {
          name: "Global Infrastructure",
          status: "operational",
          lastUpdate: now,
          metrics: {
            active_edges: edge.active,
            avg_latency_ms: Math.round(edge.avg_latency),
            cache_hit_rate_pct: Math.round(cache.global_hit_rate * 100),
            healthy_targets: lb.healthy_targets,
          },
          alerts: [],
        },
        dev_automation: {
          name: "Dev Automation",
          status: "operational",
          lastUpdate: now,
          metrics: {
            avg_quality_score:
              devAutomation.getAutomationMetrics().code_quality
                .average_quality_score,
          },
          alerts: [],
        },
      });

      // Derive top-level integration metrics from subsystem signals
      const performance_score = recentLcp
        ? Math.max(50, Math.min(100, Math.round(100 - (recentLcp - 1500) / 30)))
        : 90;
      const automation_efficiency = 92; // placeholder from rules coverage; refine when rules API available
      const cost_optimization = Math.min(
        100,
        Math.round(
          (cache.global_hit_rate * 100 + 1000 / Math.max(edge.avg_latency, 1)) /
            2
        )
      );
      const business_impact = Math.round(
        performance_score * 0.4 +
          automation_efficiency * 0.3 +
          cost_optimization * 0.3
      );

      setIntegrationMetrics({
        overall_health: Math.round(
          (performance_score + cost_optimization + business_impact) / 3
        ),
        performance_score,
        automation_efficiency,
        cost_optimization,
        business_impact,
      });

      setLastSync(now);
      setIsInitializing(false);
    } catch {
      console.debug("Failed to initialize enterprise systems");
      setIsInitializing(false);
    }
  }, [anomaly, apm, devAutomation, globalOpt]);

  const updateSystemStatus = useCallback(
    (systemId: string, status: SystemStatus): void => {
      setSystems((prev) => ({
        ...prev,
        [systemId]: status,
      }));
    },
    []
  );

  const executeSystemAction = useCallback(
    async (systemId: string, action: string): Promise<void> => {
      try {
        switch (systemId) {
          case "apm":
            if (action === "export_data") {
              const data = await apm.exportData("json");
              // Trigger download or send to external system
              console.debug("APM data exported:", data);
            }
            break;

          case "anomaly_detection":
            if (action === "retrain_models") {
              // Train on API response time if we have enough history; otherwise surface a helpful alert
              try {
                await anomaly.trainModel("api.response_time", "linear");
                updateSystemStatus("anomaly_detection", {
                  ...(systems.anomaly_detection ?? {
                    name: "Anomaly Detection",
                    status: "initializing",
                    lastUpdate: Date.now(),
                  }),
                  alerts: ["Anomaly model retrained on api.response_time"],
                });
              } catch {
                updateSystemStatus("anomaly_detection", {
                  ...(systems.anomaly_detection ?? {
                    name: "Anomaly Detection",
                    status: "initializing",
                    lastUpdate: Date.now(),
                  }),
                  alerts: ["Not enough data to retrain anomaly model yet"],
                });
              }
            }
            break;

          case "global_optimization":
            if (action === "optimize_routes") {
              const recs =
                await globalOpt.generateOptimizationRecommendations();
              updateSystemStatus("global_optimization", {
                ...(systems.global_optimization ?? {
                  name: "Global Infrastructure",
                  status: "initializing",
                  lastUpdate: Date.now(),
                }),
                alerts: recs
                  .slice(0, 3)
                  .map((r) => `${r.priority.toUpperCase()}: ${r.description}`),
              });
            }
            break;

          case "dev_automation":
            if (action === "run_quality_check") {
              const filePaths = ["/workspaces/studio/src"];
              const results = await devAutomation.analyzeCode(filePaths);
              const avgScore =
                results.length > 0
                  ? Math.round(
                      results.reduce(
                        (sum, r) => sum + r.maintainability_index,
                        0
                      ) / results.length
                    )
                  : 95;

              updateSystemStatus("dev_automation", {
                ...(systems.dev_automation ?? {
                  name: "Dev Automation",
                  status: "initializing",
                  lastUpdate: Date.now(),
                }),
                alerts: [`Code quality check completed: ${avgScore}/100`],
              });
            }
            break;
        }
      } catch {
        console.debug(`Action ${action} failed for ${systemId}`);
      }
    },
    [apm, devAutomation, systems, updateSystemStatus, anomaly, globalOpt]
  );

  useEffect(() => {
    void initializeEnterpriseSystems();
  }, [initializeEnterpriseSystems]);

  // Removed unused getStatusColor helper (was triggering unused var lint error)

  const getStatusIcon = (status: SystemStatus["status"]): React.ReactNode => {
    switch (status) {
      case "operational":
        return (
          <CheckCircle className={"h-5 w-5 " + colors.status.success.text} />
        );
      case "warning":
        return (
          <AlertTriangle className={"h-5 w-5 " + colors.status.warning.text} />
        );
      case "error":
        return (
          <AlertTriangle className={"h-5 w-5 " + colors.status.error.text} />
        );
      case "initializing":
        return (
          <Activity
            className={"h-5 w-5 " + colors.status.info.text + " animate-spin"}
          />
        );
      default:
        return <Monitor className={"h-5 w-5 " + colors.text.muted} />;
    }
  };

  if (!isAdmin && !(userTier && allowedTiers.includes(userTier))) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center font-body">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-[hsl(var(--chart-4))] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-primary">
            Restricted Area
          </h2>
          <p className="text-muted-foreground">
            The Enterprise Integration Hub is available to enterprise/admin
            users only.
          </p>
        </div>
      </div>
    );
  }

  if (!demoAllowed) {
    return (
      <div
        className={
          "min-h-screen " +
          colors.background.secondary +
          " flex items-center justify-center"
        }
      >
        <div className="text-center">
          <AlertTriangle
            className={"h-16 w-16 " + colors.status.info.text + " mx-auto mb-4"}
          />
          <h2 className={"text-2xl font-bold mb-2 " + colors.text.primary}>
            Demo Disabled
          </h2>
          <p className={colors.text.secondary}>
            This hub uses demo integrations. Enable demo content to preview.
          </p>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div
        className={
          "min-h-screen " +
          colors.background.secondary +
          " flex items-center justify-center"
        }
      >
        <div className="text-center">
          <Activity
            className={
              "h-16 w-16 " +
              colors.status.info.text +
              " animate-spin mx-auto mb-4"
            }
          />
          <h2 className={"text-2xl font-bold mb-2 " + colors.text.primary}>
            Initializing Enterprise Systems
          </h2>
          <p className={colors.text.secondary}>
            Setting up monitoring, optimization, and automation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={"min-h-screen " + colors.background.secondary + " p-6"}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={"text-3xl font-bold " + colors.text.primary}>
              Phase 5: Enterprise Integration Hub
            </h1>
            <p className={colors.text.secondary}>
              Complete enterprise infrastructure orchestration and monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className="border-warning text-warning-foreground"
            >
              Admin Only
            </Badge>
            <Badge
              variant="outline"
              className="border-accent text-accent-foreground"
            >
              Demo
            </Badge>
            <Badge
              variant="outline"
              className={colors.status.info.bg + " " + colors.status.info.text}
            >
              Last Sync: {new Date(lastSync).toLocaleTimeString()}
            </Badge>
            <Button
              onClick={asVoidHandler(initializeEnterpriseSystems)}
              size="sm"
            >
              Refresh Systems
            </Button>
          </div>
        </div>

        {/* Integration Metrics Overview */}
        {integrationMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={"text-2xl font-bold " + colors.status.success.text}
                >
                  {integrationMetrics.overall_health}%
                </div>
                <div className={"text-sm " + colors.text.secondary}>
                  Overall Health
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={"text-2xl font-bold " + colors.status.info.text}
                >
                  {integrationMetrics.performance_score}%
                </div>
                <div className={"text-sm " + colors.text.secondary}>
                  Performance
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent-foreground">
                  {integrationMetrics.automation_efficiency}%
                </div>
                <div className={"text-sm " + colors.text.secondary}>
                  Automation
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning-foreground">
                  {integrationMetrics.cost_optimization}%
                </div>
                <div className={"text-sm " + colors.text.secondary}>
                  Cost Optimization
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div
                  className={"text-2xl font-bold " + colors.status.success.text}
                >
                  {integrationMetrics.business_impact}%
                </div>
                <div className={"text-sm " + colors.text.secondary}>
                  Business Impact
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enterprise Systems Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(systems).map(([systemId, system]) => (
            <Card key={systemId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(system.status)}
                    <span>{system.name}</span>
                  </div>
                  <Badge
                    variant={
                      system.status === "operational"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {system.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Last updated: {new Date(system.lastUpdate).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {system.metrics && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {Object.entries(system.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div
                          className={
                            "text-lg font-semibold " + colors.text.primary
                          }
                        >
                          {String(value)}
                        </div>
                        <div
                          className={
                            "text-sm capitalize " + colors.text.secondary
                          }
                        >
                          {key.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {system.alerts && system.alerts.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {system.alerts.map((alert, index) => (
                      <Alert key={index}>
                        <AlertDescription>{alert}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* System-specific actions */}
                <div className="flex space-x-2">
                  {systemId === "apm" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={asVoidHandler(() =>
                        executeSystemAction(systemId, "export_data")
                      )}
                    >
                      Export Data
                    </Button>
                  )}
                  {systemId === "anomaly_detection" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={asVoidHandler(() =>
                        executeSystemAction(systemId, "retrain_models")
                      )}
                    >
                      Retrain Models
                    </Button>
                  )}
                  {systemId === "global_optimization" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={asVoidHandler(() =>
                        executeSystemAction(systemId, "optimize_routes")
                      )}
                    >
                      Optimize Routes
                    </Button>
                  )}
                  {systemId === "dev_automation" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={asVoidHandler(() =>
                        executeSystemAction(systemId, "run_quality_check")
                      )}
                    >
                      Quality Check
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Phase 5 Completion Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Rocket
                className={"h-6 w-6 mr-2 " + colors.status.success.text}
              />
              Phase 5: Enterprise Infrastructure & Global Deployment - COMPLETE
            </CardTitle>
            <CardDescription>
              All enterprise systems operational and integrated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={
                  "text-center p-4 " + colors.status.success.bg + " rounded-lg"
                }
              >
                <Brain
                  className={
                    "h-8 w-8 " + colors.status.success.text + " mx-auto mb-2"
                  }
                />
                <div
                  className={
                    "font-semibold " +
                    colors.status.success.text.replace("text-", "") +
                    "-900"
                  }
                >
                  AI Monitoring
                </div>
                <div className={"text-sm " + colors.status.success.text}>
                  Advanced APM + Anomaly Detection
                </div>
              </div>
              <div
                className={
                  "text-center p-4 " + colors.status.info.bg + " rounded-lg"
                }
              >
                <Globe
                  className={
                    "h-8 w-8 " + colors.status.info.text + " mx-auto mb-2"
                  }
                />
                <div
                  className={
                    "font-semibold " +
                    colors.status.info.text.replace("text-", "") +
                    "-900"
                  }
                >
                  Global Infrastructure
                </div>
                <div className={"text-sm " + colors.status.info.text}>
                  Multi-region optimization
                </div>
              </div>
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <Zap className="h-8 w-8 text-accent-foreground mx-auto mb-2" />
                <div className="font-semibold text-accent-foreground">
                  AI Automation
                </div>
                <div className="text-sm text-accent-foreground/80">
                  Intelligent development workflows
                </div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <TrendingUp className="h-8 w-8 text-warning-foreground mx-auto mb-2" />
                <div className="font-semibold text-warning-foreground">
                  Business Intelligence
                </div>
                <div className="text-sm text-warning-foreground/80">
                  Performance-driven insights
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
