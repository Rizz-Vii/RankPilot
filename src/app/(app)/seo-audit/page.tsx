// src/app/(app)/seo-audit/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";

import { SeoAuditForm } from "@/components/forms/seo-forms";
import { MobileToolCard, MobileResultsCard } from "@/components/mobile-tool-layout";
import LoadingState from "@/components/loading-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Pie,
  PieChart,
  Progress,
  XAxis,
  YAxis
} from "@/components/ui/chart-components";
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { getDemoData } from "@/lib/demo-data";
import { runSEOAudit } from "@/lib/services/ai-service";
import { adaptSEOAuditResponse, type SEOAuditUnifiedResponse } from "@/lib/adapters/seo-audit-adapter";
import { db } from "@/lib/firebase";
import { TimeoutError, withTimeout } from "@/lib/timeout";
import { cn } from "@/lib/utils";
import type {
  AuditUrlInput,
  AuditUrlOutput
} from "@/types";
import {
  containerVariants,
  imageChartConfig,
  itemVariants,
  scoreChartConfig,
  statusColors,
  statusIcons
} from "@/types/charts";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ListChecks
} from "lucide-react";
import { useProvenance } from "@/hooks/useProvenance";

// Enhanced SEO Audit with NeuroSEO™ Integration


const AuditCharts = ({ items }: { items: AuditUrlOutput["items"]; }) => {
  const chartData = items.map((item) => ({
    name: item.name,
    score: item.score,
    fill:
      item.score > 85
        ? "hsl(var(--chart-1))"
        : item.score > 60
          ? "hsl(var(--chart-2))"
          : "hsl(var(--chart-5))",
  }));

  const imageAuditItem = items.find((item) => item.id === "image-alts");
  let imageData = null;
  if (imageAuditItem) {
    // A simple regex to extract numbers, assuming a format like "Found X images, Y are missing alt text"
    const match = imageAuditItem.details.match(
      /(\d+)\s*images.*(\d+)\s*are\s*missing/
    );
    if (match) {
      const total = parseInt(match[1], 10);
      const missing = parseInt(match[2], 10);
      imageData = [
        { name: "withAlt", value: total - missing },
        { name: "missingAlt", value: missing },
      ];
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={scoreChartConfig}
            className="h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="text-xs"
              />
              <XAxis dataKey="score" type="number" hide />
              <ChartTooltip
                content={(props: any) => <ChartTooltipContent {...props} />}
              />
              <Bar dataKey="score" radius={5} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {imageData && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Image Alt Text</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={imageChartConfig}
              className="mx-auto aspect-square h-[200px]"
            >
              <PieChart>
                <ChartTooltip
                  content={(props: any) => (
                    <ChartTooltipContent {...props} nameKey="name" hideLabel />
                  )}
                />
                <Pie data={imageData} dataKey="value">
                  <Cell key="withAlt" fill="var(--color-withAlt)" />
                  <Cell key="missingAlt" fill="var(--color-missingAlt)" />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Loading skeleton components
const AuditLoadingSkeleton = () => (
  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <LoadingState
      isLoading={true}
      title="Running SEO Audit"
      subtitle="Analyzing structure, performance & on-page signals..."
      showTips={false}
      variant="default"
    />
    {/* Mobile skeleton */}
    <div className="block md:hidden space-y-4">
      <Card className="bg-muted/30 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-4 w-40 bg-muted rounded mb-3" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-12 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 bg-muted rounded" />
                <div className="h-3 w-5/6 bg-muted rounded" />
              </div>
              <div className="h-3 w-8 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    {/* Desktop skeleton */}
    <div className="hidden md:block">
      <Card className="animate-pulse">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-12 w-16 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="h-3 w-5/6 bg-muted rounded" />
                </div>
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="h-[250px] w-full bg-muted/40 rounded-md" />
        </CardContent>
      </Card>
    </div>
  </motion.div>
);

// Map unified adapter output back into legacy AuditUrlOutput shape for existing UI until full refactor.
function mapUnifiedToLegacy(r: SEOAuditUnifiedResponse): AuditUrlOutput {
  return {
    url: r.url || '',
    overallScore: r.overallScore,
    summary: r.summary,
    items: r.items.map(it => ({
      id: it.id,
      name: it.name,
      title: it.name,
      description: it.details,
      details: it.details,
  status: it.status === 'good' ? 'pass' : it.status === 'error' ? 'fail' : 'warning',
  score: it.score,
  impact: (it as any)?.impact || (it.status === 'error' ? 'high' : it.status === 'warning' ? 'medium' : 'low'),
      recommendation: ''
    })),
    performance: { lcp: 0, fid: 0, cls: 0, ttfb: 0 },
    accessibility: { score: 0, issues: 0 },
    seo: { score: 0, metaTitle: true, metaDescription: true, headings: true }
  };
}

const AuditResults = ({ results }: { results: AuditUrlOutput; }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {/* Mobile */}
    <div className="block md:hidden space-y-6">
      <MobileResultsCard
        title="Audit Score"
        subtitle={`Overall Score: ${results.overallScore}/100`}
        icon={<AlertCircle className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-primary">{results.overallScore}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Overall Score</p>
              <Progress value={results.overallScore} className="mt-1" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{results.summary}</p>
        </div>
      </MobileResultsCard>
      {/* High Impact Issues (mobile) */}
      {results.items.some(i => i.status === 'fail' || i.impact === 'high') && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-base text-destructive">High Impact Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {results.items.filter(i => i.status === 'fail' || i.impact === 'high').map(item => {
              const iconKey = item.status === 'fail' ? 'fail' : item.status; // statusIcons keys: pass | fail | warning
              const Icon = statusIcons[iconKey] || AlertCircle;
              const color = item.status === 'fail' ? 'text-destructive' : 'text-warning';
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  </div>
                  <span className={`text-xs font-semibold ${color}`}>{item.score}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-headline text-base">Key Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {results.items.map((item) => {
            const Icon = statusIcons[item.status] || AlertCircle;
            const color = statusColors[item.status] || "text-muted-foreground";
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.details}</p>
                </div>
                <span className={`text-xs font-semibold ${color}`}>{item.score}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-headline text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AuditCharts items={results.items} />
        </CardContent>
      </Card>
    </div>
    {/* Desktop */}
    <div className="hidden md:block">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Audit Results</CardTitle>
          <div className="flex items-center gap-4 pt-2">
            <span className="text-4xl font-bold text-primary">{results.overallScore}</span>
            <div className="w-full">
              <p className="font-semibold">Overall Score</p>
              <Progress value={results.overallScore} className="mt-1" />
            </div>
          </div>
          <CardDescription className="pt-2">{results.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {results.items.some(i => i.status === 'fail' || i.impact === 'high') && (
                <div className="rounded-md border border-destructive/40 p-3 bg-destructive/5">
                  <p className="font-semibold text-destructive mb-2">High Impact Issues</p>
                  {results.items.filter(i => i.status === 'fail' || i.impact === 'high').map(item => {
                    const iconKey = item.status === 'fail' ? 'fail' : item.status;
                    const Icon = statusIcons[iconKey] || AlertCircle;
                    const color = item.status === 'fail' ? 'text-destructive' : 'text-warning';
                    return (
                      <div key={item.id} className="flex items-start gap-3 mb-2 last:mb-0">
                        <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.details}</p>
                        </div>
                        <span className={`text-xs font-semibold ${color}`}>{item.score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {results.items.map((item) => {
                const Icon = statusIcons[item.status] || AlertCircle;
                const color = statusColors[item.status] || "text-muted-foreground";
                return (
                  <motion.div
                    key={item.id}
                    className="flex items-start gap-4"
                    variants={itemVariants}
                  >
                    <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.details}</p>
                    </div>
                    <span className={`font-semibold text-sm ${color}`}>{item.score}/100</span>
                  </motion.div>
                );
              })}
            </motion.div>
            <div>
              <AuditCharts items={results.items} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </motion.div>
);

export default function SeoAuditPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AuditUrlOutput | null>(null);
  const [quota, setQuota] = useState<{limit:number;used:number;remaining:number}|null>(null);
  const [timing, setTiming] = useState<number| null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { provenance, setProvenance, ProvenanceLegend } = useProvenance();

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (results || error) {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [results, error]);

  const handleSubmit = async (values: AuditUrlInput) => {
    setIsLoading(true);
    setSubmitted(true);
    setResults(null);
    setError(null);
    setProvenance(null);
    setQuota(null);
    setTiming(null);
    try {
      const startedAt = Date.now();
      // Real backend call with timeout & fallback to demo
      const raw = await withTimeout(
        runSEOAudit({ url: values.url, checkMobile: true }),
        20000,
        "SEO audit is taking longer than expected. Using fallback data."
      );
      const unified = adaptSEOAuditResponse(raw, { startedAt });
      setProvenance(unified.source || null);
      if (unified.quota) setQuota(unified.quota);
      setTiming(unified.totalProcessingTime);
      setResults(mapUnifiedToLegacy(unified));

      if (user) {
        const userActivitiesRef = collection(
          db,
          "users",
          user.uid,
          "activities"
        );
        await addDoc(userActivitiesRef, {
          type: "SEO Audit",
          tool: "SEO Audit",
          timestamp: serverTimestamp(),
          details: {
            url: values.url,
            overallScore: unified.overallScore,
            provenance: unified.source,
            cacheHit: unified.cacheHit,
            totalProcessingTime: unified.totalProcessingTime
          },
          resultsSummary: `Audited ${values.url}. Overall Score: ${unified.overallScore}/100 (${unified.source}).`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const shouldDemo = e instanceof TimeoutError || /(internal|cors|network|failed)/i.test(msg);
      if (shouldDemo) {
        console.warn("SEO audit using demo fallback due to:", msg);
          const demoData = getDemoData("seo-audit");
          if (demoData) {
            setResults(demoData as any as AuditUrlOutput);
            setProvenance('fallback');
          } else {
            setError("Audit failed and no demo data available.");
          }
      } else {
        setError(msg || "An unexpected error occurred during the audit.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureGate feature="seo_audit" requiredTier="starter" showUpgrade>
    <main className="container mx-auto py-6">
      <ToolPageHeader
        title="SEO Audit"
        description="Comprehensive SEO analysis and optimization recommendations for any website."
        badges={composeToolHeaderBadges("seo-audit", provenance)}
        showBreadcrumb
  >
        {provenance && (
          <ProvenanceLegend />
        )}
      </ToolPageHeader>
      <div
        className={cn(
          "mx-auto transition-all duration-500",
          submitted ? "max-w-7xl" : "max-w-xl"
        )}
      >
      <div
        className={cn(
          "grid gap-8 transition-all duration-500",
          submitted ? "lg:grid-cols-3" : "lg:grid-cols-1"
        )}
      >
        <motion.div layout className="lg:col-span-1">
          <MobileToolCard
            title="SEO Audit"
            description="Run a technical & on-page SEO analysis for your target URL."
            icon={<ListChecks className="h-5 w-5" />}
          >
            <SeoAuditForm onSubmit={handleSubmit} isLoading={isLoading} />
          </MobileToolCard>
        </motion.div>

        <div className="lg:col-span-2" ref={resultsRef}>
          <AnimatePresence>
            {isLoading && <AuditLoadingSkeleton />}
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive font-headline flex items-center gap-2">
                      <AlertTriangle /> Audit Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{error}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {results && (
              <motion.div key="results" className="space-y-4">
                {(quota || timing) && (
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                    {quota && quota.limit > -1 && (
                      <span>Quota: {quota.used}/{quota.limit} (remaining {quota.remaining})</span>
                    )}
                    {typeof timing === 'number' && (
                      <span>Processed in {(timing/1000).toFixed(2)}s</span>
                    )}
                  </div>
                )}
                <AuditResults results={results} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
  </main>
  </FeatureGate>
  );
}
