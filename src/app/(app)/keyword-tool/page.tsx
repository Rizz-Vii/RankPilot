// src/app/(app)/keyword-tool/page.tsx
"use client";

import Breadcrumb from "@/components/breadcrumb";
import { ToolPageHeader } from "@/components/tool-page-header";
import { KeywordToolForm } from "@/components/forms/seo-forms";
import LoadingState from "@/components/loading-state";
import React, { useState, useEffect, useRef } from "react";
import {
  MobileResultsCard,
  MobileToolCard,
} from "@/components/mobile-tool-layout";
import { useFeedbackCollection } from "@/components/performance-feedback";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDemoData } from "@/lib/demo-data";
import { db } from "@/lib/firebase";
import { TimeoutError, withTimeout } from "@/lib/timeout";
import { cn } from "@/lib/utils";
// Use production AI service (with caching, quota, persistence)
import { fetchKeywordSuggestions, KeywordSuggestionsResponse } from "@/lib/services/ai-service";
import { Badge } from "@/components/ui/badge";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Search, TrendingUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------

interface EnhancedKeywordData {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  competition?: "low" | "medium" | "high";
  semanticCluster?: string;
  topicalRelevance?: number;
  intent?: string;
  opportunities?: string[];
}

const getProgressColor = (score?: number) => {
  if (typeof score !== "number") return "bg-muted";
  if (score > 70) return "bg-destructive";
  if (score > 40) return "bg-warning";
  return "bg-success";
};

const MobileSkeletonList = () => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="p-3 rounded-lg border animate-pulse bg-muted/30">
        <div className="flex justify-between mb-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-3 w-10 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded" />
          <div className="h-3 w-8 bg-muted rounded" />
        </div>
      </div>
    ))}
  </div>
);

const DesktopSkeletonTable = () => (
  <Table className="animate-pulse" aria-hidden="true">
    <TableHeader>
      <TableRow>
        <TableHead>Keyword</TableHead>
        <TableHead className="hidden xl:table-cell">Cluster</TableHead>
        <TableHead className="hidden 2xl:table-cell text-right">Relevance</TableHead>
        <TableHead className="text-right">Search Volume</TableHead>
        <TableHead>Difficulty</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
          <TableCell className="hidden xl:table-cell"><div className="h-3 w-20 bg-muted rounded" /></TableCell>
          <TableCell className="hidden 2xl:table-cell text-right"><div className="h-3 w-10 bg-muted rounded ml-auto" /></TableCell>
          <TableCell className="text-right"><div className="h-3 w-14 bg-muted rounded ml-auto" /></TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-2 bg-muted rounded" />
              <div className="h-3 w-6 bg-muted rounded" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ---------------------------------------------------------------------------
// Results Component
// ---------------------------------------------------------------------------

const KeywordResults = ({ results }: { results: { suggestions: EnhancedKeywordData[]; relatedQueries?: string[] } }) => {
  const { toast } = useToast();
  const copyAll = () => copyToClipboard(results.suggestions.map(k => k.keyword).join(", "));
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Keywords copied to clipboard." });
    }).catch(() => {
      toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy to clipboard." });
    });
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileResultsCard
          title="Keyword Suggestions"
          subtitle={`${results.suggestions.length} keywords found`}
          icon={<Search className="h-5 w-5" />}
          actions={<Button variant="ghost" size="sm" onClick={copyAll}><Copy className="h-4 w-4" /></Button>}
        >
          <div className="space-y-3">
            {results.suggestions.map((k, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{k.keyword}</span>
                  <span className="text-xs text-muted-foreground">{k.searchVolume?.toLocaleString?.() || "-"}/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Progress value={k.difficulty} className={cn("h-2", getProgressColor(k.difficulty))} />
                  </div>
                  <span className="text-xs text-muted-foreground">{k.difficulty ?? "-"}%</span>
                </div>
              </div>
            ))}
          </div>
          {results.relatedQueries?.length ? (
            <div className="mt-4 p-3 bg-muted/40 rounded-md">
              <p className="text-xs font-medium mb-2">Related Queries</p>
              <div className="flex flex-wrap gap-2">
                {results.relatedQueries.slice(0, 10).map((rq, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{rq}</span>
                ))}
              </div>
            </div>
          ) : null}
        </MobileResultsCard>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline">Suggested Keywords</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyAll} className="font-body"><Copy className="mr-2 h-4 w-4" /> Copy</Button>
            </div>
            <CardDescription className="font-body">AI-enriched suggestions with relevance, volume & difficulty.</CardDescription>
            {results.relatedQueries?.length ? (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Related Queries</p>
                <div className="flex flex-wrap gap-2">
                  {results.relatedQueries.slice(0, 12).map((rq, i) => (
                    <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{rq}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="hidden xl:table-cell">Cluster</TableHead>
                  <TableHead className="hidden 2xl:table-cell text-right w-[110px]">Relevance</TableHead>
                  <TableHead className="text-right">Search Volume</TableHead>
                  <TableHead className="w-[150px]">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.suggestions.map((k, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium font-body">{k.keyword}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground font-body">{k.semanticCluster || "-"}</TableCell>
                    <TableCell className="hidden 2xl:table-cell text-right text-xs font-body">{typeof k.topicalRelevance === "number" ? `${k.topicalRelevance}%` : "-"}</TableCell>
                    <TableCell className="text-right font-body">{k.searchVolume?.toLocaleString?.() || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={k.difficulty} className={cn("flex-1", getProgressColor(k.difficulty))} />
                        <span className="text-sm text-muted-foreground font-body w-8">{k.difficulty ?? "-"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function KeywordToolPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordSuggestionsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // Performance feedback integration
  const { startOperation, endOperation, FeedbackComponent } =
    useFeedbackCollection("keyword-suggestions");

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (results) {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [results]);

  const { provenance, setProvenance } = useProvenance();

  const handleSubmit = async (values: { topic: string; includeLongTailKeywords: boolean; }) => {
    setIsLoading(true);
    setSubmitted(true);
    setResults(null);
  setErrorMessage(null);
  setUsedFallback(false);
    setProvenance(null);

    // Start performance monitoring
    startOperation();

    try {
      // Try to get real data with timeout
      const result = await withTimeout(
        fetchKeywordSuggestions({
          query: values.topic,
          count: values.includeLongTailKeywords ? 20 : 10,
          includeMetrics: true,
          language: "en"
        }),
        20000,
        "Keyword analysis is taking longer than expected. Using demo data instead."
      );

  // Adapter compatibility (older demo shape uses keywords[])
      const adapted: KeywordSuggestionsResponse = {
        suggestions: (result as any)?.suggestions || (result as any)?.keywords || [],
        relatedQueries: (result as any)?.relatedQueries || [],
        totalProcessingTime: (result as any)?.totalProcessingTime || 0,
        cacheHit: (result as any)?.cacheHit || false,
        plan: (result as any)?.plan,
        quota: (result as any)?.quota,
        source: (result as any)?.source, // live | cache | fallback
      };
  setResults(adapted);
  setUsedFallback(adapted.source === 'fallback');
  setProvenance(adapted.source as any);

      // End performance monitoring with success
      endOperation(false);

    if (user) {
        const userActivitiesRef = collection(
          db,
          "users",
          user.uid,
          "activities"
        );
        await addDoc(userActivitiesRef, {
          type: "Keyword Search",
          tool: "Keyword Tool",
          timestamp: serverTimestamp(),
          details: values,
      resultsSummary: `Searched for keywords related to "${values.topic}". Found ${(adapted?.suggestions?.length || 0)} suggestions.`,
        });
      }
    } catch (error) {
      // End performance monitoring with error
      endOperation(true); // Force show feedback on error

      const message = (error as any)?.message || "Unknown error";
      const isTimeout = error instanceof TimeoutError;
      const isServiceUnavailable = /temporarily unavailable|internal|unavailable/i.test(message);
      const isGenericFailure = /Failed to get keyword suggestions/i.test(message);
      const isQuota = /Daily keyword research limit reached/i.test(message);
      const isRateLimited = /sending requests too quickly|rate limit/i.test(message);

      if (isTimeout || isServiceUnavailable || isGenericFailure) {
        console.warn("Keyword suggestions fallback engaged:", message);
        const demoData = getDemoData("keyword-tool");
        if (demoData) {
          const adapted: KeywordSuggestionsResponse = {
            suggestions: (demoData as any).keywords || [],
            relatedQueries: [],
            totalProcessingTime: 0,
            cacheHit: false,
            source: 'fallback'
          };
          setResults(adapted);
          setUsedFallback(true);
          setProvenance('fallback');
          if (!isTimeout) {
            // Provide subtle notice that data is fallback
            setErrorMessage("Live service unavailable. Showing demo data – retry for fresh results.");
          }
        } else {
          setErrorMessage(message);
        }
      } else if (isQuota || isRateLimited) {
        setErrorMessage(message);
        // structured error telemetry (fire and forget)
        try {
          await addDoc(collection(db, "telemetry", "keywordTool", "errors"), {
            userId: user?.uid || null,
            message,
            code: (error as any)?.code || null,
            isTimeout,
            isServiceUnavailable,
            isQuota,
            isRateLimited,
            createdAt: serverTimestamp(),
          });
        } catch {}
      } else {
  console.error("Error fetching keyword suggestions:", error);
        setErrorMessage(message || "Unexpected error fetching keywords");
        try {
          await addDoc(collection(db, "telemetry", "keywordTool", "errors"), {
            userId: user?.uid || null,
            message,
            code: (error as any)?.code || null,
            createdAt: serverTimestamp(),
          });
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <main className="container mx-auto py-6">
      <ToolPageHeader
        title="Keyword Research Tool"
        description="Discover high-performing keywords to boost your SEO strategy and content performance."
    badges={composeToolHeaderBadges("keyword-tool", provenance)}
      />

      <section
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
              title="Keyword Analysis"
              description="Enter your topic to get keyword suggestions"
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <KeywordToolForm onSubmit={handleSubmit} isLoading={isLoading} />
            </MobileToolCard>
          </motion.div>

          <div className="lg:col-span-2" ref={resultsRef}>
            <AnimatePresence>
              {isLoading && (
                <motion.div key="loading" className="space-y-6" aria-busy="true" aria-live="polite">
                  <LoadingState
                    isLoading={true}
                    title="Analyzing Keywords"
                    subtitle="Finding the best keyword opportunities for your content..."
                    showTips={false}
                    variant="default"
                  />
                  {/* Skeleton Loaders */}
                  <div className="block md:hidden">
                    <MobileSkeletonList />
                  </div>
                  <div className="hidden md:block">
                    <DesktopSkeletonTable />
                  </div>
                </motion.div>
              )}
              {results && results.suggestions.length > 0 && (
                <motion.div key="results">
                  <KeywordResults results={results} />
                </motion.div>
              )}
              {results && results.suggestions.length === 0 && !isLoading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <p className="font-body text-muted-foreground text-center">
                        No keywords found for this topic. Try a different one.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              {errorMessage && !isLoading && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="border-destructive/40">
                    <CardContent className="p-6">
                      <p className="font-body text-destructive text-center">
                        {errorMessage}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            {results?.quota && (
              <p className="mt-4 text-xs text-muted-foreground font-body text-center">
                {results.quota.limit === -1 ? "Unlimited quota" : `${results.quota.remaining} of ${results.quota.limit} daily searches remaining`}
                {results.cacheHit && " • Cache hit"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Performance Feedback Component */}
      {FeedbackComponent}
    </main>
  );
}

