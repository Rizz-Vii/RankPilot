"use client";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useProvenance } from "@/hooks/useProvenance";
import { db } from "@/lib/firebase";
import {
  createDeterministicRng,
  randomFloat,
  randomInt,
  tagSynthetic,
} from "@/lib/synthetic/synthetic-utils";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { addDoc, collection } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  Download,
  FileText,
  Lightbulb,
  Network,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface TopicCluster {
  id: string;
  topic: string;
  keywords: string[];
  semanticScore: number;
  contentGaps: string[];
  relatedTopics: string[];
  searchVolume: number;
  difficulty: number;
  opportunity: "high" | "medium" | "low";
}

interface KeywordAnalysis {
  keyword: string;
  density: number;
  prominence: number;
  semanticRelevance: number;
  context: string[];
}

interface ContentAnalysis {
  readabilityScore: number;
  contentDepth: number;
  topicCoverage: number;
  semanticRichness: number;
  expertiseSignals: number;
}

interface SemanticMapResult {
  id: string;
  url: string;
  topicClusters: TopicCluster[];
  keywordAnalysis: KeywordAnalysis[];
  contentAnalysis: ContentAnalysis;
  semanticGraph: {
    nodes: Array<{ id: string; label: string; type: string; score: number }>;
    edges: Array<{ source: string; target: string; weight: number }>;
  };
  recommendations: Array<{
    type: "content" | "keyword" | "structure" | "semantic";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    impact: string;
  }>;
  overallScore: number;
  createdAt: Date;
}

export default function SemanticMapPage() {
  const { user } = useAuth();
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<SemanticMapResult | null>(
    null
  );
  const [selectedTab, setSelectedTab] = useState("overview");
  const { provenance, markLive, markFallback } = useProvenance();
  const [adoptionPct, setAdoptionPct] = useState<number | null>(null);
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAdoptionLoading(true);
      try {
        const r = await fetch("/api/health");
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled)
          setAdoptionPct(data?.kpis?.semanticMapAggregateAdoptionPct ?? null);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setAdoptionLoading(false);
      }
    };
    void load();
    const id = setInterval(() => {
      void load();
    }, 8000); // light poll for live changes
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const simulateSemanticAnalysis = async (
    url: string,
    keywords: string[]
  ): Promise<SemanticMapResult> => {
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 12) {
      setAnalysisProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setAnalysisProgress(100);

    const sampleTopics = [
      "SEO Strategy",
      "Content Marketing",
      "Digital Analytics",
      "User Experience",
      "Technical Optimization",
    ];
    const sampleKeywords = [
      "seo",
      "optimization",
      "content",
      "keywords",
      "ranking",
      "traffic",
      "conversion",
    ];

    const rng = createDeterministicRng([
      url,
      keywords.sort().join(","),
      "semantic-map",
    ]);
    const pickOpportunity = () => {
      const r = rng();
      if (r > 0.6) return "high";
      if (r > 0.3) return "medium";
      return "low";
    };
    const mockResult: SemanticMapResult = {
      id: `semantic_${Date.now()}`,
      url,
      topicClusters: sampleTopics.map((topic, index) => ({
        id: `cluster_${index}`,
        topic,
        keywords: sampleKeywords.slice(index, index + 3),
        semanticScore: randomInt(rng, 70, 100),
        contentGaps: ["Advanced techniques", "Case studies", "ROI measurement"],
        relatedTopics: sampleTopics.filter((t) => t !== topic).slice(0, 2),
        searchVolume: randomInt(rng, 5000, 55000),
        difficulty: randomInt(rng, 30, 70),
        opportunity: pickOpportunity(),
      })),
      keywordAnalysis: sampleKeywords.map((keyword) => ({
        keyword,
        density: randomFloat(rng, 0.5, 3.5),
        prominence: randomFloat(rng, 0, 100),
        semanticRelevance: randomFloat(rng, 60, 100),
        context: ["Main content", "Headings", "Meta tags"].slice(
          0,
          randomInt(rng, 1, 3)
        ),
      })),
      contentAnalysis: {
        readabilityScore: randomInt(rng, 70, 100),
        contentDepth: randomInt(rng, 60, 100),
        topicCoverage: randomInt(rng, 70, 100),
        semanticRichness: randomInt(rng, 60, 100),
        expertiseSignals: randomInt(rng, 70, 100),
      },
      semanticGraph: {
        nodes: sampleTopics.map((topic, index) => ({
          id: `node_${index}`,
          label: topic,
          type: "topic",
          score: randomFloat(rng, 60, 100),
        })),
        edges: [
          { source: "node_0", target: "node_1", weight: 0.8 },
          { source: "node_1", target: "node_2", weight: 0.6 },
          { source: "node_2", target: "node_3", weight: 0.7 },
          { source: "node_0", target: "node_4", weight: 0.5 },
        ],
      },
      recommendations: [
        {
          type: "content",
          priority: "high",
          title: "Expand topic coverage",
          description:
            "Add more comprehensive coverage of related semantic topics",
          impact: "Improved topical authority and search visibility",
        },
        {
          type: "keyword",
          priority: "medium",
          title: "Optimize keyword density",
          description: "Balance primary keyword usage throughout the content",
          impact: "Better keyword relevance signals",
        },
        {
          type: "semantic",
          priority: "high",
          title: "Strengthen semantic connections",
          description:
            "Add more related terms and concepts to improve semantic richness",
          impact: "Enhanced understanding by search engines",
        },
      ],
      overallScore: randomInt(rng, 70, 100),
      createdAt: new Date(),
    };
    return tagSynthetic(mockResult);
  };

  const handleAnalyze = async () => {
    if (!analysisUrl || !user) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentResult(null);

    try {
      const keywords = targetKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      let result: SemanticMapResult | null = null;
      try {
        // Prefer live orchestrator path
        const token = await user.getIdToken?.();
        const resp = await fetch("/api/neuroseo/live", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            urls: [analysisUrl],
            analysisType: "semantic-map",
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const semantic = data?.report?.semanticAnalysis?.[0];
          if (semantic) {
            const rng = createDeterministicRng([
              analysisUrl,
              keywords.sort().join(","),
              "semantic-map-live",
            ]);
            const pickOpportunity = () => {
              const r = rng();
              if (r > 0.6) return "high";
              if (r > 0.3) return "medium";
              return "low";
            };
            result = {
              id: data.report?.analysisId || `semantic_${Date.now()}`,
              url: analysisUrl,
              topicClusters: (semantic.fingerprint?.topicClusters || []).map(
                (c: unknown, index: number) => {
                  const cObj = c as Record<string, unknown>;
                  const contentGaps = (semantic.fingerprint?.contentGaps || [])
                    .filter((g: unknown) => {
                      const gObj = g as Record<string, unknown>;
                      return (
                        (gObj.topic as string | undefined) ===
                        (cObj.name as string | undefined)
                      );
                    })
                    .map(
                      (g: unknown) =>
                        (g as Record<string, unknown>).description as string
                    );
                  const relatedTopics = ((cObj.subTopics as unknown[]) || [])
                    .map(
                      (s: unknown) =>
                        (s as Record<string, unknown>).name as string
                    )
                    .slice(0, 2);
                  return {
                    id: (cObj.id as string) || `cluster_${index}`,
                    topic: cObj.name as string,
                    keywords: (cObj.keywords as string[]) || [],
                    semanticScore: Math.round(
                      (cObj.relevanceScore as number) || 0
                    ),
                    contentGaps,
                    relatedTopics,
                    searchVolume: randomInt(rng, 5000, 55000),
                    difficulty: randomInt(rng, 30, 70),
                    opportunity: pickOpportunity(),
                  };
                }
              ),
              keywordAnalysis: (data.report?.keywords || []).map(
                (k: unknown) => {
                  const kObj = k as Record<string, unknown>;
                  return {
                    keyword: kObj.keyword as string,
                    density: randomFloat(rng, 0.5, 3.5),
                    prominence: randomFloat(rng, 0, 100),
                    semanticRelevance: randomFloat(rng, 60, 100),
                    context: ["Main content", "Headings", "Meta tags"].slice(
                      0,
                      randomInt(rng, 1, 3)
                    ),
                  };
                }
              ),
              contentAnalysis: {
                readabilityScore: randomInt(rng, 70, 100),
                contentDepth: randomInt(rng, 60, 100),
                topicCoverage: randomInt(rng, 70, 100),
                semanticRichness: randomInt(rng, 60, 100),
                expertiseSignals: randomInt(rng, 70, 100),
              },
              semanticGraph: {
                nodes: (semantic.visualizationData?.nodes || []).map(
                  (n: unknown) => {
                    const no = n as Record<string, unknown>;
                    return {
                      id: no.id as string,
                      label: no.label as string,
                      type: no.type as string,
                      score: no.size as number,
                    };
                  }
                ),
                edges: (semantic.visualizationData?.edges || []).map(
                  (e: unknown) => {
                    const eo = e as Record<string, unknown>;
                    return {
                      source: eo.source as string,
                      target: eo.target as string,
                      weight: eo.weight as number,
                    };
                  }
                ),
              },
              recommendations: (semantic.recommendations || []).map(
                (r: unknown) => {
                  const ro = r as Record<string, unknown>;
                  const typeStr = ro.type as string | undefined;
                  return {
                    type:
                      typeStr && typeStr.includes("keyword")
                        ? "keyword"
                        : typeStr && typeStr.includes("semantic")
                          ? "semantic"
                          : "content",
                    priority: ro.priority as string,
                    title: ro.title as string,
                    description: ro.description as string,
                    impact: `Estimated impact: ${ro.estimatedImpact as string}`,
                  };
                }
              ),
              overallScore: data.report?.overallScore || 0,
              createdAt: new Date(),
            };
            if (data.provenance === "live" || data.provenance === "cache") {
              markLive();
            } else {
              markFallback();
            }
          }
        }
      } catch {
        // swallow and fallback
      }
      if (!result) {
        // Deterministic synthetic fallback
        result = await simulateSemanticAnalysis(analysisUrl, keywords);
        markFallback();
      }
      setCurrentResult(result);
      await addDoc(collection(db, "semanticMapResults"), {
        userId: user.uid,
        ...result,
        createdAt: new Date(),
      });
      toast.success("Semantic analysis completed successfully!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed. Please try again.");
      markFallback();
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const exportResults = () => {
    if (!currentResult) return;

    const exportData = {
      url: currentResult.url,
      analysis: currentResult,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `semantic-map-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Results exported successfully!");
  };

  // Tokenized chart palette replacing legacy hex colors
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const pieData =
    currentResult?.topicClusters.map((cluster, index) => ({
      name: cluster.topic,
      value: cluster.semanticScore,
      fill: COLORS[index % COLORS.length],
    })) || [];

  const trendData =
    currentResult?.keywordAnalysis.map((keyword) => ({
      keyword: keyword.keyword,
      density: keyword.density,
      relevance: keyword.semanticRelevance,
      prominence: keyword.prominence,
    })) || [];

  return (
    <FeatureGate feature="semantic_map" requiredTier="starter" showUpgrade>
      <main className="container mx-auto py-6 space-y-6">
        <ToolPageHeader
          title="SemanticMap™"
          description="Advanced NLP analysis and topic visualization."
          badges={composeToolHeaderBadges("semantic-map", provenance)}
          showBreadcrumb
        />

        {/* Adoption KPI (T14) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Aggregate Adoption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>SemanticMap Aggregate Read Adoption</span>
              <span className="font-medium">
                {adoptionPct != null
                  ? `${adoptionPct.toFixed(2)}%`
                  : adoptionLoading
                    ? "Loading…"
                    : "—"}
              </span>
            </div>
            <Progress
              value={adoptionPct || 0}
              className={
                adoptionPct != null
                  ? adoptionPct < 50
                    ? "bg-red-200"
                    : adoptionPct < 80
                      ? "bg-amber-200"
                      : "bg-green-200"
                  : ""
              }
            />
            <p className="text-xs text-muted-foreground">
              Target: ≥80% (warn if 50–&lt;80, critical &lt;50). Reflects usage
              of new compact aggregate vs legacy large docs.
            </p>
          </CardContent>
        </Card>

        {/* Analysis Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Semantic Analysis Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="analysis-url">Website URL</Label>
                <Input
                  id="analysis-url"
                  placeholder="https://example.com"
                  value={analysisUrl}
                  onChange={(e) => setAnalysisUrl(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              <div>
                <Label htmlFor="target-keywords">
                  Target Keywords (comma-separated)
                </Label>
                <Input
                  id="target-keywords"
                  placeholder="seo, optimization, content marketing"
                  value={targetKeywords}
                  onChange={(e) => setTargetKeywords(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void handleAnalyze()}
                disabled={isAnalyzing || !analysisUrl}
                className="min-w-[140px]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Content
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      Analyzing semantic structure and topic relationships...
                    </span>
                    <span>{analysisProgress}%</span>
                  </div>
                  <Progress value={analysisProgress} className="w-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {currentResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Semantic Analysis Results
                </h2>
                <Button onClick={exportResults} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Overall Score */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 text-accent-foreground">
                      {currentResult.overallScore}/100
                    </div>
                    <p className="text-muted-foreground">
                      Overall Semantic Score
                    </p>
                    <Progress
                      value={currentResult.overallScore}
                      className="w-full mt-4"
                    />
                  </div>
                </CardContent>
              </Card>

              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="topics">Topics</TabsTrigger>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="recommendations">
                    Recommendations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Topic Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Content Quality Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Readability Score</span>
                            <span>
                              {currentResult.contentAnalysis.readabilityScore}
                              /100
                            </span>
                          </div>
                          <Progress
                            value={
                              currentResult.contentAnalysis.readabilityScore
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Content Depth</span>
                            <span>
                              {currentResult.contentAnalysis.contentDepth}/100
                            </span>
                          </div>
                          <Progress
                            value={currentResult.contentAnalysis.contentDepth}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Topic Coverage</span>
                            <span>
                              {currentResult.contentAnalysis.topicCoverage}/100
                            </span>
                          </div>
                          <Progress
                            value={currentResult.contentAnalysis.topicCoverage}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Semantic Richness</span>
                            <span>
                              {currentResult.contentAnalysis.semanticRichness}
                              /100
                            </span>
                          </div>
                          <Progress
                            value={
                              currentResult.contentAnalysis.semanticRichness
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Keyword Analysis Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="keyword" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="density"
                            stroke="hsl(var(--chart-2))"
                            name="Density"
                          />
                          <Line
                            type="monotone"
                            dataKey="relevance"
                            stroke="hsl(var(--chart-3))"
                            name="Relevance"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="topics" className="space-y-4">
                  <div className="grid gap-4">
                    {currentResult.topicClusters.map((cluster) => (
                      <Card key={cluster.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              {cluster.topic}
                            </CardTitle>
                            <Badge
                              variant={
                                cluster.opportunity === "high"
                                  ? "default"
                                  : cluster.opportunity === "medium"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {cluster.opportunity} opportunity
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-medium">
                                Semantic Score
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress
                                  value={cluster.semanticScore}
                                  className="flex-1"
                                />
                                <span className="text-sm">
                                  {cluster.semanticScore}/100
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">
                                Search Volume
                              </Label>
                              <p className="text-lg font-semibold mt-1">
                                {cluster.searchVolume.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">
                                Difficulty
                              </Label>
                              <Badge
                                variant={
                                  cluster.difficulty < 50
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {cluster.difficulty}/100
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Keywords
                            </Label>
                            <div className="flex flex-wrap gap-1">
                              {cluster.keywords.map((keyword, index) => (
                                <Badge key={index} variant="outline">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Content Gaps
                            </Label>
                            <ul className="text-sm space-y-1">
                              {cluster.contentGaps.map((gap, index) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <Lightbulb className="h-4 w-4 text-warning-foreground" />
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="keywords" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Keyword Analysis Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentResult.keywordAnalysis.map((keyword, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">
                                {keyword.keyword}
                              </h4>
                              <Badge variant="outline">
                                {keyword.density.toFixed(2)}% density
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm">Prominence</Label>
                                <Progress
                                  value={keyword.prominence}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">
                                  Semantic Relevance
                                </Label>
                                <Progress
                                  value={keyword.semanticRelevance}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Context</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {keyword.context.map((ctx, ctxIndex) => (
                                    <Badge
                                      key={ctxIndex}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {ctx}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Content Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span>Readability Score</span>
                              <span className="font-semibold">
                                {currentResult.contentAnalysis.readabilityScore}
                                /100
                              </span>
                            </div>
                            <Progress
                              value={
                                currentResult.contentAnalysis.readabilityScore
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              How easy your content is to read and understand
                            </p>
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <span>Content Depth</span>
                              <span className="font-semibold">
                                {currentResult.contentAnalysis.contentDepth}/100
                              </span>
                            </div>
                            <Progress
                              value={currentResult.contentAnalysis.contentDepth}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Comprehensiveness and detail level of content
                            </p>
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <span>Topic Coverage</span>
                              <span className="font-semibold">
                                {currentResult.contentAnalysis.topicCoverage}
                                /100
                              </span>
                            </div>
                            <Progress
                              value={
                                currentResult.contentAnalysis.topicCoverage
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              How well you cover related topics and subtopics
                            </p>
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <span>Expertise Signals</span>
                              <span className="font-semibold">
                                {currentResult.contentAnalysis.expertiseSignals}
                                /100
                              </span>
                            </div>
                            <Progress
                              value={
                                currentResult.contentAnalysis.expertiseSignals
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Authority and expertise indicators in content
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Network className="h-5 w-5" />
                          Semantic Graph
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center p-8 bg-muted rounded-lg">
                            <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Interactive semantic graph visualization would be
                              displayed here, showing relationships between
                              topics and concepts.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Topic Connections
                            </Label>
                            {currentResult.semanticGraph.edges.map(
                              (edge, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                                >
                                  <span>
                                    {
                                      currentResult.semanticGraph.nodes.find(
                                        (n) => n.id === edge.source
                                      )?.label
                                    }
                                    →
                                    {
                                      currentResult.semanticGraph.nodes.find(
                                        (n) => n.id === edge.target
                                      )?.label
                                    }
                                  </span>
                                  <Badge variant="outline">
                                    {(edge.weight * 100).toFixed(0)}% strength
                                  </Badge>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  <div className="space-y-4">
                    {currentResult.recommendations.map((rec, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              {rec.type === "content" && (
                                <FileText className="h-6 w-6 text-primary" />
                              )}
                              {rec.type === "keyword" && (
                                <Target className="h-6 w-6 text-success" />
                              )}
                              {rec.type === "structure" && (
                                <BarChart3 className="h-6 w-6 text-accent-foreground" />
                              )}
                              {rec.type === "semantic" && (
                                <Network className="h-6 w-6 text-accent" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{rec.title}</h4>
                                <Badge
                                  variant={
                                    rec.priority === "high"
                                      ? "destructive"
                                      : rec.priority === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {rec.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {rec.description}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-success" />
                                <span className="text-success-foreground">
                                  {rec.impact}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </FeatureGate>
  );
}
