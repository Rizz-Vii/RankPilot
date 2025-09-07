"use client";
// Content Briefs Dashboard
import KPIGrid from "@/components/metrics/KPIGrid";
import { LazyDataTable } from "@/components/metrics/LazyDataTable";
import { MetricCard } from "@/components/metrics/MetricCard";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { TrendSparkline } from "@/components/metrics/TrendSparkline";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContentBriefMetrics } from "@/hooks/useContentBriefMetrics";
import { useMockDomainMetrics } from "@/hooks/useMockDomainMetrics";
import { trackDashboardView } from "@/lib/domain/dashboardAnalytics";
import { useEffect, useState } from "react";

interface BriefMetric {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: number[];
  intent?: string;
}
interface BriefRow {
  brief?: {
    title?: string;
    primaryKeyword?: string;
    seoGuidelines?: { targetWordCount?: number };
    targetWordCount?: number;
  };
  title?: string;
  primaryKeyword?: string;
  period?: string;
}
interface BriefLive {
  kpis: BriefMetric[];
  rows: BriefRow[];
  loading: boolean;
}

export default function ContentBriefsPage(): JSX.Element {
  const [months, setMonths] = useState(6);
  const live = useContentBriefMetrics(months);
  const isMobile = useIsMobile();
  // Fallback to marketing mock metrics until dedicated content mocks are added
  const { data: mock } = useMockDomainMetrics("marketing", true);
  const data: BriefLive = live.kpis.length
    ? (live as unknown as BriefLive)
    : {
        kpis: (mock?.kpis as BriefMetric[]) ?? [],
        rows: [],
        loading: live.loading,
      };
  // Track under marketing grouping for now (extend analytics taxonomy later)
  useEffect(() => {
    trackDashboardView("marketing");
  }, []);

  return (
    <FeatureGate feature="content_briefs" requiredTier="agency" showUpgrade>
      <div className="p-4 sm:p-6 space-y-8">
        <ToolPageHeader
          title="Content Briefs"
          description="Track creation velocity, word targets and optimization progress across recent briefs."
          badges={[{ label: "Strategy", variant: "secondary" }]}
          showBreadcrumb
        >
          <PeriodSelector value={months} onChange={setMonths} />
        </ToolPageHeader>
        <KPIGrid
          loading={live.loading}
          skeleton={
            <div className="rounded-md border p-3 space-y-3 animate-pulse">
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-2 w-1/3 bg-muted rounded" />
            </div>
          }
        >
          {data.kpis.map((k: BriefMetric) => (
            <MetricCard
              key={k.key}
              label={k.label}
              value={Number(k.value).toLocaleString()}
              delta={k.delta}
              deltaLabel="vs prev"
              trend={<TrendSparkline data={k.trend} />}
              intent={
                (k.intent ?? "neutral") as
                  | "neutral"
                  | "success"
                  | "warning"
                  | "danger"
                  | "accent"
              }
              size={isMobile ? "sm" : "md"}
            />
          ))}
        </KPIGrid>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent Briefs
          </h2>
          <LazyDataTable
            columns={[
              {
                key: "title",
                header: "Title",
                render: (r: unknown) => {
                  const rec = r as BriefRow;
                  return rec?.brief?.title || rec?.title || "(Untitled)";
                },
              },
              {
                key: "keyword",
                header: "Primary Keyword",
                render: (r: unknown) => {
                  const rec = r as BriefRow;
                  return (
                    rec?.brief?.primaryKeyword || rec?.primaryKeyword || "-"
                  );
                },
              },
              {
                key: "target",
                header: "Word Target",
                render: (r: unknown) => {
                  const rec = r as BriefRow;
                  return (
                    rec?.brief?.seoGuidelines?.targetWordCount ||
                    rec?.brief?.targetWordCount ||
                    "-"
                  );
                },
              },
              {
                key: "period",
                header: "Period",
                render: (r: unknown) => {
                  const rec = r as BriefRow;
                  return rec?.period || "-";
                },
              },
            ]}
            rows={live.rows as BriefRow[]}
            loading={live.loading}
            empty="No brief data"
          />
        </section>
      </div>
    </FeatureGate>
  );
}
