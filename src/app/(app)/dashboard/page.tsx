// src/app/(app)/dashboard/page.tsx - Complete Dynamic Database Integration
"use client";
import { CoreWebVitalsWidget } from "@/components/performance/core-web-vitals-monitor";
import ToolGrid from "@/components/tool-grid";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import React, { useEffect, useState } from "react";
// Chart UI primitives consumed inside dynamically imported chart components (removed local heavy usage)
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useRealTimeDashboardData } from "@/hooks/use-dashboard-data";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  KeyRound,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
// Dynamic import of heavy recharts-based components
import ApmSeoPanel from "@/components/dashboard/ApmSeoPanel";
import SeoSourcesPanel from "@/components/dashboard/SeoSourcesPanel";
import SeoScoreTrend from "@/components/dashboard/seo-score-trend";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import styles from "./dashboard.module.css";

// Local prop type mirrors for dynamically imported charts (only those needed for dynamic imports)
type TrafficSourcesChartProps = { data: Array<{ name: string; value: number; fill: string }> };
type KeywordVisibilityChartProps = { visibility: { score: number; top3: number; top10: number; top100: number } | undefined };
type BacklinksChartProps = { data: { history: Array<{ month: string; new: number; lost: number }> } | undefined };
type DomainAuthorityChartProps = { data: { history: Array<{ date: string; score: number }>; score: number } | undefined };

// Dynamically imported chart components with lightweight skeleton placeholders referencing JS re-export stubs for NodeNext compatibility
// Direct TSX dynamic imports (JS stubs removed)
// SeoScoreTrend is small enough; import directly to avoid dynamic promise element edge case
const TrafficSourcesChartDyn = dynamic<TrafficSourcesChartProps>(() => import("@/components/dashboard/traffic-sources-chart").then(m => m.default as React.ComponentType<TrafficSourcesChartProps>), { ssr: false, loading: () => <Skeleton shimmer className="h-[240px] w-full" /> });
const KeywordVisibilityChartDyn = dynamic<KeywordVisibilityChartProps>(() => import("@/components/dashboard/keyword-visibility-chart").then(m => m.default as React.ComponentType<KeywordVisibilityChartProps>), { ssr: false, loading: () => <Skeleton shimmer className="h-[240px] w-full" /> });
const BacklinksChartDyn = dynamic<BacklinksChartProps>(() => import("@/components/dashboard/backlinks-chart").then(m => m.default as React.ComponentType<BacklinksChartProps>), { ssr: false, loading: () => <Skeleton shimmer className="h-[240px] w-full" /> });
const DomainAuthorityChartDyn = dynamic<DomainAuthorityChartProps>(() => import("@/components/dashboard/domain-authority-chart").then(m => m.default as React.ComponentType<DomainAuthorityChartProps>), { ssr: false, loading: () => <Skeleton shimmer className="h-[240px] w-full" /> });

// Chart configs now encapsulated inside modular chart components

// ----- ANIMATION VARIANTS -----

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

// Utility functions removed (legend handled in modular components)

// ----- REUSABLE COMPONENTS -----

const DashboardMetricCard: React.FC<{
  title: string;
  value: string;
  change?: number;
  changeLabel?: string; // override default period label
  helper?: string; // cheeky / benefit explanation
  icon: React.ElementType;
  testId?: string;
  target?: number; // KPI target value
  targetLabel?: string; // optional label for target
  invertTarget?: boolean; // when lower is better
}> = ({ title, value, change, changeLabel = "from last period", helper, icon: Icon, testId, target, targetLabel, invertTarget }) => {
  const changeDir = change !== undefined ? (change > 0 ? "up" : change < 0 ? "down" : "flat") : null;
  const numericValue = (() => {
    if (value === "—") return null;
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? null : num;
  })();
  const kpiProgress = (() => {
    if (target === undefined || numericValue === null) return null;
    const pct = invertTarget ? (numericValue <= target ? 100 : Math.max(0, (target / numericValue) * 100)) : Math.min(100, (numericValue / target) * 100);
    return Math.round(pct);
  })();
  const kpiStatus = (() => {
    if (kpiProgress === null) return null;
    if (kpiProgress >= 100) return "on-track";
    if (kpiProgress >= 75) return "monitor";
    return "behind";
  })();
  const progressBarId = testId ? `${testId}-progress` : undefined;
  const titleId = testId ? `${testId}-title` : undefined;

  return (
    <Card className={styles.metricCard + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-shadow hover:shadow-sm"} data-testid={testId} role="group" aria-labelledby={titleId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between pb-2">
          <div className="flex flex-col">
            <p id={titleId} className="text-sm font-medium" title={title}>{title}</p>
            {kpiStatus && kpiStatus !== "on-track" && (
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${kpiStatus === "behind" ? "bg-destructive/10 text-destructive-foreground ring-destructive/20" : "bg-warning/10 text-warning-foreground ring-warning/20"}`}
                aria-label={`KPI ${kpiStatus === "behind" ? "behind target" : "below optimal"}`}
                data-testid={`${testId}-alert`}
              >
                {kpiStatus === "behind" ? "⚠ Needs Attention" : "▲ Improvement Focus"}
              </span>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight" data-testid={`${testId}-value`}>{value}</p>
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${changeDir === "up" ? "bg-success/10 text-success-foreground ring-success/20" : changeDir === "down" ? "bg-destructive/10 text-destructive-foreground ring-destructive/20" : "bg-muted text-muted-foreground ring-border"}`}
              aria-label={`${Math.abs(change)} ${changeDir === "up" ? "increase" : changeDir === "down" ? "decrease" : "no change"} ${changeLabel}`}
              data-testid={`${testId}-change`}
            >
              {changeDir === "up" && <span aria-hidden="true">▲</span>}
              {changeDir === "down" && <span aria-hidden="true">▼</span>}
              {changeDir === "flat" && <span aria-hidden="true">■</span>}
              {change >= 0 ? `+${change}` : change} {changeLabel}
            </span>
          )}
          {kpiProgress !== null && (
            <div className="flex items-center gap-2" data-testid={`${testId}-kpi`}>
              <div className="relative h-1.5 flex-1 rounded bg-muted overflow-hidden" role="progressbar" id={progressBarId} aria-label={`${title} progress toward target`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={kpiProgress} aria-describedby={helper ? `${testId}-helper` : undefined}>
                <div
                  className={`h-full transition-all motion-safe:duration-500 ${kpiStatus === "on-track" ? "bg-success" : kpiStatus === "monitor" ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${kpiProgress}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground min-w-[54px] text-right">
                {kpiProgress}%
              </span>
            </div>
          )}
          {target !== undefined && (
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground" data-testid={`${testId}-target`}>
              Target {invertTarget ? "≤" : "≥"}{target}{targetLabel ? ` ${targetLabel}` : ""}
            </span>
          )}
          {helper && (
            <p className="text-[11px] leading-snug text-muted-foreground/90" data-testid={`${testId}-helper`}>
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// NOTE: Legacy inline charts will be replaced by dynamic versions next patch
// Inline chart components removed in favor of dynamic ones

// Keyword visibility inline removed

// Domain authority inline removed

// Backlinks inline removed

// Traffic sources inline removed

// ----- MAIN COMPONENT -----

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  // Always invoke data hook (user may be null) to satisfy hooks ordering
  const { data: dashboardData, loading: dataLoading, error: dataError, refresh } = useRealTimeDashboardData(user?.uid || null);
  // SEO provenance sources from the dashboard real-time data service
  const seoSources = dashboardData?.seoSources;

  // Synchronous wrappers for async refresh action to satisfy no-misused-promises (event handlers must not return a Promise)
  const handleRefreshClick = (): void => { void refresh(); };
  const handleRetryClick = (): void => { void refresh(); };

  // Trend range selection with localStorage persistence
  const [trendRange, setTrendRange] = useState<"30d" | "90d" | "ytd">("30d");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("dashboardTrendRange");
    if (stored === "30d" || stored === "90d" || stored === "ytd") setTrendRange(stored);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboardTrendRange", trendRange);
  }, [trendRange]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => { if (dashboardData) setLastUpdated(new Date()); }, [dashboardData]);

  if (authLoading || !user) return <LoadingScreen />; // safe early return (hooks above already executed)

  if (dataError) return (
    <div className="container mx-auto py-8 px-4">
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {dataError}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryClick}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );

  // Derive improved change metrics (avoid hard-coded baselines)
  const domainHistory = dashboardData?.domainAuthority.history || [];
  const domainPrev = domainHistory.length > 1 ? domainHistory[domainHistory.length - 2].score : dashboardData?.domainAuthority.score || 0;
  const domainChange = (dashboardData?.domainAuthority.score || 0) - domainPrev;

  const seoScorePrev = (dashboardData?.seoScoreTrend || []).slice(-2)[0]?.score ?? dashboardData?.seoScore.current ?? 0; // previous trend point fallback
  const seoScoreChange = (dashboardData?.seoScore.current || 0) - seoScorePrev;

  const relativeUpdated = (() => {
    if (!lastUpdated) return "—";
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  })();

  // Executive summary (accessible)
  const executiveSummary = (() => {
    if (!dashboardData) return "Data loading";
    return `SEO Score ${dashboardData.seoScore.current}. Domain Authority ${dashboardData.domainAuthority.score}. Backlinks ${dashboardData.backlinks.total}. Tracked keywords ${dashboardData.trackedKeywords.current}. Visibility ${dashboardData.keywordVisibility.score}%.`;
  })();

  // Trend range selection (moved above to comply with hooks rules)
  const rangeLabel = trendRange.toUpperCase();

  // Real trend filtering
  const filteredSeoTrend = (() => {
    const all = dashboardData?.seoScoreTrend || [];
    if (!all.length) return [];
    const now = new Date();
    if (trendRange === "30d") {
      const cutoff = new Date(now.getTime() - 30*24*60*60*1000);
      return all.filter(p => new Date(p.date) >= cutoff);
    }
    if (trendRange === "90d") {
      const cutoff = new Date(now.getTime() - 90*24*60*60*1000);
      return all.filter(p => new Date(p.date) >= cutoff);
    }
    // YTD
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return all.filter(p => new Date(p.date) >= yearStart);
  })();

  // Channel metrics derived from trafficSources
  const channelMetrics = (() => {
    const sources = dashboardData?.trafficSources || [];
    const total = sources.reduce((s, x) => s + (x.value || 0), 0) || 1;
    const findVal = (name: string) => sources.find(s => s.name === name)?.value || 0;
    const organic = findVal("Organic Search");
    const social = findVal("Social");
    const referral = findVal("Referral");
    const direct = findVal("Direct");
    // Diversification (1 - Herfindahl index)
    const hhi = [organic, social, referral, direct].reduce((acc, v) => acc + Math.pow(v/total, 2), 0);
    const diversification = Math.round((1 - hhi) * 100);
    return { organic, social, referral, direct, diversification };
  })();

  // ----- Dynamic KPI Targets per Subscription Tier -----
  const subscriptionTier: string = (profile?.subscriptionTier || profile?.role || "free").toLowerCase();
  type TargetCfg = { target: number; targetLabel?: string; invertTarget?: boolean };
  const tierTargets: Record<string, Record<string, TargetCfg>> = {
    free: {
      "metric-seo-score": { target: 55 },
      "metric-tracked-keywords": { target: 50 },
      "metric-active-projects": { target: 2 },
      "metric-domain-authority": { target: 20 },
      "metric-total-backlinks": { target: 100 },
      "metric-proxy-ctr": { target: 6, targetLabel: "%" },
      "metric-conversion-proxy": { target: 8, targetLabel: "%" },
      "metric-organic-share": { target: 50, targetLabel: "%" },
      "metric-social-share": { target: 10, targetLabel: "%" },
      "metric-referral-share": { target: 5, targetLabel: "%" },
      "metric-diversification": { target: 60, targetLabel: "%" }
    },
    starter: {
      "metric-seo-score": { target: 65 },
      "metric-tracked-keywords": { target: 150 },
      "metric-active-projects": { target: 3 },
      "metric-domain-authority": { target: 25 },
      "metric-total-backlinks": { target: 300 },
      "metric-proxy-ctr": { target: 7, targetLabel: "%" },
      "metric-conversion-proxy": { target: 10, targetLabel: "%" },
      "metric-organic-share": { target: 55, targetLabel: "%" },
      "metric-social-share": { target: 12, targetLabel: "%" },
      "metric-referral-share": { target: 7, targetLabel: "%" },
      "metric-diversification": { target: 65, targetLabel: "%" }
    },
    agency: {
      "metric-seo-score": { target: 72 },
      "metric-tracked-keywords": { target: 400 },
      "metric-active-projects": { target: 5 },
      "metric-domain-authority": { target: 35 },
      "metric-total-backlinks": { target: 1000 },
      "metric-proxy-ctr": { target: 8, targetLabel: "%" },
      "metric-conversion-proxy": { target: 12, targetLabel: "%" },
      "metric-organic-share": { target: 60, targetLabel: "%" },
      "metric-social-share": { target: 14, targetLabel: "%" },
      "metric-referral-share": { target: 8, targetLabel: "%" },
      "metric-diversification": { target: 68, targetLabel: "%" }
    },
    enterprise: {
      "metric-seo-score": { target: 78 },
      "metric-tracked-keywords": { target: 1000 },
      "metric-active-projects": { target: 7 },
      "metric-domain-authority": { target: 45 },
      "metric-total-backlinks": { target: 3000 },
      "metric-proxy-ctr": { target: 9, targetLabel: "%" },
      "metric-conversion-proxy": { target: 14, targetLabel: "%" },
      "metric-organic-share": { target: 63, targetLabel: "%" },
      "metric-social-share": { target: 15, targetLabel: "%" },
      "metric-referral-share": { target: 10, targetLabel: "%" },
      "metric-diversification": { target: 70, targetLabel: "%" }
    },
    admin: {
      "metric-seo-score": { target: 80 },
      "metric-tracked-keywords": { target: 1200 },
      "metric-active-projects": { target: 8 },
      "metric-domain-authority": { target: 50 },
      "metric-total-backlinks": { target: 5000 },
      "metric-proxy-ctr": { target: 10, targetLabel: "%" },
      "metric-conversion-proxy": { target: 16, targetLabel: "%" },
      "metric-organic-share": { target: 65, targetLabel: "%" },
      "metric-social-share": { target: 16, targetLabel: "%" },
      "metric-referral-share": { target: 12, targetLabel: "%" },
      "metric-diversification": { target: 72, targetLabel: "%" }
    }
  };
  const effectiveTargets = tierTargets[subscriptionTier] || tierTargets.free;
  const getTarget = (id: string) => effectiveTargets[id];

  return (
    <div className="container mx-auto py-8 px-4 space-y-8" data-testid="dashboard-content">
      <ToolPageHeader
        title={`Welcome, ${profile?.displayName || user?.email}!`}
        description="Unified performance & authority overview."
        badges={composeToolHeaderBadges("dashboard", null)}
        showBreadcrumb
      >
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground" data-testid="last-updated" aria-label={`Last updated ${relativeUpdated}`}>Updated {relativeUpdated}</div>
          <Button variant="outline" size="sm" onClick={handleRefreshClick} disabled={dataLoading} data-testid="refresh-dashboard">
            <RefreshCw className={`h-4 w-4 mr-1 ${dataLoading ? "animate-spin" : ""}`} />
            {dataLoading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </ToolPageHeader>

      <section aria-label="Executive summary" className="sr-only" data-testid="executive-summary">{executiveSummary}</section>

      <div aria-live="polite" aria-atomic="true">
      {dataLoading ? (
        <div className={styles.metricsGrid}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton shimmer key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
      <motion.div className={styles.metricsGrid} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Overall SEO Score"
            value={String(dashboardData?.seoScore.current || 0)}
            change={seoScoreChange}
            changeLabel="vs last result"
            helper="Because Google loves consistency—edge this upward and rankings usually follow."
            icon={Activity}
            testId="metric-seo-score"
            target={getTarget("metric-seo-score")?.target}
            targetLabel={getTarget("metric-seo-score")?.targetLabel}
            invertTarget={getTarget("metric-seo-score")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Tracked Keywords"
            value={(dashboardData?.trackedKeywords.current || 0).toLocaleString()}
            change={dashboardData?.trackedKeywords.change}
            changeLabel="added (30d)"
            helper="Each keyword is a little scout bringing back SERP intel."
            icon={KeyRound}
            testId="metric-tracked-keywords"
            target={getTarget("metric-tracked-keywords")?.target}
            targetLabel={getTarget("metric-tracked-keywords")?.targetLabel}
            invertTarget={getTarget("metric-tracked-keywords")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Active Projects"
            value={String(dashboardData?.activeProjects.current || 0)}
            change={dashboardData?.activeProjects.change}
            changeLabel="started (30d)"
            helper="Focus fuels growth—idle projects rarely rank."
            icon={RefreshCw}
            testId="metric-active-projects"
            target={getTarget("metric-active-projects")?.target}
            targetLabel={getTarget("metric-active-projects")?.targetLabel}
            invertTarget={getTarget("metric-active-projects")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Domain Authority"
            value={String(dashboardData?.domainAuthority.score || 0)}
            change={domainChange}
            changeLabel="vs previous audit"
            helper="Authority up? Backlinks & technical trust signals are doing work."
            icon={ShieldCheck}
            testId="metric-domain-authority"
            target={getTarget("metric-domain-authority")?.target}
            targetLabel={getTarget("metric-domain-authority")?.targetLabel}
            invertTarget={getTarget("metric-domain-authority")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Total Backlinks"
            value={(dashboardData?.backlinks.total || 0).toLocaleString()}
            change={dashboardData?.backlinks.newLast30Days}
            changeLabel="new (30d)"
            helper="Links are reputation currency—earn them like rare collectibles."
            icon={LinkIcon}
            testId="metric-total-backlinks"
            target={getTarget("metric-total-backlinks")?.target}
            targetLabel={getTarget("metric-total-backlinks")?.targetLabel}
            invertTarget={getTarget("metric-total-backlinks")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Avg. CTR (Proxy)"
            value={dashboardData?.seoScore.current ? `${Math.min(12, Math.max(2, Math.round((dashboardData.seoScore.current/100)*10)))}%` : "—"}
            helper="Indicative click-through proxy based on ranking distribution."
            icon={Sparkles}
            testId="metric-proxy-ctr"
            target={getTarget("metric-proxy-ctr")?.target}
            targetLabel={getTarget("metric-proxy-ctr")?.targetLabel}
            invertTarget={getTarget("metric-proxy-ctr")?.invertTarget}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <DashboardMetricCard
            title="Conversion Lift (Est.)"
            value={dashboardData?.keywordVisibility.score ? `${Math.round(dashboardData.keywordVisibility.score * 0.2)}%` : "—"}
            helper="Rough potential uplift aligned to visibility."
            icon={Sparkles}
            testId="metric-conversion-proxy"
            target={getTarget("metric-conversion-proxy")?.target}
            targetLabel={getTarget("metric-conversion-proxy")?.targetLabel}
            invertTarget={getTarget("metric-conversion-proxy")?.invertTarget}
          />
        </motion.div>
  </motion.div>
  )}
      </div>

      {/* On-page SEO APM panel */}
      <ApmSeoPanel />

      {/* SEO Sources / Provenance Panel */}
      <motion.div className={styles.chartsGridMedium} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <SeoSourcesPanel sources={seoSources} />}
        </motion.div>
      </motion.div>

  <motion.div className={styles.chartsGridLarge} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className={styles.chartLargeSpan} variants={itemVariants}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Trend Range</div>
            <div className="flex items-center gap-1" role="group" aria-label="Select trend range">
              {(["30d","90d","ytd"] as const).map(r => (
                <Button key={r} size="sm" variant={trendRange === r ? "default" : "outline"} aria-pressed={trendRange === r} onClick={() => setTrendRange(r)} data-testid={`trend-range-${r}`} className="focus-visible:ring-2 focus-visible:ring-primary/60" title={`Show ${r.toUpperCase()} trend`}>
                  {r.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <SeoScoreTrend data={filteredSeoTrend} rangeLabel={rangeLabel} />}
        </motion.div>
        <motion.div variants={itemVariants}>
          {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <TrafficSourcesChartDyn data={dashboardData?.trafficSources || []} />}
        </motion.div>
      </motion.div>

      <motion.div className={styles.chartsGridSmall} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <KeywordVisibilityChartDyn visibility={dashboardData?.keywordVisibility} />}
        </motion.div>
        <motion.div variants={itemVariants}>
          {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <BacklinksChartDyn data={dashboardData?.backlinks} />}
        </motion.div>
      </motion.div>

      {/* Channel / acquisition KPI row */}
      {!dataLoading && (
        <motion.div className={styles.metricsGrid} variants={containerVariants} initial="hidden" animate="visible" aria-label="Channel performance KPIs">
          <motion.div variants={itemVariants}>
            <DashboardMetricCard
              title="Organic Share"
              value={`${channelMetrics.organic}%`}
              helper="Search-driven traffic portion."
              icon={Activity}
              testId="metric-organic-share"
              target={getTarget("metric-organic-share")?.target}
              targetLabel={getTarget("metric-organic-share")?.targetLabel}
              invertTarget={getTarget("metric-organic-share")?.invertTarget}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <DashboardMetricCard
              title="Social Share"
              value={`${channelMetrics.social}%`}
              helper="Community & amplification impact."
              icon={Sparkles}
              testId="metric-social-share"
              target={getTarget("metric-social-share")?.target}
              targetLabel={getTarget("metric-social-share")?.targetLabel}
              invertTarget={getTarget("metric-social-share")?.invertTarget}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <DashboardMetricCard
              title="Referral Share"
              value={`${channelMetrics.referral}%`}
              helper="Partner / earned links influence."
              icon={LinkIcon}
              testId="metric-referral-share"
              target={getTarget("metric-referral-share")?.target}
              targetLabel={getTarget("metric-referral-share")?.targetLabel}
              invertTarget={getTarget("metric-referral-share")?.invertTarget}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <DashboardMetricCard
              title="Diversification Score"
              value={`${channelMetrics.diversification}%`}
              helper="Lower concentration risk."
              icon={ShieldCheck}
              testId="metric-diversification"
              target={getTarget("metric-diversification")?.target}
              targetLabel={getTarget("metric-diversification")?.targetLabel}
              invertTarget={getTarget("metric-diversification")?.invertTarget}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Removed duplicate BacklinksChart; Domain Authority already represented by metric & chart optional earlier */}
      {!isMobile && (
        <motion.div className={styles.chartsGridMedium} variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            {dataLoading ? <Skeleton shimmer className="h-[240px] w-full" /> : <DomainAuthorityChartDyn data={dashboardData?.domainAuthority} />}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <ToolGrid />
        </motion.div>
      </motion.div>

      <section className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border" aria-label="Metric footnotes" data-testid="dashboard-footnotes">
        <p><strong>Proxy Metrics:</strong> CTR & conversion estimations are directional only and derived from visibility distribution heuristics.</p>
        <p><strong>Data Freshness:</strong> Metrics refresh automatically when new analyses, audits or keyword tracking events complete.</p>
        <p><strong>Accessibility:</strong> Change indicators include textual labels and symbols for screen readers.</p>
      </section>

      {/* Core Web Vitals Performance Monitoring */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mt-8"
      >
        <motion.div variants={itemVariants}>
          <CoreWebVitalsWidget />
        </motion.div>
      </motion.div>
    </div>
  );
}
