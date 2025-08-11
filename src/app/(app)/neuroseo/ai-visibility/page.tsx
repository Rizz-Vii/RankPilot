"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Bot, Search, TrendingUp, AlertCircle, CheckCircle2, ExternalLink, Copy, Download, Zap } from "lucide-react";
import { DashboardSurface } from '@/components/layout/DashboardSurface';
import { SuiteAccentProvider } from '@/context/SuiteAccentContext';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AIVisibilityResult {
  citation: {
    platform: string;
    position: number;
    snippet: string;
    confidence: number;
    url: string;
  };
  optimization: {
    recommendations: string[];
    priority: "high" | "medium" | "low";
    impact: number;
  };
}

interface AnalysisResult {
  score: number;
  citationRate: number;
  visibility: AIVisibilityResult[];
  recommendations: string[];
  platforms: Array<{
    name: string;
    citations: number;
    position: number;
    trend: "up" | "down" | "stable";
  }>;
}

export default function AIVisibilityEnginePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { provenance, setProvenance } = useProvenance();
  
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [analysisType, setAnalysisType] = useState<"quick" | "deep" | "competitor">("quick");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const analyzeAIVisibility = async () => {
    if (!url || !query) {
      toast({
        title: "Missing Information",
        description: "Please provide both URL and search query",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
  try {
      const response = await fetch("/api/neuroseo/ai-visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          query,
          targetAudience,
          analysisType,
          userId: user?.uid
        })
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

  const data = await response.json();
  setResults(data);
  setProvenance(data?.cacheHit ? 'cache' : 'live');
      
      toast({
        title: "Analysis Complete",
        description: "AI visibility analysis has been completed successfully",
      });

    } catch (error) {
      console.error("AI visibility analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to complete AI visibility analysis. Please try again.",
        variant: "destructive"
      });
      // Mark fallback only if we had no previous results
      if (!results) setProvenance('fallback');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const exportResults = () => {
    if (!results) return;
    
    const exportData = {
      url,
      query,
      results,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url_export = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url_export;
    a.download = `ai-visibility-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url_export);
  };

  return (
    <main className="container mx-auto py-6 px-3 sm:px-6 space-y-6">
      <ToolPageHeader
        title="AI Visibility Engine"
        description="Optimize your content for AI-powered search and discovery."
        badges={composeToolHeaderBadges("ai-visibility", provenance)}
        showBreadcrumb
      />
  <SuiteAccentProvider value="seo">
  <DashboardSurface as="section" className="space-y-8 p-6">
      {/* Analysis Form */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Visibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="query">Target Search Query</Label>
                <Input
                  id="query"
                  placeholder="best SEO tools 2024"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience (Optional)</Label>
              <Textarea
                id="audience"
                placeholder="Digital marketers, SEO professionals..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysisType">Analysis Type</Label>
              <Select value={analysisType} onValueChange={(value: "quick" | "deep" | "competitor") => setAnalysisType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick">Quick Analysis (5 min)</SelectItem>
                  <SelectItem value="deep">Deep Analysis (15 min)</SelectItem>
                  <SelectItem value="competitor">Competitor Comparison (20 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={analyzeAIVisibility} 
              disabled={loading || !url || !query}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing AI Visibility...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze AI Visibility
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      {!results && loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preparing Visibility Report</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-3 w-1/2 bg-muted rounded" />
                  <div className="h-6 w-2/3 bg-muted rounded" />
                  <div className="h-2 w-1/3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
  {results && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">AI Visibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">{results.score}%</div>
                  <Progress value={results.score} className="flex-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Citation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">{results.citationRate}%</div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Platform Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{results.platforms.length}</div>
                <p className="text-sm text-muted-foreground">AI platforms analyzed</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-4 w-fit">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="citations">Citations</TabsTrigger>
                <TabsTrigger value="platforms">Platforms</TabsTrigger>
                <TabsTrigger value="recommendations">Optimize</TabsTrigger>
              </TabsList>
              
              <Button variant="outline" onClick={exportResults} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {results.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="citations">
              <Card>
                <CardHeader>
                  <CardTitle>AI Platform Citations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.visibility.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.citation.platform}</Badge>
                            <Badge variant={item.citation.position <= 3 ? "default" : "secondary"}>
                              Position #{item.citation.position}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={item.citation.confidence} className="w-20" />
                            <span className="text-sm text-muted-foreground">
                              {item.citation.confidence}%
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm bg-muted/50 p-3 rounded">"{item.citation.snippet}"</p>
                        
                        <div className="flex items-center justify-between">
                          <a 
                            href={item.citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View Source <ExternalLink className="h-3 w-3" />
                          </a>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(item.citation.snippet)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platforms">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.platforms.map((platform, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Bot className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{platform.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {platform.citations} citations
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Avg Position: #{platform.position}
                          </Badge>
                          <Badge 
                            variant={
                              platform.trend === "up" ? "default" :
                              platform.trend === "down" ? "destructive" : "secondary"
                            }
                          >
                            {platform.trend === "up" ? "↗" : platform.trend === "down" ? "↘" : "→"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <div className="space-y-6">
                {results.visibility.map((item, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className={`h-4 w-4 ${
                          item.optimization.priority === "high" ? "text-red-600" :
                          item.optimization.priority === "medium" ? "text-yellow-600" : "text-green-600"
                        }`} />
                        {item.citation.platform} Optimization
                        <Badge variant={
                          item.optimization.priority === "high" ? "destructive" :
                          item.optimization.priority === "medium" ? "default" : "secondary"
                        }>
                          {item.optimization.priority} priority
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-muted-foreground">Impact Potential:</span>
                          <Progress value={item.optimization.impact} className="w-32" />
                          <span className="text-sm font-medium">{item.optimization.impact}%</span>
                        </div>
                        
                        {item.optimization.recommendations.map((rec, recIndex) => (
                          <div key={recIndex} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
      {!loading && !results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-sm text-muted-foreground">
          Enter a URL & query above to run AI visibility analysis.
        </motion.div>
      )}
  </DashboardSurface>
  </SuiteAccentProvider>
  </main>
  );
}
