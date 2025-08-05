// src/app/(app)/keyword-tool/page.tsx
"use client";

import Breadcrumb from "@/components/breadcrumb";
import { KeywordToolForm } from "@/components/forms/seo-forms";
import LoadingState from "@/components/loading-state";
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
import { getKeywordSuggestions } from "@/lib/utils/content-functions";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Search,
  TrendingUp
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Enhanced keyword data structure for NeuroSEO™ SemanticMap™
interface _EnhancedKeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  competition: "low" | "medium" | "high";
  cpc: number;
  opportunity: number;
  trends: number[];
  intent: "informational" | "navigational" | "commercial" | "transactional";
  relatedQuestions: string[];
  semanticGroups: string[];
}

interface KeywordResultsData {
  keywords: Array<{
    keyword: string;
    searchVolume: number;
    difficulty: number;
  }>;
}

const getProgressColor = (score: number) => {
  if (score > 70) return "bg-destructive";
  if (score > 40) return "bg-warning";
  return "bg-success";
};

const KeywordResults = ({ results }: { results: KeywordResultsData; }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Keywords copied to clipboard.",
        });
      })
      .catch((_err) => {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy to clipboard.",
        });
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Mobile Results */}
      <div className="block md:hidden">
            <MobileResultsCard
          title="Keyword Suggestions"
              subtitle={`${results.keywords?.length || 0} keywords found`}
          icon={<Search className="h-5 w-5" />}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyToClipboard(
                      (results.keywords || []).map((k) => k.keyword).join(", ")
                )
              }
            >
              <Copy className="h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-3">
                {results.keywords.map((keyword, _index: number) => (
                  <div key={_index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{keyword.keyword}</span>
                  <div className="text-xs text-muted-foreground">
                        {keyword.searchVolume.toLocaleString()}/mo
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Progress
                      value={keyword.difficulty}
                      className={cn(
                        "h-2",
                        getProgressColor(keyword.difficulty)
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                        {keyword.difficulty}% difficulty
                  </span>
                </div>
              </div>
            ))}
          </div>
        </MobileResultsCard>
      </div>

      {/* Desktop Results */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline">
                Suggested Keywords
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                        results.keywords.map((k) => k.keyword).join(", ")
                  )
                }
                className="font-body"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Keywords
              </Button>
            </div>
            <CardDescription className="font-body">
              Here are keywords related to your topic, with estimated volume and
              ranking difficulty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Search Volume</TableHead>
                  <TableHead className="w-[150px]">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                    {results.keywords.map((keyword, _index: number) => (
                      <TableRow key={_index}>
                    <TableCell className="font-medium font-body">
                          {keyword.keyword}
                    </TableCell>
                    <TableCell className="text-right font-body">
                          {keyword.searchVolume.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={keyword.difficulty}
                          className={cn(
                            "flex-1",
                            getProgressColor(keyword.difficulty)
                          )}
                        />
                        <span className="text-sm text-muted-foreground font-body w-8">
                              {keyword.difficulty}
                        </span>
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
export default function KeywordToolPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResultsData | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (values: { topic: string; includeLongTailKeywords: boolean; }) => {
    setIsLoading(true);
    setSubmitted(true);
    setResults(null);

    // Start performance monitoring
    startOperation();

    try {
      // Try to get real data with timeout
      const result = await withTimeout(
        getKeywordSuggestions({
          seed: values.topic,
          count: values.includeLongTailKeywords ? 20 : 10,
          includeMetrics: true
        }),
        15000, // 15 second timeout
        "Keyword analysis is taking longer than expected. Using demo data instead."
      );
      setResults(result);

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
          resultsSummary: `Searched for keywords related to "${values.topic}". Found ${(result as unknown as KeywordResultsData)?.keywords?.length || 0} suggestions.`,
        });
      }
    } catch (_error) {
      // End performance monitoring with error
      endOperation(true); // Force show feedback on error

      if (_error instanceof TimeoutError) {
        console.warn(
          "Keyword analysis timed out, using demo _data:",
          _error.message
        );
        // Use demo data as fallback
        const demoData = getDemoData("keyword-tool");
        if (demoData) {
          setResults(demoData);
        }
      } else {
        console.error("Error fetching keyword suggestions:", _error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-6">
      <div className="mb-6">
        <Breadcrumb />
      </div>

      {/* Page Title - DevLast Task 8: Accessibility & Semantics */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-headline text-primary mb-2">
          Keyword Research Tool
        </h1>
        <p className="text-muted-foreground font-body">
          Discover high-performing keywords to boost your SEO strategy and content performance.
        </p>
      </header>

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
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div key="loading">
                  <LoadingState
                    isLoading={true}
                    title="Analyzing Keywords"
                    subtitle="Finding the best keyword opportunities for your content..."
                    tips={[
                      "💡 Long-tail keywords often have less competition",
                      "🎯 Focus on search intent, not just volume",
                      "🤔 Consider user questions and problems",
                      "🔍 Look for keyword gaps in your niche",
                    ]}
                    showTips={true}
                    variant="default"
                  />
                </motion.div>
              )}
              {results && results.keywords.length > 0 && (
                <motion.div key="results">
                  <KeywordResults results={results} />
                </motion.div>
              )}
              {results && results.keywords.length === 0 && !isLoading && (
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
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Performance Feedback Component */}
      {FeedbackComponent}
    </main>
  );
}

