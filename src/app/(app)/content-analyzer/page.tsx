// src/app/(app)/content-analyzer/page.tsx
"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import { useEffect, useRef, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { allowContentAnalyzerMocks } from "@/lib/flags/demo";
import {
  type NeuroSEOAnalysisRequest,
  type NeuroSEOReport,
} from "@/lib/neuroseo";
import { queueAnalysisRequest, submitOrQueue } from "@/lib/offline-queue";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, RefreshCw, Search } from "lucide-react";

// Enhanced SEO Audit with NeuroSEO™ Integration
export default function ContentAnalyzerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  // Derive a crude tier (profile likely supplies subscriptionTier elsewhere; fallback to free)
  const userTier: string =
    user &&
    typeof user === "object" &&
    "subscriptionTier" in (user as unknown as Record<string, unknown>) &&
    typeof (user as unknown as Record<string, unknown>).subscriptionTier ===
      "string"
      ? ((user as unknown as Record<string, unknown>)
          .subscriptionTier as string)
      : "free";

  // Scroll to results when analysis completes
  useEffect(() => {
    if (report && !isAnalyzing && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report, isAnalyzing]);

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing) {
      const engines = [
        "neuralCrawler",
        "semanticMap",
        "aiVisibility",
        "trustBlock",
        "rewriteGen",
        "orchestrator",
      ];
      let currentIndex = 0;
      // Track nested timeouts so they can be cleared if analysis stops early/unmounts
      const pendingTimeouts: number[] = [];

      const interval = setInterval(() => {
        if (currentIndex < engines.length) {
          setCurrentEngine(engines[currentIndex]);
          setAnalysisProgress((currentIndex + 1) * (100 / engines.length));
          const timeoutId = window.setTimeout(() => {
            setCompletedEngines((prev) => [...prev, engines[currentIndex]]);
            currentIndex++;
          }, 2000);
          pendingTimeouts.push(timeoutId);
        } else {
          clearInterval(interval);
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        pendingTimeouts.forEach((id) => clearTimeout(id));
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
        targetKeywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        competitorUrls: competitorUrls
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean),
        analysisType: "comprehensive",
        userPlan: userTier,
        userId: user.uid,
      };

      const submit = async () => {
        const token = await user.getIdToken?.();
        const response = await fetch("/api/neuroseo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(analysisRequest),
        });
        if (!response.ok)
          throw new Error(`Analysis failed: ${response.statusText}`);
        return response.json();
      };

      const { mode, result } = await submitOrQueue({
        isOnline: () =>
          typeof navigator !== "undefined" ? navigator.onLine : true,
        submit,
        fallbackQueue: () => queueAnalysisRequest(analysisRequest),
      });

      if (mode === "queued") {
        setIsAnalyzing(false);
        setError(
          "You're offline. Request queued and will run automatically when you're back online."
        );
        toast({
          title: "Request queued",
          description: "Your analysis will run when you're back online.",
        });
        return;
      }

      // The /api/neuroseo route runs the LIVE NeuroSEO suite and returns
      // { success, data: NeuroSEOReport, provenance }. Display the real report when present; its
      // trustMeta.dataIntegrity ('estimated' once the AI insight pass runs over the crawled page,
      // 'simulated' if it fell back) honestly communicates provenance.
      const apiReport = (result as { data?: NeuroSEOReport } | null)?.data;
      if (
        apiReport &&
        Array.isArray(apiReport.keyInsights) &&
        apiReport.keyInsights.length
      ) {
        setReport(apiReport);
        toast({
          title: "Analysis complete",
          description: "NeuroSEO report is ready.",
        });
        setIsAnalyzing(false);
        return;
      }

      // No live data returned — only show a demo mock when demo content is explicitly enabled.
      if (!allowContentAnalyzerMocks()) {
        setError(
          "Live NeuroSEO analysis is not yet available in this environment. Enable demo content to preview with mock data."
        );
        setIsAnalyzing(false);
        return;
      }

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
            description:
              "Your page is missing a meta description which is crucial for search rankings.",
            impact: "high",
            confidence: 0.95,
            evidence: [
              "Meta description tag not found",
              "Search preview incomplete",
            ],
            recommendation:
              "Add a compelling 150-160 character meta description that includes your target keywords.",
          },
          {
            category: "technical",
            title: "Page Speed Optimization",
            description:
              "Several opportunities exist to improve your page loading speed.",
            impact: "medium",
            confidence: 0.88,
            evidence: ["Large image files detected", "Unused CSS identified"],
            recommendation:
              "Optimize images and remove unused CSS to improve Core Web Vitals.",
          },
        ],
        actionableTasks: [
          {
            id: "task-1",
            title: "Add Meta Description",
            description:
              "Create and implement a compelling meta description for better search visibility.",
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
                description:
                  "Complete guide to writing effective meta descriptions",
              },
            ],
          },
        ],
        competitivePositioning: competitorUrls
          ? {
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
            }
          : undefined,
        quotaUsage: {
          allowed: true,
          remaining: 4,
          limit: 5,
          remainingQuota: 4,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      };

      setReport(mockReport);
      toast({
        title: "Analysis complete",
        description: "NeuroSEO report is ready.",
      });

      // Save to Firestore (sanitize undefined nested fields)
      if (user) {
        const sanitize = (obj: unknown): unknown => {
          if (obj === null || typeof obj !== "object") return obj;
          if (Array.isArray(obj)) return obj.map(sanitize);
          const out: Record<string, unknown> = {};
          Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
            if (v === undefined) return; // skip undefined
            out[k] = sanitize(v);
          });
          return out;
        };
        const safeReport: Record<string, unknown> = sanitize(
          mockReport
        ) as Record<string, unknown>;
        await addDoc(collection(db, "seoAudits"), {
          userId: user.uid,
          url: url,
          report: safeReport,
          createdAt: serverTimestamp(),
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
    <FeatureGate feature="content_analyzer" requiredTier="starter" showUpgrade>
      <main className="container mx-auto py-6 space-y-8">
        <ToolPageHeader
          title="Content Analyzer"
          description="AI-powered multi-engine content quality and optimization audit."
          badges={[
            { label: "Beta", variant: "outline" },
            { label: "NeuroSEO™", variant: "secondary" },
          ]}
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
            <form
              ref={formRef}
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-4"
            >
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
                <Label htmlFor="keywords">
                  Target Keywords (comma-separated)
                </Label>
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
                  <Label htmlFor="competitors">
                    Competitor URLs (comma-separated)
                  </Label>
                  <Textarea
                    id="competitors"
                    placeholder="https://competitor1.com, https://competitor2.com"
                    value={competitorUrls}
                    onChange={(e) => setCompetitorUrls(e.target.value)}
                    rows={3}
                  />
                </div>
              </NeuroSEOFeatureGate>

              <Button type="submit" disabled={isAnalyzing} className="w-full">
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
                  <NeuroSEOCompetitiveDashboard
                    positioning={report.competitivePositioning}
                  />
                </motion.div>
              </NeuroSEOFeatureGate>
            )}
          </div>
        )}
      </main>
    </FeatureGate>
  );
}

// (Removed orphaned JSX block that duplicated audit results outside component scope)
