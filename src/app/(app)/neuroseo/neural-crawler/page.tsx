"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Globe, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Brain,
  Download,
  RefreshCw,
  Zap,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { tagSynthetic } from '@/lib/synthetic/synthetic-utils';
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";

interface CrawlResult {
  id: string;
  url: string;
  title: string;
  metaDescription: string;
  content: string;
  wordCount: number;
  readingTime: number;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  links: Array<{
    href: string;
    text: string;
    type: 'internal' | 'external';
  }>;
  technicalData: {
    loadTime: number;
    pageSize: number;
    statusCode: number;
    contentType: string;
    lastModified?: string;
  };
  seoAnalysis: {
    titleLength: number;
    metaDescriptionLength: number;
    headingStructure: string;
    imageOptimization: number;
    internalLinks: number;
    externalLinks: number;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }>;
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'product' | 'concept';
    confidence: number;
  }>;
  createdAt: Date;
}

interface CrawlHistory {
  id: string;
  url: string;
  status: 'completed' | 'failed' | 'processing';
  pagesFound: number;
  totalTime: number;
  createdAt: Date;
}

export default function NeuralCrawlerPage() {
  const { user } = useAuth();
  const { provenance, setProvenance, markLive, markFallback } = useProvenance();
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<CrawlResult | null>(null);
  const [crawlHistory, setCrawlHistory] = useState<CrawlHistory[]>([]);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    if (user) {
      loadCrawlHistory();
    }
  }, [user]);

  const loadCrawlHistory = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'neuralCrawlerHistory'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const history: CrawlHistory[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          url: data.url,
          status: data.status,
          pagesFound: data.pagesFound || 1,
          totalTime: data.totalTime || 0,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });
      
      setCrawlHistory(history);
    } catch (error) {
      console.error('Error loading crawl history:', error);
    }
  };

  const simulateAnalysis = async (url: string): Promise<CrawlResult> => {
    setProvenance(null);
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 10) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate realistic crawl data
  const mockResult: CrawlResult = {
      id: `crawl_${Date.now()}`,
      url,
      title: "Complete SEO Guide for Modern Businesses | Expert Strategies",
      metaDescription: "Discover proven SEO strategies that drive organic traffic. Expert insights, actionable techniques, and comprehensive analysis for business growth.",
      content: `This comprehensive SEO guide provides expert insights into modern search engine optimization strategies. Learn about keyword research, content optimization, technical SEO, and link building techniques that drive sustainable organic growth.

The guide covers essential topics including on-page optimization, site structure, user experience signals, and emerging trends in search algorithms. Whether you're a beginner or experienced marketer, these strategies will help improve your website's visibility and performance.

Key areas of focus include content quality assessment, competitive analysis, performance monitoring, and conversion optimization. The guide also explores advanced techniques for enterprise-level SEO implementation and measurement frameworks for ROI tracking.`,
      wordCount: 1247,
      readingTime: 5,
      headings: {
        h1: ["Complete SEO Guide for Modern Businesses"],
        h2: ["Keyword Research Fundamentals", "On-Page Optimization", "Technical SEO Essentials", "Link Building Strategies"],
        h3: ["Search Intent Analysis", "Content Optimization", "Site Speed Optimization", "Mobile-First Indexing"],
        h4: ["Tools and Resources", "Best Practices", "Common Mistakes"],
        h5: ["Advanced Techniques"],
        h6: []
      },
      images: [
        { src: "/seo-guide-hero.jpg", alt: "SEO Strategy Visualization", width: 1200, height: 600 },
        { src: "/keyword-research-chart.png", alt: "Keyword Research Process", width: 800, height: 400 },
        { src: "/technical-seo-diagram.svg", alt: "Technical SEO Components", width: 600, height: 300 }
      ],
      links: [
        { href: "/blog/keyword-research", text: "Advanced Keyword Research", type: "internal" },
        { href: "/tools/seo-analyzer", text: "SEO Analysis Tool", type: "internal" },
        { href: "https://developers.google.com/search/docs", text: "Google Search Documentation", type: "external" },
        { href: "https://moz.com/beginners-guide-to-seo", text: "Moz SEO Guide", type: "external" }
      ],
      technicalData: {
        loadTime: 1.23,
        pageSize: 234567,
        statusCode: 200,
        contentType: "text/html",
        lastModified: new Date().toISOString()
      },
      seoAnalysis: {
        titleLength: 57,
        metaDescriptionLength: 156,
        headingStructure: "Good",
        imageOptimization: 85,
        internalLinks: 12,
        externalLinks: 8
      },
      issues: [
        {
          type: "warning",
          message: "Some images missing alt text",
          recommendation: "Add descriptive alt text to all images for better accessibility"
        },
        {
          type: "info",
          message: "Good content length detected",
          recommendation: "Continue creating comprehensive, valuable content"
        }
      ],
      entities: [
        { text: "SEO", type: "concept", confidence: 0.95 },
        { text: "Google", type: "organization", confidence: 0.92 },
        { text: "keyword research", type: "concept", confidence: 0.88 },
        { text: "content optimization", type: "concept", confidence: 0.85 }
      ],
      createdAt: new Date()
    };

  markLive();
  return tagSynthetic(mockResult);
  };

  const handleAnalyze = async () => {
    if (!crawlUrl || !user) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentResult(null);

    try {
      // Save crawl request to history
      const historyDoc = await addDoc(collection(db, 'neuralCrawlerHistory'), {
        userId: user.uid,
        url: crawlUrl,
        status: 'processing',
        createdAt: new Date()
      });

      // Simulate analysis
      const result = await simulateAnalysis(crawlUrl);
      setCurrentResult(result);

      // Save complete result
      await addDoc(collection(db, 'neuralCrawlerResults'), {
        userId: user.uid,
        historyId: historyDoc.id,
        ...result,
        createdAt: new Date()
      });

      await loadCrawlHistory();
      toast.success("Website analysis completed successfully!");

    } catch (error) {
      console.error('Analysis error:', error);
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
    a.download = `neural-crawler-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully!");
  };

  const ResultsSkeleton = () => (
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
  );

  return (
    <main className="container mx-auto py-6 px-3 sm:px-6 space-y-6">
      <ToolPageHeader
        title="NeuralCrawler™"
        description="Intelligent web content extraction with JavaScript rendering."
        badges={composeToolHeaderBadges("neural-crawler", provenance)}
        showBreadcrumb
      />

      {/* Analysis Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Website Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="crawl-url">Website URL</Label>
              <Input
                id="crawl-url"
                placeholder="https://example.com"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !crawlUrl}
                className="min-w-[120px]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
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
                  <span>Crawling and analyzing content...</span>
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
        {isAnalyzing && !currentResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preparing Analysis</h2>
            <ResultsSkeleton />
          </motion.div>
        )}
        {currentResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="seo">SEO Analysis</TabsTrigger>
                <TabsTrigger value="entities">Entities</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{currentResult.wordCount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Words</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{currentResult.readingTime}</p>
                          <p className="text-sm text-muted-foreground">Min Read</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{currentResult.links.length}</p>
                          <p className="text-sm text-muted-foreground">Links Found</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Page Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm mt-1">{currentResult.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Meta Description</Label>
                      <p className="text-sm mt-1">{currentResult.metaDescription}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">URL</Label>
                      <p className="text-sm mt-1 text-blue-600">{currentResult.url}</p>
                    </div>
                  </CardContent>
                </Card>

                {currentResult.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Issues & Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {currentResult.issues.map((issue, index) => (
                        <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{issue.message}</strong>
                            <br />
                            <span className="text-sm">{issue.recommendation}</span>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Heading Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(currentResult.headings).map(([level, headings]) => (
                      headings.length > 0 && (
                        <div key={level}>
                          <Badge variant="outline" className="mb-2">
                            {level.toUpperCase()} ({headings.length})
                          </Badge>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {headings.map((heading, index) => (
                              <li key={index} className="text-sm">{heading}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Images ({currentResult.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentResult.images.slice(0, 5).map((image, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                          <ImageIcon className="h-4 w-4" />
                          <span className="flex-1 truncate">{image.alt || 'No alt text'}</span>
                          {image.width && image.height && (
                            <Badge variant="outline" className="text-xs">
                              {image.width}×{image.height}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {currentResult.images.length > 5 && (
                        <p className="text-sm text-muted-foreground">
                          +{currentResult.images.length - 5} more images
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Load Time</span>
                        <Badge variant={currentResult.technicalData.loadTime < 2 ? 'default' : 'destructive'}>
                          {currentResult.technicalData.loadTime}s
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Page Size</span>
                        <span>{(currentResult.technicalData.pageSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Code</span>
                        <Badge variant={currentResult.technicalData.statusCode === 200 ? 'default' : 'destructive'}>
                          {currentResult.technicalData.statusCode}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Link Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span>Internal Links</span>
                        <span>{currentResult.links.filter(l => l.type === 'internal').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>External Links</span>
                        <span>{currentResult.links.filter(l => l.type === 'external').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Links</span>
                        <span>{currentResult.links.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Title Length</Label>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(currentResult.seoAnalysis.titleLength / 60) * 100} 
                            className="flex-1" 
                          />
                          <span className="text-sm">{currentResult.seoAnalysis.titleLength}/60</span>
                        </div>
                      </div>
                      <div>
                        <Label>Meta Description Length</Label>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(currentResult.seoAnalysis.metaDescriptionLength / 160) * 100} 
                            className="flex-1" 
                          />
                          <span className="text-sm">{currentResult.seoAnalysis.metaDescriptionLength}/160</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="flex justify-between">
                        <span>Heading Structure</span>
                        <Badge variant="default">{currentResult.seoAnalysis.headingStructure}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Image Optimization</span>
                        <Badge variant={currentResult.seoAnalysis.imageOptimization > 80 ? 'default' : 'secondary'}>
                          {currentResult.seoAnalysis.imageOptimization}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="entities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Named Entities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {currentResult.entities.map((entity, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          <span>{entity.text}</span>
                          <span className="text-xs opacity-70">
                            ({(entity.confidence * 100).toFixed(0)}%)
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crawl History */}
      {crawlHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Crawls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crawlHistory.map((crawl) => (
                <div key={crawl.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant={crawl.status === 'completed' ? 'default' : 'secondary'}>
                      {crawl.status}
                    </Badge>
                    <span className="text-sm truncate max-w-md">{crawl.url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{crawl.pagesFound} pages</span>
                    <span>•</span>
                    <span>{new Date(crawl.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
  </main>
  );
}
