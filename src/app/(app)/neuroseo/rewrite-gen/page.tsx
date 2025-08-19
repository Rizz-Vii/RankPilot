"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToolPageHeader } from "@/components/tool-page-header";
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
  TrendingUp,
  Download,
  RefreshCw,
  Copy,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createDeterministicRng, randomInt, randomFloat, tagSynthetic } from '@/lib/synthetic/synthetic-utils';
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FeatureGate } from '@/components/subscription/FeatureGate';

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
  const { provenance, setProvenance, markLive } = useProvenance();
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
    setProvenance(null);
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 12) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    const sampleSections = ['Introduction', 'Main Content', 'Conclusion', 'Call to Action'];
    const improvementTypes: Array<'seo' | 'readability' | 'engagement' | 'conversion' | 'clarity'> = 
      ['seo', 'readability', 'engagement', 'conversion', 'clarity'];

    const rng = createDeterministicRng([inputUrl || content.slice(0,50), keywords.sort().join(','), type]);
    const mockResult: RewriteGenResult = {
      id: `rewrite_${Date.now()}`,
      url: inputUrl,
      originalContent: content,
  analysisType: type as typeof analysisType,
      contentSuggestions: sampleSections.map((section, index) => ({
        section,
        originalText: `Original ${section.toLowerCase()} text that could be improved for better SEO performance and user engagement.`,
        suggestedText: `Enhanced ${section.toLowerCase()} text with optimized keywords, improved readability, and stronger call-to-action elements for better conversion rates.`,
        improvementType: improvementTypes[index % improvementTypes.length],
        confidence: randomFloat(rng,0.7,1,3),
        reasoning: `Improved keyword density, enhanced readability score, and stronger user engagement signals`,
        impact: `Expected ${randomInt(rng,10,30)}% improvement in search rankings`,
        wordCountChange: randomInt(rng,-10,10)
      })),
      titleSuggestions: [
        {
          title: `Complete ${keywords[0] || 'SEO'} Guide for 2025 | Expert Strategies & Tips`,
          seoScore: randomInt(rng,80,100),
          readabilityScore: randomInt(rng,85,100),
          engagementScore: randomInt(rng,75,100),
          reasoning: 'Includes target keyword, year relevance, and compelling modifiers',
          targetKeywords: keywords.slice(0, 2)
        },
        {
          title: `${keywords[0] || 'SEO'} Best Practices: Proven Methods That Drive Results`,
          seoScore: randomInt(rng,85,100),
          readabilityScore: randomInt(rng,80,100),
          engagementScore: randomInt(rng,80,100),
          reasoning: 'Action-oriented language with benefit-focused approach',
          targetKeywords: keywords.slice(0, 1)
        },
        {
          title: `How to Master ${keywords[0] || 'SEO'}: Step-by-Step Implementation Guide`,
          seoScore: randomInt(rng,75,100),
          readabilityScore: randomInt(rng,90,100),
          engagementScore: randomInt(rng,85,100),
          reasoning: 'Clear how-to format with specific promise of step-by-step guidance',
          targetKeywords: keywords.slice(0, 1)
        }
      ],
      metaDescriptionSuggestions: [
        {
          metaDescription: `Discover proven ${keywords[0] || 'SEO'} strategies that drive real results. Expert insights, actionable tips, and comprehensive guides for ${new Date().getFullYear()}. Start optimizing today!`,
          length: 145,
          seoScore: randomInt(rng,80,100),
          keywordUsage: keywords.slice(0, 2),
          callToAction: true,
          reasoning: 'Optimal length, includes target keywords, and compelling call-to-action'
        },
        {
          metaDescription: `Learn ${keywords[0] || 'SEO'} best practices from industry experts. Comprehensive tutorials, case studies, and proven techniques for business growth.`,
          length: 134,
          seoScore: randomInt(rng,85,100),
          keywordUsage: keywords.slice(0, 1),
          callToAction: false,
          reasoning: 'Good keyword placement and clear value proposition'
        }
      ],
      overallImprovementScore: randomInt(rng,75,100),
      metrics: {
        readabilityImprovement: randomInt(rng,15,45),
        seoOptimization: randomInt(rng,20,55),
        engagementBoost: randomInt(rng,18,43),
        conversionPotential: randomInt(rng,12,32)
      },
      keywordOptimization: {
        targetKeywords: keywords,
        keywordDensity: keywords.reduce((acc, keyword) => {
          acc[keyword] = {
            original: randomFloat(rng,0.5,2.5),
            suggested: randomFloat(rng,1.5,3)
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
    markLive();
    return tagSynthetic(mockResult);
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
  const keywords = targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
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

    } catch (error) {
      console.error('Analysis error:', error);
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
    <FeatureGate feature="rewrite_gen" requiredTier="agency" showUpgrade>
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="RewriteGen™"
        description="AI-powered content rewriting and optimization."
        badges={composeToolHeaderBadges("rewrite-gen", provenance)}
        showBreadcrumb
      />

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
              <Select value={analysisType} onValueChange={(value: typeof analysisType) => setAnalysisType(value)}>
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
                  <div className="text-5xl font-bold mb-2 text-warning-foreground">
                    {currentResult.overallImprovementScore}/100
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">Overall Improvement Score</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">
                        +{currentResult.metrics.readabilityImprovement}%
                      </div>
                      <p className="text-sm text-muted-foreground">Readability</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-success-foreground">
                        +{currentResult.metrics.seoOptimization}%
                      </div>
                      <p className="text-sm text-muted-foreground">SEO Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-accent-foreground">
                        +{currentResult.metrics.engagementBoost}%
                      </div>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-warning-foreground">
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
                        <Tooltip formatter={(value) => [`+${value}%`, 'Improvement']} />
                        <Bar dataKey="improvement" fill="hsl(var(--chart-1))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {currentResult.contentSuggestions.map((suggestion, index) => (
                    <Card key={index}>
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
                              <Label className="text-sm font-medium text-destructive-foreground">Original</Label>
                              <div className="p-3 bg-destructive/10 border border-destructive/40 rounded text-sm mt-1">
                                {suggestion.originalText}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-success-foreground">Suggested</Label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopySuggestion(suggestion.suggestedText, `suggestion-${index}`)}
                                  className="h-7"
                                >
                                  {copiedSuggestion === `suggestion-${index}` ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <div className="p-3 bg-success/10 border border-success/40 rounded text-sm mt-1 text-success-foreground/90">
                                {suggestion.suggestedText}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-warning-foreground" />
                              <span className="font-medium">Reasoning:</span>
                              <span>{suggestion.reasoning}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-success-foreground" />
                              <span className="font-medium">Expected Impact:</span>
                              <span>{suggestion.impact}</span>
                            </div>
                            {suggestion.wordCountChange !== 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <span className="font-medium">Word Count Change:</span>
                                <span className={suggestion.wordCountChange > 0 ? 'text-success-foreground' : 'text-destructive-foreground'}>
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
                  {currentResult.titleSuggestions.map((title, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">{title.title}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySuggestion(title.title, `title-${index}`)}
                            >
                              {copiedSuggestion === `title-${index}` ? (
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
                              <Lightbulb className="h-4 w-4 text-warning-foreground" />
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
                  {currentResult.metaDescriptionSuggestions.map((meta, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Meta Description {index + 1}</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySuggestion(meta.metaDescription, `meta-${index}`)}
                            >
                              {copiedSuggestion === `meta-${index}` ? (
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
                              <Lightbulb className="h-4 w-4 text-warning-foreground" />
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
                            <span className="text-sm text-destructive-foreground">
                              Original: {data.original.toFixed(1)}%
                            </span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-sm text-success-foreground">
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
                      {currentResult.keywordOptimization.semanticKeywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                    <Alert className="mt-4">
                      <Lightbulb className="h-4 w-4 text-warning-foreground" />
                      <AlertDescription>
                        Include these semantic keywords naturally throughout your content to improve topical relevance and search visibility.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.recommendations.map((rec, index) => (
                    <Card key={index}>
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
                                  <CheckCircle2 className="h-3 w-3 text-success-foreground" />
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
    </main>
  </FeatureGate>
  );
}
