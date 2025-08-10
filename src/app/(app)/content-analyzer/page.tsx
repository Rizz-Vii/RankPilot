// src/app/(app)/content-analyzer/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ToolPageHeader } from "@/components/tool-page-header";

import {
  NeuroSEOActionableTasks,
  NeuroSEOCompetitiveDashboard,
  NeuroSEOEngineOverview,
  NeuroSEOFeatureGate,
  NeuroSEOInsightsPanel,
  NeuroSEOProgressIndicator,
} from "@/components/neuroseo/NeuroSEOEnhancedComponents";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  type NeuroSEOAnalysisRequest,
  type NeuroSEOReport
} from "@/lib/neuroseo";
import type {
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
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  RefreshCw,
  Search
} from "lucide-react";

// Enhanced SEO Audit with NeuroSEO™ Integration
export default function ContentAnalyzerPage() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<NeuroSEOReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentEngine, setCurrentEngine] = useState<string>("");
  const [completedEngines, setCompletedEngines] = useState<string[]>([]);

  // Form state
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Get user subscription tier for feature gating
  const userTier = (user as any)?.subscriptionTier || "free";

  // Scroll to results when analysis completes
  useEffect(() => {
    if (report && !isAnalyzing && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report, isAnalyzing]);

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing) {
      const engines = ['neuralCrawler', 'semanticMap', 'aiVisibility', 'trustBlock', 'rewriteGen', 'orchestrator'];
      let currentIndex = 0;
      // Track nested timeouts so they can be cleared if analysis stops early/unmounts
      const pendingTimeouts: number[] = [];

      const interval = setInterval(() => {
        if (currentIndex < engines.length) {
          setCurrentEngine(engines[currentIndex]);
          setAnalysisProgress((currentIndex + 1) * (100 / engines.length));
          const timeoutId = window.setTimeout(() => {
            setCompletedEngines(prev => [...prev, engines[currentIndex]]);
            currentIndex++;
          }, 2000);
          pendingTimeouts.push(timeoutId);
        } else {
          clearInterval(interval);
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        pendingTimeouts.forEach(id => clearTimeout(id));
      };
    } else {
      setAnalysisProgress(0);
      setCurrentEngine("");
      setCompletedEngines([]);
    }
  }, [isAnalyzing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL to analyze");
      return;
    }

    if (!user) {
      setError("Please log in to perform SEO analysis");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setReport(null);

    try {
      const analysisRequest: NeuroSEOAnalysisRequest = {
        urls: [url.trim()],
        targetKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        competitorUrls: competitorUrls.split(',').map(u => u.trim()).filter(Boolean),
        analysisType: "comprehensive",
        userPlan: userTier,
        userId: user.uid,
      };

      // Call NeuroSEO™ API
      const response = await fetch('/api/neuroseo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisRequest),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();

      // For now, create a mock report structure for demonstration
      const mockReport: NeuroSEOReport = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        request: analysisRequest,
        crawlResults: [],
        semanticAnalysis: [],
        visibilityAnalysis: [],
        trustAnalysis: [],
        overallScore: 85,
        keyInsights: [
          {
            category: "seo",
            title: "Missing Meta Description",
            description: "Your page is missing a meta description which is crucial for search rankings.",
            impact: "high",
            confidence: 0.95,
            evidence: ["Meta description tag not found", "Search preview incomplete"],
            recommendation: "Add a compelling 150-160 character meta description that includes your target keywords.",
          },
          {
            category: "technical",
            title: "Page Speed Optimization",
            description: "Several opportunities exist to improve your page loading speed.",
            impact: "medium",
            confidence: 0.88,
            evidence: ["Large image files detected", "Unused CSS identified"],
            recommendation: "Optimize images and remove unused CSS to improve Core Web Vitals.",
          },
        ],
        actionableTasks: [
          {
            id: "task-1",
            title: "Add Meta Description",
            description: "Create and implement a compelling meta description for better search visibility.",
            category: "seo",
            priority: "high",
            estimatedEffort: "low",
            estimatedImpact: 8,
            timeframe: "1 hour",
            dependencies: [],
            resources: [
              {
                type: "guide",
                title: "Meta Description Best Practices",
                description: "Complete guide to writing effective meta descriptions",
              }
            ],
          },
        ],
        competitivePositioning: competitorUrls ? {
          overallRanking: 3,
          totalCompetitors: 5,
          strengths: ["Fast loading speed", "Mobile optimization"],
          weaknesses: ["Missing structured data", "Limited content depth"],
          opportunities: ["Local SEO optimization", "Content expansion"],
          threats: ["Competitor content quality", "Market saturation"],
          recommendations: [
            "Implement structured data markup",
            "Expand content with more detailed sections",
            "Optimize for local search results",
          ],
        } : undefined,
        quotaUsage: {
          allowed: true,
          remaining: 4,
          limit: 5,
          remainingQuota: 4,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      };

      setReport(mockReport);

      // Save to Firestore
      if (user) {
        await addDoc(collection(db, "seoAudits"), {
          userId: user.uid,
          url: url,
          report: mockReport,
          timestamp: serverTimestamp(),
        });
      }

    } catch (error) {
      console.error("Analysis error:", error);
      setError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="container mx-auto py-6 space-y-8">
      <ToolPageHeader
        title="Content Analyzer"
        description="AI-powered multi-engine content quality and optimization audit."
        badges={[{ label: "Beta", variant: "outline" }, { label: "NeuroSEO™", variant: "secondary" }]}
        showBreadcrumb
      />

      {/* Analysis Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Website Analysis
          </CardTitle>
          <CardDescription>
            Enter your website details for comprehensive NeuroSEO™ analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">Website URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="keywords">Target Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                placeholder="SEO, digital marketing, optimization"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <NeuroSEOFeatureGate
              requiredTier="starter"
              currentTier={userTier}
              featureName="Competitive Analysis"
            >
              <div>
                <Label htmlFor="competitors">Competitor URLs (comma-separated)</Label>
                <Textarea
                  id="competitors"
                  placeholder="https://competitor1.com, https://competitor2.com"
                  value={competitorUrls}
                  onChange={(e) => setCompetitorUrls(e.target.value)}
                  rows={3}
                />
              </div>
            </NeuroSEOFeatureGate>

            <Button
              type="submit"
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with NeuroSEO™...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Start NeuroSEO™ Analysis
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <NeuroSEOProgressIndicator
        isAnalyzing={isAnalyzing}
        currentEngine={currentEngine}
        progress={analysisProgress}
        completedEngines={completedEngines}
      />

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {report && (
        <div ref={resultRef} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Engine Overview */}
            <NeuroSEOEngineOverview report={report} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Key Insights */}
            <NeuroSEOInsightsPanel insights={report.keyInsights} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Actionable Tasks */}
            <NeuroSEOActionableTasks tasks={report.actionableTasks} />
          </motion.div>

          {/* Competitive Intelligence (Premium Feature) */}
          {report.competitivePositioning && (
            <NeuroSEOFeatureGate
              requiredTier="starter"
              currentTier={userTier}
              featureName="Competitive Intelligence Dashboard"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <NeuroSEOCompetitiveDashboard positioning={report.competitivePositioning} />
              </motion.div>
            </NeuroSEOFeatureGate>
          )}
        </div>
      )}
  </main>
  );
}

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
                content={(props) => <ChartTooltipContent {...props} />}
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
                  content={(props) => (
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

const AuditResults = ({ results }: { results: AuditUrlOutput; }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Audit Results</CardTitle>
        <div className="flex items-center gap-4 pt-2">
          <span className="text-4xl font-bold text-primary">
            {results.overallScore}
          </span>
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
            {results.items.map((item) => {
              const Icon = statusIcons[item.status] || AlertCircle;
              const color =
                statusColors[item.status] || "text-muted-foreground";
              return (
                <motion.div
                  key={item.id}
                  className="flex items-start gap-4"
                  variants={itemVariants}
                >
                  <Icon className={`mt-1 h-5 w-5 flex-shrink-0 ${color}`} />
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.details}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${color}`}>
                    {item.score}/100
                  </span>
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
  </motion.div>
);

