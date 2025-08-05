"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  PenTool, 
  Sparkles, 
  Target, 
  TrendingUp,
  Brain,
  Download,
  RefreshCw,
  Zap,
  Copy,
  Eye,
  ThumbsUp,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ContentSuggestion {
  section: string;
  originalText: string;
  suggestedText: string;
  improvementType: 'seo' | 'readability' | 'engagement' | 'conversion' | 'clarity';
  confidence: number;
  reasoning: string;
  impact: string;
  wordCountChange: number;
}

interface TitleSuggestion {
  title: string;
  seoScore: number;
  readabilityScore: number;
  engagementScore: number;
  reasoning: string;
  targetKeywords: string[];
}

interface MetaSuggestion {
  metaDescription: string;
  length: number;
  seoScore: number;
  keywordUsage: string[];
  callToAction: boolean;
  reasoning: string;
}

interface RewriteGenResult {
  id: string;
  url: string;
  originalContent: string;
  analysisType: 'comprehensive' | 'seo-focused' | 'readability' | 'conversion';
  contentSuggestions: ContentSuggestion[];
  titleSuggestions: TitleSuggestion[];
  metaDescriptionSuggestions: MetaSuggestion[];
  overallImprovementScore: number;
  metrics: {
    readabilityImprovement: number;
    seoOptimization: number;
    engagementBoost: number;
    conversionPotential: number;
  };
  keywordOptimization: {
    targetKeywords: string[];
    keywordDensity: Record<string, { original: number; suggested: number }>;
    semanticKeywords: string[];
  };
  recommendations: Array<{
    category: 'structure' | 'style' | 'seo' | 'conversion';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    examples: string[];
  }>;
  createdAt: Date;
}

export default function RewriteGenPage() {
  const { user } = useAuth();
  const [inputUrl, setInputUrl] = useState("");
  const [contentText, setContentText] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'seo-focused' | 'readability' | 'conversion'>('comprehensive');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<RewriteGenResult | null>(null);
  const [selectedTab, setSelectedTab] = useState("suggestions");
  const [copiedSuggestion, setCopiedSuggestion] = useState<string | null>(null);

  const simulateRewriteAnalysis = async (
    content: string, 
    keywords: string[], 
    type: string
  ): Promise<RewriteGenResult> => {
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 12) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    const sampleSections = ['Introduction', 'Main Content', 'Conclusion', 'Call to Action'];
    const improvementTypes: Array<'seo' | 'readability' | 'engagement' | 'conversion' | 'clarity'> = 
      ['seo', 'readability', 'engagement', 'conversion', 'clarity'];

    const mockResult: RewriteGenResult = {
      id: `rewrite_${Date.now()}`,
      url: inputUrl,
      originalContent: content,
      analysisType: type as 'comprehensive' | 'seo-focused' | 'readability' | 'conversion',
      contentSuggestions: sampleSections.map((section, _index) => ({
        section,
        originalText: `Original ${section.toLowerCase()} text that could be improved for better SEO performance and user engagement.`,
        suggestedText: `Enhanced ${section.toLowerCase()} text with optimized keywords, improved readability, and stronger call-to-action elements for better conversion rates.`,
        improvementType: improvementTypes[_index % improvementTypes.length],
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        reasoning: `Improved keyword density, enhanced readability score, and stronger user engagement signals`,
        impact: `Expected ${Math.floor(Math.random() * 20) + 10}% improvement in search rankings`,
        wordCountChange: Math.floor(Math.random() * 20) - 10 // -10 to +10 words
      })),
      titleSuggestions: [
        {
          title: `Complete ${keywords[0] || 'SEO'} Guide for 2025 | Expert Strategies & Tips`,
          seoScore: Math.floor(Math.random() * 20) + 80,
          readabilityScore: Math.floor(Math.random() * 15) + 85,
          engagementScore: Math.floor(Math.random() * 25) + 75,
          reasoning: 'Includes target keyword, year relevance, and compelling modifiers',
          targetKeywords: keywords.slice(0, 2)
        },
        {
          title: `${keywords[0] || 'SEO'} Best Practices: Proven Methods That Drive Results`,
          seoScore: Math.floor(Math.random() * 15) + 85,
          readabilityScore: Math.floor(Math.random() * 20) + 80,
          engagementScore: Math.floor(Math.random() * 20) + 80,
          reasoning: 'Action-oriented language with benefit-focused approach',
          targetKeywords: keywords.slice(0, 1)
        },
        {
          title: `How to Master ${keywords[0] || 'SEO'}: Step-by-Step Implementation Guide`,
          seoScore: Math.floor(Math.random() * 25) + 75,
          readabilityScore: Math.floor(Math.random() * 10) + 90,
          engagementScore: Math.floor(Math.random() * 15) + 85,
          reasoning: 'Clear how-to format with specific promise of step-by-step guidance',
          targetKeywords: keywords.slice(0, 1)
        }
      ],
      metaDescriptionSuggestions: [
        {
          metaDescription: `Discover proven ${keywords[0] || 'SEO'} strategies that drive real results. Expert insights, actionable tips, and comprehensive guides for ${new Date().getFullYear()}. Start optimizing today!`,
          length: 145,
          seoScore: Math.floor(Math.random() * 20) + 80,
          keywordUsage: keywords.slice(0, 2),
          callToAction: true,
          reasoning: 'Optimal length, includes target keywords, and compelling call-to-action'
        },
        {
          metaDescription: `Learn ${keywords[0] || 'SEO'} best practices from industry experts. Comprehensive tutorials, case studies, and proven techniques for business growth.`,
          length: 134,
          seoScore: Math.floor(Math.random() * 15) + 85,
          keywordUsage: keywords.slice(0, 1),
          callToAction: false,
          reasoning: 'Good keyword placement and clear value proposition'
        }
      ],
      overallImprovementScore: Math.floor(Math.random() * 25) + 75,
      metrics: {
        readabilityImprovement: Math.floor(Math.random() * 30) + 15,
        seoOptimization: Math.floor(Math.random() * 35) + 20,
        engagementBoost: Math.floor(Math.random() * 25) + 18,
        conversionPotential: Math.floor(Math.random() * 20) + 12
      },
      keywordOptimization: {
        targetKeywords: keywords,
        keywordDensity: keywords.reduce((acc, keyword) => {
          acc[keyword] = {
            original: Math.random() * 2 + 0.5,
            suggested: Math.random() * 1.5 + 1.5
          };
          return acc;
        }, {} as Record<string, { original: number; suggested: number }>),
        semanticKeywords: [
          `${keywords[0] || 'SEO'} strategy`,
          `${keywords[0] || 'SEO'} optimization`,
          `${keywords[0] || 'SEO'} best practices`,
          'digital marketing',
          'search rankings'
        ]
      },
      recommendations: [
        {
          category: 'seo',
          priority: 'high',
          title: 'Optimize keyword density',
          description: 'Balance primary keyword usage throughout content for better search visibility',
          examples: ['Use target keyword in H1 and H2 tags', 'Include semantic variations', 'Maintain 1-2% keyword density']
        },
        {
          category: 'structure',
          priority: 'medium',
          title: 'Improve content structure',
          description: 'Break down long paragraphs and use more subheadings',
          examples: ['Add bullet points', 'Use shorter sentences', 'Include transition words']
        },
        {
          category: 'conversion',
          priority: 'high',
          title: 'Strengthen call-to-action',
          description: 'Add compelling CTAs throughout the content',
          examples: ['Use action-oriented language', 'Create urgency', 'Provide clear next steps']
        }
      ],
      createdAt: new Date()
    };

    return mockResult;
  };

  const handleAnalyze = async () => {
    if ((!inputUrl && !contentText) || !user) {
      toast.error("Please enter a URL or content text");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentResult(null);

    try {
      const keywords = targetKeywords.split(',').map(k => k.trim()).filter(k => k);
      const content = contentText || `Content from ${inputUrl}`;
      
      const result = await simulateRewriteAnalysis(content, keywords, analysisType);
      setCurrentResult(result);

      // Save result to database
      await addDoc(collection(db, 'rewriteGenResults'), {
        userId: user.uid,
        ...result,
        createdAt: new Date()
      });

      toast.success("Content rewrite analysis completed successfully!");

    } catch (_error) {
      console.error('Analysis _error:', _error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleCopySuggestion = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuggestion(id);
    setTimeout(() => setCopiedSuggestion(null), 2000);
    toast.success("Copied to clipboard!");
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
    a.download = `rewrite-gen-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully!");
  };

  const metricsData = currentResult ? [
    { name: 'Readability', improvement: currentResult.metrics.readabilityImprovement },
    { name: 'SEO', improvement: currentResult.metrics.seoOptimization },
    { name: 'Engagement', improvement: currentResult.metrics.engagementBoost },
    { name: 'Conversion', improvement: currentResult.metrics.conversionPotential }
  ] : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PenTool className="h-8 w-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold">RewriteGen™</h1>
          <p className="text-muted-foreground">
            AI-powered content rewriting and optimization
          </p>
        </div>
      </div>

      {/* Analysis Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Content Rewrite Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="input-url">Website URL (optional)</Label>
              <Input
                id="input-url"
                placeholder="https://example.com"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <div>
              <Label htmlFor="target-keywords">Target Keywords</Label>
              <Input
                id="target-keywords"
                placeholder="seo, optimization, content marketing"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="content-text">Content Text</Label>
              <Textarea
                id="content-text"
                placeholder="Paste your content here for rewriting analysis..."
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                disabled={isAnalyzing}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="analysis-type">Analysis Type</Label>
              <Select value={analysisType} onValueChange={(value: 'comprehensive' | 'seo-focused' | 'readability' | 'conversion') => setAnalysisType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select analysis type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Analysis</SelectItem>
                  <SelectItem value="seo-focused">SEO-Focused</SelectItem>
                  <SelectItem value="readability">Readability Enhancement</SelectItem>
                  <SelectItem value="conversion">Conversion Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!inputUrl && !contentText)}
              className="min-w-[160px]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Generate Rewrites
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
                  <span>Analyzing content and generating optimized rewrites...</span>
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
              <h2 className="text-2xl font-bold">Rewrite Analysis Results</h2>
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Overall Score */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2 text-orange-600">
                    {currentResult.overallImprovementScore}/100
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">Overall Improvement Score</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        +{currentResult.metrics.readabilityImprovement}%
                      </div>
                      <p className="text-sm text-muted-foreground">Readability</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        +{currentResult.metrics.seoOptimization}%
                      </div>
                      <p className="text-sm text-muted-foreground">SEO Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">
                        +{currentResult.metrics.engagementBoost}%
                      </div>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">
                        +{currentResult.metrics.conversionPotential}%
                      </div>
                      <p className="text-sm text-muted-foreground">Conversion</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="suggestions">Content</TabsTrigger>
                <TabsTrigger value="titles">Titles</TabsTrigger>
                <TabsTrigger value="meta">Meta</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="recommendations">Tips</TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Improvement Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metricsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(_value) => [`+${_value}%`, 'Improvement']} />
                        <Bar dataKey="improvement" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {currentResult.contentSuggestions.map((suggestion, _index) => (
                    <Card key={_index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {suggestion.section}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {suggestion.improvementType}
                              </Badge>
                              <Badge variant="default">
                                {(suggestion.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-red-600">Original</Label>
                              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm mt-1">
                                {suggestion.originalText}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-green-600">Suggested</Label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopySuggestion(suggestion.suggestedText, `suggestion-${_index}`)}
                                  className="h-7"
                                >
                                  {copiedSuggestion === `suggestion-${_index}` ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm mt-1">
                                {suggestion.suggestedText}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium">Reasoning:</span>
                              <span>{suggestion.reasoning}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Expected Impact:</span>
                              <span>{suggestion.impact}</span>
                            </div>
                            {suggestion.wordCountChange !== 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">Word Count Change:</span>
                                <span className={suggestion.wordCountChange > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {suggestion.wordCountChange > 0 ? '+' : ''}{suggestion.wordCountChange} words
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="titles" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.titleSuggestions.map((title, _index) => (
                    <Card key={_index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">{title.title}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySuggestion(title.title, `title-${_index}`)}
                            >
                              {copiedSuggestion === `title-${_index}` ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">SEO Score</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={title.seoScore} className="flex-1" />
                                <span className="text-sm font-medium">{title.seoScore}/100</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">Readability</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={title.readabilityScore} className="flex-1" />
                                <span className="text-sm font-medium">{title.readabilityScore}/100</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">Engagement</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={title.engagementScore} className="flex-1" />
                                <span className="text-sm font-medium">{title.engagementScore}/100</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-sm font-medium">Target Keywords</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {title.targetKeywords.map((keyword, keyIndex) => (
                                  <Badge key={keyIndex} variant="outline">{keyword}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium">Why this works:</span>
                              <span>{title.reasoning}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="meta" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.metaDescriptionSuggestions.map((meta, _index) => (
                    <Card key={_index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Meta Description {_index + 1}</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySuggestion(meta.metaDescription, `meta-${_index}`)}
                            >
                              {copiedSuggestion === `meta-${_index}` ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          <div className="p-3 bg-muted rounded text-sm">
                            {meta.metaDescription}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">Length</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress 
                                  value={(meta.length / 160) * 100} 
                                  className="flex-1" 
                                />
                                <span className="text-sm font-medium">{meta.length}/160</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">SEO Score</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={meta.seoScore} className="flex-1" />
                                <span className="text-sm font-medium">{meta.seoScore}/100</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">Call to Action</Label>
                              <div className="mt-1">
                                {meta.callToAction ? (
                                  <Badge variant="default">Present</Badge>
                                ) : (
                                  <Badge variant="outline">Missing</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-sm font-medium">Keywords Used</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {meta.keywordUsage.map((keyword, keyIndex) => (
                                  <Badge key={keyIndex} variant="outline">{keyword}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium">Analysis:</span>
                              <span>{meta.reasoning}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="keywords" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Density Optimization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(currentResult.keywordOptimization.keywordDensity).map(([keyword, data]) => (
                      <div key={keyword} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{keyword}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-red-600">
                              Original: {data.original.toFixed(1)}%
                            </span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-sm text-green-600">
                              Suggested: {data.suggested.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Progress value={data.original * 20} className="h-2" />
                          <Progress value={data.suggested * 20} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Semantic Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {currentResult.keywordOptimization.semanticKeywords.map((keyword, _index) => (
                        <Badge key={_index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                    <Alert className="mt-4">
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        Include these semantic keywords naturally throughout your content to improve topical relevance and search visibility.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.recommendations.map((rec, _index) => (
                    <Card key={_index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <Badge variant={
                              rec.priority === 'high' ? 'destructive' : 
                              rec.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {rec.priority} priority
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rec.category}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                          
                          <div>
                            <Label className="text-sm font-medium">Implementation Examples:</Label>
                            <ul className="text-sm mt-2 space-y-1">
                              {rec.examples.map((example, exIndex) => (
                                <li key={exIndex} className="flex items-center gap-2">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  {example}
                                </li>
                              ))}
                            </ul>
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
