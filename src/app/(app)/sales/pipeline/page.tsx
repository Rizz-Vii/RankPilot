"use client";
// Sales - Pipeline
import { MetricCard } from "@/components/metrics/MetricCard";
import { QuotaBar } from "@/components/metrics/QuotaBar";
import { TrendSparkline } from "@/components/metrics/TrendSparkline";
import { ActionCard } from "@/components/shared/action-card";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useAutomationTrigger } from "@/hooks/useAutomationTrigger";
import { useMockDomainMetrics } from "@/hooks/useMockDomainMetrics";
import { useProvenance } from "@/hooks/useProvenance";
import { trackDashboardView } from "@/lib/domain/dashboardAnalytics";
import {
  fetchRecentSalesForecastSnapshots,
  fetchRecentSalesMetricsSnapshots,
} from "@/lib/services/sales-automation-snapshots";
import { useEffect, useState } from "react";
import { AddDealModal } from "../_parts/add-deal-modal";

export default function SalesPipelinePage() {
  const { data } = useMockDomainMetrics("sales", true);
  const { user } = useAuth();
  const userId = user?.uid;
  const teamId: string | undefined = ((): string | undefined => {
    if (!user || typeof user !== "object") return undefined;
    const possible = (user as unknown as { teamId?: unknown }).teamId;
    return typeof possible === "string" ? possible : undefined;
  })();
  interface SalesPipelineMetricsSnapshot {
    pipeline: number;
    closedWon: number;
    totalDeals: number;
    ts: Date;
  }
  interface SalesPipelineForecastSnapshot {
    forecast: number;
    period: string;
    ts: Date;
  }
  const [snapMetrics, setSnapMetrics] =
    useState<SalesPipelineMetricsSnapshot | null>(null);
  const [snapForecast, setSnapForecast] =
    useState<SalesPipelineForecastSnapshot | null>(null);
  interface PipelineHistory {
    ts: Date;
    pipeline: number;
  }
  const [metricsHistory, setMetricsHistory] = useState<PipelineHistory[]>([]);
  const { trigger, running } = useAutomationTrigger();
  const [addOpen, setAddOpen] = useState(false);
  const [loadingSnaps, setLoadingSnaps] = useState(false);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();
  useEffect(() => {
    trackDashboardView("sales");
  }, []);
  function toDateLike(v: unknown): Date {
    if (v instanceof Date) return v;
    if (
      v &&
      typeof v === "object" &&
      "toDate" in (v as Record<string, unknown>)
    ) {
      const fn = (v as { toDate?: () => unknown }).toDate;
      if (typeof fn === "function") {
        const d = fn();
        if (d instanceof Date) return d;
      }
    }
    return new Date();
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoadingSnaps(true);
    void (async () => {
      try {
        const [m, f] = await Promise.all([
          fetchRecentSalesMetricsSnapshots(userId, teamId, 6),
          fetchRecentSalesForecastSnapshots(userId, teamId, 3),
        ]);
        if (!active) return;
        if (m.length) {
          setSnapMetrics({
            pipeline: m[0].pipeline,
            closedWon: m[0].closedWon,
            totalDeals: m[0].totalDeals,
            ts: toDateLike(
              (m[0] as unknown as { createdAt?: unknown }).createdAt
            ),
          });
          setMetricsHistory(
            m.map((s) => ({
              ts: toDateLike(
                (s as unknown as { createdAt?: unknown }).createdAt
              ),
              pipeline: s.pipeline,
            }))
          );
        }
        if (f.length)
          setSnapForecast({
            forecast: f[0].forecast,
            period: f[0].period,
            ts: toDateLike(
              (f[0] as unknown as { createdAt?: unknown }).createdAt
            ),
          });
        if (m.length || f.length) {
          markLive();
        } else {
          markFallback();
        }
      } finally {
        if (active) setLoadingSnaps(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, teamId, markLive, markFallback]);

  function handleAutomation(
    action: "salesForecastSnapshot" | "salesRefreshMetrics"
  ) {
    void trigger(action, {
      optimistic:
        action === "salesRefreshMetrics"
          ? () => {
              setSnapMetrics((s) => (s ? { ...s, ts: new Date() } : s));
              setMetricsHistory((h) =>
                h.length ? [{ ...h[0], ts: new Date() }, ...h] : h
              );
            }
          : undefined,
      label: action,
    }).catch(() => {
      /* intentionally ignored */
    });
  }
  return (
    <FeatureGate feature="sales_pipeline" requiredTier="starter" showUpgrade>
      <div className="p-6 space-y-10">
        <AddDealModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={(d: unknown) => {
            const deal =
              d && typeof d === "object" ? (d as { amount?: unknown }) : {};
            const amount = typeof deal.amount === "number" ? deal.amount : 0;
            setSnapMetrics((s) =>
              s
                ? {
                    ...s,
                    totalDeals: (s.totalDeals || 0) + 1,
                    pipeline: s.pipeline + amount,
                  }
                : s
            );
          }}
        />
        <ToolPageHeader
          title="Sales Pipeline"
          description="Stage health, velocity, conversion yield & coverage readiness for forecast confidence."
          badges={[
            { label: teamId ? "Team Scope" : "User Scope", variant: "outline" },
            { label: "Automation Enabled", variant: "secondary" },
          ]}
        >
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddOpen(true)}
            >
              Add Opportunity
            </Button>
            <Button size="sm" variant="outline">
              Stage Audit
            </Button>
            <Button size="sm" variant="default">
              AI Forecast
            </Button>
          </div>
        </ToolPageHeader>
        <ProvenanceLegend />

        {loadingSnaps && <Skeleton className="h-16 rounded-lg" shimmer />}
        {!loadingSnaps && (snapMetrics || snapForecast) && (
          <div
            className="grid gap-3 md:grid-cols-2"
            aria-label="Latest automation snapshots"
          >
            {snapMetrics && (
              <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="font-medium">Last Metrics Snapshot</p>
                  <p className="text-muted-foreground">
                    Pipeline {snapMetrics.pipeline.toLocaleString()} · Deals{" "}
                    {snapMetrics.totalDeals} · Won {snapMetrics.closedWon}
                  </p>
                  {metricsHistory.length > 1 && (
                    <div
                      className="flex gap-1 items-end mt-1"
                      aria-label="Pipeline mini history"
                    >
                      {metricsHistory
                        .slice(0, 8)
                        .reverse()
                        .map((h, i) => {
                          const max = Math.max(
                            ...metricsHistory.map((x) => x.pipeline)
                          );
                          const pct = max
                            ? Math.max(4, Math.round((h.pipeline / max) * 32))
                            : 4;
                          return (
                            <span
                              key={i}
                              className="inline-block w-1.5 rounded-sm bg-primary/70"
                              style={{ height: pct }}
                              aria-hidden="true"
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
                <time
                  className="text-[10px] text-muted-foreground"
                  dateTime={snapMetrics.ts.toISOString()}
                >
                  {snapMetrics.ts.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            )}
            {snapForecast && (
              <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="font-medium">Last Forecast Snapshot</p>
                  <p className="text-muted-foreground">
                    Forecast {snapForecast.forecast.toLocaleString()} · Period{" "}
                    {snapForecast.period}
                  </p>
                </div>
                <time
                  className="text-[10px] text-muted-foreground"
                  dateTime={snapForecast.ts.toISOString()}
                >
                  {snapForecast.ts.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            )}
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {(data?.kpis || []).map((k) => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={k.value.toLocaleString()}
              delta={k.delta}
              deltaLabel="vs last period"
              trend={<TrendSparkline data={k.trend} />}
              intent={k.intent || "neutral"}
            />
          ))}
        </section>
        {data?.quotas && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Usage & Quotas
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.quotas.map((q) => (
                <div key={q.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{q.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {q.used}/{q.limit}
                    </span>
                  </div>
                  <QuotaBar used={q.used} limit={q.limit} />
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline Workbench
          </h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ActionCard
              title="Add Opportunity"
              desc="Capture new opportunity with enrichment"
              action="Create"
            />
            <ActionCard
              title="Stage Audit"
              desc="Velocity & stall detection"
              action="Analyze"
            />
            <ActionCard
              title="AI Forecast"
              desc="Generate forecast snapshot"
              action="Run"
              onClick={() => handleAutomation("salesForecastSnapshot")}
              loading={!!running["salesForecastSnapshot"]}
              loadingLabel="Running"
            />
            <ActionCard
              title="Refresh Metrics"
              desc="Force metrics snapshot"
              action="Run"
              onClick={() => handleAutomation("salesRefreshMetrics")}
              loading={!!running["salesRefreshMetrics"]}
              loadingLabel="Refreshing"
            />
            <ActionCard
              title="Coverage Check"
              desc="Pipeline vs target multiplier"
              action="Check"
            />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
