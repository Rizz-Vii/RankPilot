"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Map, 
  FileText, 
  Target, 
  TrendingUp, 
  Brain,
  Download,
  RefreshCw,
  Zap,
  BarChart3,
  Network,
  Eye,
  Search,
  BookOpen,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TopicCluster {
  id: string;
  topic: string;
  keywords: string[];
  semanticScore: number;
  contentGaps: string[];
  relatedTopics: string[];
  searchVolume: number;
  difficulty: number;
  opportunity: 'high' | 'medium' | 'low';
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
    type: 'content' | 'keyword' | 'structure' | 'semantic';
    priority: 'high' | 'medium' | 'low';
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
  const [currentResult, setCurrentResult] = useState<SemanticMapResult | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  const simulateSemanticAnalysis = async (url: string, keywords: string[]): Promise<SemanticMapResult> => {
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 12) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const sampleTopics = ['SEO Strategy', 'Content Marketing', 'Digital Analytics', 'User Experience', 'Technical Optimization'];
    const sampleKeywords = ['seo', 'optimization', 'content', 'keywords', 'ranking', 'traffic', 'conversion'];

    const mockResult: SemanticMapResult = {
      id: `semantic_${Date.now()}`,
      url,
      topicClusters: sampleTopics.map((topic, _index) => ({
        id: `cluster_${index}`,
        topic,
        keywords: sampleKeywords.slice(_index, index + 3),
        semanticScore: Math.floor(Math.random() * 30) + 70,
        contentGaps: ['Advanced techniques', 'Case studies', 'ROI measurement'],
        relatedTopics: sampleTopics.filter(t => t !== topic).slice(0, 2),
        searchVolume: Math.floor(Math.random() * 50000) + 5000,
        difficulty: Math.floor(Math.random() * 40) + 30,
        opportunity: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low'
      })),
      keywordAnalysis: sampleKeywords.map(keyword => ({
        keyword,
        density: Math.random() * 3 + 0.5,
        prominence: Math.random() * 100,
        semanticRelevance: Math.random() * 40 + 60,
        context: ['Main content', 'Headings', 'Meta tags'].slice(0, Math.floor(Math.random() * 3) + 1)
      })),
      contentAnalysis: {
        readabilityScore: Math.floor(Math.random() * 30) + 70,
        contentDepth: Math.floor(Math.random() * 40) + 60,
        topicCoverage: Math.floor(Math.random() * 30) + 70,
        semanticRichness: Math.floor(Math.random() * 40) + 60,
        expertiseSignals: Math.floor(Math.random() * 30) + 70
      },
      semanticGraph: {
        nodes: sampleTopics.map((topic, _index) => ({
          id: `node_${index}`,
          label: topic,
          type: 'topic',
          score: Math.random() * 40 + 60
        })),
        edges: [
          { source: 'node_0', target: 'node_1', weight: 0.8 },
          { source: 'node_1', target: 'node_2', weight: 0.6 },
          { source: 'node_2', target: 'node_3', weight: 0.7 },
          { source: 'node_0', target: 'node_4', weight: 0.5 }
        ]
      },
      recommendations: [
        {
          type: 'content',
          priority: 'high',
          title: 'Expand topic coverage',
          description: 'Add more comprehensive coverage of related semantic topics',
          impact: 'Improved topical authority and search visibility'
        },
        {
          type: 'keyword',
          priority: 'medium',
          title: 'Optimize keyword density',
          description: 'Balance primary keyword usage throughout the content',
          impact: 'Better keyword relevance signals'
        },
        {
          type: 'semantic',
          priority: 'high',
          title: 'Strengthen semantic connections',
          description: 'Add more related terms and concepts to improve semantic richness',
          impact: 'Enhanced understanding by search engines'
        }
      ],
      overallScore: Math.floor(Math.random() * 30) + 70,
      createdAt: new Date()
    };

    return mockResult;
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
      const keywords = targetKeywords.split(',').map(k => k.trim()).filter(k => k);
      const result = await simulateSemanticAnalysis(analysisUrl, keywords);
      setCurrentResult(_result);

      // Save result to database
      await addDoc(collection(db, 'semanticMapResults'), {
        userId: user.uid,
        ..._result,
        createdAt: new Date()
      });

      toast.success("Semantic analysis completed successfully!");

    } catch (_error) {
      console.error('Analysis _error:', _error);
      toast.error("Analysis failed. Please try again.");
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
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `semantic-map-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully!");
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const pieData = currentResult?.topicClusters.map((cluster, _index) => ({
    name: cluster.topic,
    _value: cluster.semanticScore,
    fill: COLORS[index % COLORS.length]
  })) || [];

  const trendData = currentResult?.keywordAnalysis.map((keyword, _index) => ({
    keyword: keyword.keyword,
    density: keyword.density,
    relevance: keyword.semanticRelevance,
    prominence: keyword.prominence
  })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Network className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">SemanticMap™</h1>
          <p className="text-muted-foreground">
            Advanced NLP analysis and topic visualization
          </p>
        </div>
      </div>

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
                onChange={(e) => setAnalysisUrl(e.target._value)}
                disabled={isAnalyzing}
              />
            </div>
            <div>
              <Label htmlFor="target-keywords">Target Keywords (comma-separated)</Label>
              <Input
                id="target-keywords"
                placeholder="seo, optimization, content marketing"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target._value)}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleAnalyze}
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
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>Analyzing semantic structure and topic relationships...</span>
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
              <h2 className="text-2xl font-bold">Semantic Analysis Results</h2>
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Overall Score */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2 text-purple-600">
                    {currentResult.overallScore}/100
                  </div>
                  <p className="text-muted-foreground">Overall Semantic Score</p>
                  <Progress value={currentResult.overallScore} className="w-full mt-4" />
                </div>
              </CardContent>
            </Card>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="topics">Topics</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
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
                            {pieData.map((entry, _index) => (
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
                          <span>{currentResult.contentAnalysis.readabilityScore}/100</span>
                        </div>
                        <Progress value={currentResult.contentAnalysis.readabilityScore} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Content Depth</span>
                          <span>{currentResult.contentAnalysis.contentDepth}/100</span>
                        </div>
                        <Progress value={currentResult.contentAnalysis.contentDepth} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Topic Coverage</span>
                          <span>{currentResult.contentAnalysis.topicCoverage}/100</span>
                        </div>
                        <Progress value={currentResult.contentAnalysis.topicCoverage} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Semantic Richness</span>
                          <span>{currentResult.contentAnalysis.semanticRichness}/100</span>
                        </div>
                        <Progress value={currentResult.contentAnalysis.semanticRichness} />
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
                        <Line type="monotone" dataKey="density" stroke="#8884d8" name="Density" />
                        <Line type="monotone" dataKey="relevance" stroke="#82ca9d" name="Relevance" />
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
                          <Badge variant={
                            cluster.opportunity === 'high' ? 'default' : 
                            cluster.opportunity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {cluster.opportunity} opportunity
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Semantic Score</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={cluster.semanticScore} className="flex-1" />
                              <span className="text-sm">{cluster.semanticScore}/100</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Search Volume</Label>
                            <p className="text-lg font-semibold mt-1">{cluster.searchVolume.toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Difficulty</Label>
                            <Badge variant={cluster.difficulty < 50 ? 'default' : 'destructive'}>
                              {cluster.difficulty}/100
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Keywords</Label>
                          <div className="flex flex-wrap gap-1">
                            {cluster.keywords.map((keyword, _index) => (
                              <Badge key={index} variant="outline">{keyword}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Content Gaps</Label>
                          <ul className="text-sm space-y-1">
                            {cluster.contentGaps.map((gap, _index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-500" />
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
                      {currentResult.keywordAnalysis.map((keyword, _index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{keyword.keyword}</h4>
                            <Badge variant="outline">
                              {keyword.density.toFixed(2)}% density
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">Prominence</Label>
                              <Progress value={keyword.prominence} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-sm">Semantic Relevance</Label>
                              <Progress value={keyword.semanticRelevance} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-sm">Context</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {keyword.context.map((ctx, ctxIndex) => (
                                  <Badge key={ctxIndex} variant="secondary" className="text-xs">
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
                            <span className="font-semibold">{currentResult.contentAnalysis.readabilityScore}/100</span>
                          </div>
                          <Progress value={currentResult.contentAnalysis.readabilityScore} />
                          <p className="text-xs text-muted-foreground mt-1">
                            How easy your content is to read and understand
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Content Depth</span>
                            <span className="font-semibold">{currentResult.contentAnalysis.contentDepth}/100</span>
                          </div>
                          <Progress value={currentResult.contentAnalysis.contentDepth} />
                          <p className="text-xs text-muted-foreground mt-1">
                            Comprehensiveness and detail level of content
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Topic Coverage</span>
                            <span className="font-semibold">{currentResult.contentAnalysis.topicCoverage}/100</span>
                          </div>
                          <Progress value={currentResult.contentAnalysis.topicCoverage} />
                          <p className="text-xs text-muted-foreground mt-1">
                            How well you cover related topics and subtopics
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Expertise Signals</span>
                            <span className="font-semibold">{currentResult.contentAnalysis.expertiseSignals}/100</span>
                          </div>
                          <Progress value={currentResult.contentAnalysis.expertiseSignals} />
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
                            Interactive semantic graph visualization would be displayed here,
                            showing relationships between topics and concepts.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Topic Connections</Label>
                          {currentResult.semanticGraph.edges.map((edge, _index) => (
                            <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                              <span>
                                {currentResult.semanticGraph.nodes.find(n => n.id === edge.source)?.label} 
                                → 
                                {currentResult.semanticGraph.nodes.find(n => n.id === edge.target)?.label}
                              </span>
                              <Badge variant="outline">
                                {(edge.weight * 100).toFixed(0)}% strength
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.recommendations.map((rec, _index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {rec.type === 'content' && <FileText className="h-6 w-6 text-blue-600" />}
                            {rec.type === 'keyword' && <Target className="h-6 w-6 text-green-600" />}
                            {rec.type === 'structure' && <BarChart3 className="h-6 w-6 text-purple-600" />}
                            {rec.type === 'semantic' && <Network className="h-6 w-6 text-orange-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge variant={
                                rec.priority === 'high' ? 'destructive' : 
                                rec.priority === 'medium' ? 'default' : 'secondary'
                              }>
                                {rec.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">{rec.impact}</span>
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
    </div>
  );
}
