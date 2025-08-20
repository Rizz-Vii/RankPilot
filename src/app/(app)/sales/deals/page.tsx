"use client";
// Sales - Deals
import { useEffect, useState } from "react";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { MetricCard } from "@/components/metrics/MetricCard";
import { TrendSparkline } from "@/components/metrics/TrendSparkline";
import { useMockDomainMetrics } from "@/hooks/useMockDomainMetrics";
import { useSalesDealsMetrics } from "@/hooks/useSalesDealsMetrics";
import { trackDashboardView } from "@/lib/domain/dashboardAnalytics";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Button } from "@/components/ui/button";
import { fetchRecentSalesMetricsSnapshots } from "@/lib/services/sales-automation-snapshots";
import { ActionCard } from "@/components/shared/action-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useAutomationTrigger } from "@/hooks/useAutomationTrigger";
import { AddDealModal } from "../_parts/add-deal-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useProvenance } from "@/hooks/useProvenance";

interface SalesMetricsSnapshot {
  pipeline: number;
  deals: number;
  won: number;
  ts: Date;
}

interface RawMetricsSnapshot {
  pipeline: number;
  totalDeals: number;
  closedWon: number;
  createdAt?: { toDate?: () => Date };
}

interface NewDeal {
  amount?: number;
}

interface SalesPipelineHistory {
  pipeline: number;
  ts: Date;
}

export default function SalesDealsPage() {
  const { data: fallback } = useMockDomainMetrics("sales", true);
  const metrics = useSalesDealsMetrics();
  const { user } = useAuth();
  const userId = user?.uid;
  const teamId = (user as any)?.teamId as string | undefined;

  const [snapMetrics, setSnapMetrics] = useState<SalesMetricsSnapshot | null>(null);
  const [history, setHistory] = useState<SalesPipelineHistory[]>([]);
  const { toast } = useToast();
  const { trigger, running } = useAutomationTrigger();
  const [addOpen, setAddOpen] = useState(false);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const { markLive, markFallback, ProvenanceLegend } = useProvenance();

  useEffect(() => {
    trackDashboardView("sales");
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoadingSnap(true);

    async function loadSnapshots() {
      try {
        const m = (await fetchRecentSalesMetricsSnapshots(userId, teamId, 6)) as RawMetricsSnapshot[];
        if (!active) return;
        if (m.length) {
          const first = m[0];
          const ts = first.createdAt?.toDate?.() || new Date();
          setSnapMetrics({
            pipeline: first.pipeline,
            deals: first.totalDeals,
            won: first.closedWon,
            ts,
          });
          setHistory(m.map((s) => ({ pipeline: s.pipeline, ts: s.createdAt?.toDate?.() || new Date() })));
          markLive();
        } else {
          markFallback();
        }
      } finally {
        if (active) setLoadingSnap(false);
      }
    }

    void loadSnapshots();
    return () => {
      active = false;
    };
  }, [userId, teamId, markLive, markFallback]);

  function run(action: "salesForecastSnapshot" | "salesRefreshMetrics"): void {
    trigger(action, {
      optimistic:
        action === "salesRefreshMetrics"
          ? () => setSnapMetrics((s) => (s ? { ...s, ts: new Date() } : s))
          : undefined,
      label: action,
    });
  }

  return (
    <FeatureGate feature="sales_deals" requiredTier="agency" showUpgrade>
      <div className="p-6 space-y-10">
        <AddDealModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={(d: unknown) =>
            setSnapMetrics((s) => (s ? { ...s, deals: (s.deals || 0) + 1, pipeline: s.pipeline + ((d as NewDeal)?.amount || 0) } : s))
          }
        />
        <ToolPageHeader
          title="Deals"
          description="Active opportunity mix, probability distribution & cycle velocity for precision forecasting."
          badges={[{ label: teamId ? "Team Scope" : "User Scope", variant: "outline" }]}
        >
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              Add Deal
            </Button>
            <Button size="sm" variant="outline">Stalled List</Button>
            <Button size="sm" variant="default" onClick={() => run("salesForecastSnapshot")}>Reforecast</Button>
          </div>
        </ToolPageHeader>
        <ProvenanceLegend />
        {loadingSnap && <Skeleton className="h-14 rounded-lg" shimmer />}
        {!loadingSnap && snapMetrics && (
          <div className="rounded-lg border p-3 bg-background/60 flex items-center justify-between text-xs" aria-label="Latest metrics snapshot">
            <div className="space-y-1">
              <p className="font-medium">Last Metrics Snapshot</p>
              <p className="text-muted-foreground">
                Pipeline {snapMetrics.pipeline.toLocaleString()} · Deals {snapMetrics.deals} · Won {snapMetrics.won}
              </p>
              {history.length > 1 && (
                <div className="flex gap-1 items-end mt-1" aria-label="Pipeline mini history">
                  {history
                    .slice(0, 8)
                    .reverse()
                    .map((h, i) => {
                      const max = Math.max(...history.map((x) => x.pipeline));
                      const pct = max ? Math.max(4, Math.round((h.pipeline / max) * 32)) : 4;
                      return <span key={i} className="inline-block w-1.5 rounded-sm bg-primary/70" style={{ height: pct }} aria-hidden="true" />;
                    })}
                </div>
              )}
            </div>
            <time className="text-[10px] text-muted-foreground" dateTime={snapMetrics.ts.toISOString()}>
              {snapMetrics.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-3">
          {(metrics.kpis.length ? metrics.kpis : fallback?.kpis || []).map((k) => (
            <MetricCard key={k.key} label={k.label} value={k.value.toLocaleString()} delta={k.delta} deltaLabel="vs last period" trend={<TrendSparkline data={k.trend} />} intent={k.intent || "neutral"} />
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Deals Workbench</h2>
          <div className="grid gap-4 md:grid-cols-5">
            <ActionCard title="Add Deal" desc="Register with AI stage prediction" action="Create" onClick={() => setAddOpen(true)} />
            <ActionCard title="Reforecast" desc="Update win probability model" action="Run" onClick={() => run("salesForecastSnapshot")} loading={!!running["salesForecastSnapshot"]} loadingLabel="Running" />
            <ActionCard title="Refresh Metrics" desc="Force metrics snapshot" action="Run" onClick={() => run("salesRefreshMetrics")} loading={!!running["salesRefreshMetrics"]} loadingLabel="Refreshing" />
            <ActionCard title="Stalled Deals" desc="Surface aging risks" action="Open" />
            <ActionCard title="Segment Mix" desc="Analyze segment distribution" action="Analyze" />
          </div>
        </section>
      </div>
    </FeatureGate>
  );
}
