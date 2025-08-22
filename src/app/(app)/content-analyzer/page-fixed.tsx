"use client";

import {
    NeuroSEOActionableTasks,
    NeuroSEOFeatureGate,
    NeuroSEOInsightsPanel,
    NeuroSEOProgressIndicator
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
import { TOOL_NAMES } from "@/lib/activity-types";
import { db } from "@/lib/firebase";
import {
    type NeuroSEOAnalysisRequest,
    type NeuroSEOReport
} from "@/lib/neuroseo";
import { generateId } from "@/lib/utils/generate-id";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Brain,
    CheckCircle,
    Edit,
    RefreshCw,
    TrendingUp
} from "lucide-react";
import { useEffect, useRef, useState } from "react";


/**
 * Added a minimal ContentAnalysisResponse interface to resolve TS2304:
 * "Cannot find name 'ContentAnalysisResponse'".
 * This keeps typing narrow and safe for the local mock analyzer.
 */
interface ContentAnalysisResponse {
    overallScore: number;
    readability: { score: number; grade?: string; suggestions?: string[] };
    seo: { score: number; keywordDensity?: number; suggestions?: string[] };
    sentiment: { score: number; tone?: string; suggestions?: string[] };
    readabilityScore?: number;
    seoScore?: number;
    sentimentScore?: number;
    resultsSummary?: string;
}

// Mock analysis function - to be replaced with NeuroSEO integration
async function _analyzeContent(): Promise<ContentAnalysisResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
        overallScore: 78,
        readability: {
            score: 85,
            grade: "8th Grade",
            suggestions: ["Use shorter sentences", "Simplify complex words"]
        },
        seo: {
            score: 72,
            keywordDensity: 2.1,
            suggestions: ["Increase keyword density", "Add semantic keywords"]
        },
        sentiment: {
            score: 68,
            tone: "Neutral",
            suggestions: ["Add more positive language", "Include emotional triggers"]
        },
        readabilityScore: 85,
        seoScore: 72,
        sentimentScore: 68,
        resultsSummary: "Content analysis completed successfully"
    };
}

// Enhanced Content Analyzer with NeuroSEO™ RewriteGen™ Integration
export default function ContentAnalyzerPage() {
    const { user } = useAuth();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState<NeuroSEOReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [currentEngine, setCurrentEngine] = useState<string>("");
    const [completedEngines, setCompletedEngines] = useState<string[]>([]);

    // Form state
    const [content, setContent] = useState("");
    const [url, setUrl] = useState("");
    const [keywords, setKeywords] = useState("");

    const formRef = useRef<HTMLFormElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // Get user subscription tier for feature gating
    const userTier = (user as { subscriptionTier?: string } | null | undefined)?.subscriptionTier || "free";

    // Scroll to results when analysis completes
    useEffect(() => {
        if (report && !isAnalyzing && resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [report, isAnalyzing]);

    // Simulate analysis progress focusing on content-related engines
    useEffect(() => {
        if (isAnalyzing) {
            const engines = ['semanticMap', 'rewriteGen', 'trustBlock', 'aiVisibility'];
            let currentIndex = 0;
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim() && !url.trim()) {
            setError("Please provide either content text or a URL to analyze");
            return;
        }

        if (!user) {
            setError("Please log in to analyze content");
            return;
        }

        // Call the async worker and intentionally ignore the returned Promise to satisfy
        // @typescript-eslint/no-misused-promises (event handlers must not be async).
        void handleSubmitAsync();
    };

    const handleSubmitAsync = async () => {
        setIsAnalyzing(true);
        setError(null);
        setReport(null);

        try {
            const analysisRequest: NeuroSEOAnalysisRequest = {
                urls: url.trim() ? [url.trim()] : [],
                targetKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                analysisType: "content-focused",
                userPlan: userTier,
                userId: user!.uid,
            };

            // Call NeuroSEO™ API
            const response = await fetch('/api/neuroseo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...analysisRequest,
                    content: content.trim(), // Add content to request
                }),
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }



            // Enhanced mock report for content analysis
            const mockReport = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                request: analysisRequest,
                crawlResults: [],
                semanticAnalysis: [],
                visibilityAnalysis: [],
                trustAnalysis: [],
                rewriteRecommendations: [
                    {
                        originalAnalysis: {
                            wordCount: content.length,
                            readabilityScore: 85,
                            keywordDensity: keywords
                                .split(',')
                                .reduce<Record<string, number>>((acc, k: string) => {
                                    const key = k.trim();
                                    if (key) acc[key] = 2.5;
                                    return acc;
                                }, {}),
                            sentimentScore: 68,
                            structureScore: 78,
                            seoScore: 82,
                            issues: []
                        },
                        variants: [],
                        recommendations: [],
                        bestVariant: "enhanced",
                        comparisonMatrix: {
                            metrics: ['readability', 'seo', 'sentiment'],
                            variants: [
                                {
                                    id: 'original',
                                    title: 'Original Content',
                                    scores: [75, 68, 65]
                                },
                                {
                                    id: 'enhanced',
                                    title: 'Enhanced Content',
                                    scores: [85, 82, 68]
                                }
                            ],
                            winner: 'enhanced',
                            reasoning: 'Enhanced version shows improved readability and SEO metrics'
                        }
                    }
                ],
                overallScore: 82,
                keyInsights: [],
                actionableTasks: [],
                quotaUsage: {
                    allowed: true,
                    remaining: 95,
                    limit: 100,
                    remainingQuota: 95,
                    resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            };

            setReport(mockReport);

            // Save to Firestore with activity tracking
            if (user) {
                await addDoc(collection(db, "contentAnalyses"), {
                    userId: user.uid,
                    content: content.substring(0, 500), // Store first 500 chars
                    url: url || null,
                    report: mockReport,
                    timestamp: serverTimestamp(),
                });

                // Track activity
                await addDoc(collection(db, "activities"), {
                    userId: user.uid,
                    type: "tool-usage",
                    tool: TOOL_NAMES.CONTENT_ANALYZER,
                    timestamp: serverTimestamp(),
                    metadata: {
                        contentLength: content.length,
                        hasUrl: !!url,
                        keywordCount: keywords.split(',').filter(Boolean).length,
                    },
                });
            }

        } catch (error) {
            console.error("Content analysis error:", error);
            setError(error instanceof Error ? error.message : "Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">
                    NeuroSEO™ Content Analyzer
                </h1>
                <p className="text-muted-foreground text-lg">
                    Advanced AI-powered content analysis with RewriteGen™ optimization
                </p>
            </div>

            {/* Analysis Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Content Analysis
                    </CardTitle>
                    <CardDescription>
                        Analyze your content for SEO optimization, readability, and AI-powered rewrite suggestions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="content">Content Text</Label>
                            <Textarea
                                id="content"
                                placeholder="Paste your content here for analysis..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={8}
                                className="resize-none"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                {content.length} characters
                            </p>
                        </div>

                        <div className="text-center text-muted-foreground">
                            <span>OR</span>
                        </div>

                        <div>
                            <Label htmlFor="url">Content URL</Label>
                            <Input
                                id="url"
                                type="url"
                                placeholder="https://example.com/article"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="keywords">Target Keywords (comma-separated)</Label>
                            <Input
                                id="keywords"
                                placeholder="content marketing, SEO, digital strategy"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isAnalyzing || (!content.trim() && !url.trim())}
                            className="w-full"
                        >
                            {isAnalyzing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing with RewriteGen™...
                                </>
                            ) : (
                                <>
                                    <Brain className="mr-2 h-4 w-4" />
                                    Analyze Content
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
                    {/* Engine Overview - Content Focused */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Content Performance Analysis
                                </CardTitle>
                                <CardDescription>
                                    Overall content score: {report.overallScore}/100
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="text-center p-4 rounded-lg bg-primary/10">
                                        <div className="text-2xl font-bold text-primary">85%</div>
                                        <div className="text-sm text-primary/80">Readability</div>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-success/10">
                                        <div className="text-2xl font-bold text-success-foreground">72%</div>
                                        <div className="text-sm text-success-foreground/80">SEO Score</div>
                                    </div>
                                    <div className="text-center p-4 rounded-lg bg-accent/10">
                                        <div className="text-2xl font-bold text-accent">78%</div>
                                        <div className="text-sm text-accent/80">E-A-T Score</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* RewriteGen™ Recommendations */}
                    {report.rewriteRecommendations && report.rewriteRecommendations.length > 0 && (
                        <NeuroSEOFeatureGate
                            requiredTier="starter"
                            currentTier={userTier}
                            featureName="AI Content Rewriting"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Edit className="h-5 w-5" />
                                            RewriteGen™ Recommendations
                                        </CardTitle>
                                        <CardDescription>
                                            AI-powered content improvements with high confidence
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {report.rewriteRecommendations.map((rewrite, index) => (
                                            <div key={index} className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold mb-2">AI-Enhanced Analysis</h4>
                                                    <div className="p-3 rounded border text-sm bg-success/10 border-success/30 text-success-foreground/90">
                                                        Content analysis completed with {rewrite.originalAnalysis.wordCount} words
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold mb-2">Analysis Results</h4>
                                                    <ul className="grid md:grid-cols-2 gap-2">
                                                        <li className="flex items-center gap-2 text-sm">
                                                            <CheckCircle className="h-4 w-4 text-success-foreground" />
                                                            Readability Score: {rewrite.originalAnalysis.readabilityScore}
                                                        </li>
                                                        <li className="flex items-center gap-2 text-sm">
                                                            <CheckCircle className="h-4 w-4 text-success-foreground" />
                                                            SEO Score: {rewrite.originalAnalysis.seoScore}
                                                        </li>
                                                    </ul>
                                                </div>

                                                <div className="grid md:grid-cols-3 gap-4 mt-4">
                                                    <div className="text-center p-3 rounded bg-primary/10">
                                                        <div className="font-bold text-primary">{rewrite.originalAnalysis.readabilityScore}</div>
                                                        <div className="text-xs text-primary/80">Readability Score</div>
                                                    </div>
                                                    <div className="text-center p-3 rounded bg-success/10">
                                                        <div className="font-bold text-success-foreground">{rewrite.originalAnalysis.seoScore}</div>
                                                        <div className="text-xs text-success-foreground/80">SEO Score</div>
                                                    </div>
                                                    <div className="text-center p-3 rounded bg-accent/10">
                                                        <div className="font-bold text-accent">{rewrite.originalAnalysis.structureScore}</div>
                                                        <div className="text-xs text-accent/80">Structure Score</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </NeuroSEOFeatureGate>
                    )}

                    {/* Content Insights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <NeuroSEOInsightsPanel insights={report.keyInsights} />
                    </motion.div>

                    {/* Actionable Tasks */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <NeuroSEOActionableTasks tasks={report.actionableTasks} />
                    </motion.div>
                </div>
            )}
        </div>
    );
}
