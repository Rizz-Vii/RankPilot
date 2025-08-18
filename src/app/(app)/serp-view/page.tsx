// src/app/(app)/serp-view/page.tsx
"use client";

import SerpViewForm from "@/components/serp-view-form";
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import SerpViewResults from "@/components/serp-view-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { cn, safeErrorMessage } from "@/lib/utils";
import { getSerpData } from "@/lib/utils/content-functions";
import type {
  SerpViewInput,
  SerpViewOutput
} from "@/types";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useSerpKeywordMetrics } from '@/hooks/useSerpKeywordMetrics';
import { useIsMobile } from '@/hooks/use-mobile';
import { MetricCard } from '@/components/metrics/MetricCard';
import { TrendSparkline } from '@/components/metrics/TrendSparkline';
import { LazyDataTable } from '@/components/metrics/LazyDataTable';
import { useEffect, useRef, useState } from "react";

export default function SerpViewPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SerpViewOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (results || error) {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [results, error]);

  const { provenance, setProvenance, markLive, markFallback } = useProvenance();

  const handleSubmit = async (values: { keyword: string; }) => {
    setIsLoading(true);
    setSubmitted(true);
    setResults(null);
    setError(null);
    setProvenance(null);
    try {
      // Transform form values to SerpViewInput
      const serpInput: SerpViewInput = {
        keyword: values.keyword,
        location: 'United States',
        device: 'desktop',
        searchEngine: 'google'
      };
  const result = await getSerpData(serpInput);
      setResults(result);
  // No caching layer yet; treat as live
  markLive();

      if (user) {
        const userActivitiesRef = collection(
          db,
          "users",
          user.uid,
          "activities"
        );
        await addDoc(userActivitiesRef, {
          type: "SERP View",
          tool: "SERP View",
          timestamp: serverTimestamp(),
          details: values,
          resultsSummary: `Viewed SERP for keyword: "${values.keyword}".`,
        });
      }
    } catch (e: unknown) {
      setError(safeErrorMessage(e) || "An unexpected error occurred.");
      if (!results) markFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const serpMetrics = useSerpKeywordMetrics();
  const isMobile = useIsMobile();
  return (
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="SERP View"
        description="Visualize live search results structure and ranking signals."
  badges={composeToolHeaderBadges("serp-view", provenance)}
        showBreadcrumb
      />
    <div
      className={cn(
        "space-y-6 mx-auto transition-all duration-500",
        submitted ? "max-w-7xl" : "max-w-xl"
      )}
    >
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {serpMetrics.kpis.map(k => (
          <MetricCard size={isMobile ? 'sm' : 'md'} key={k.key} label={k.label} value={Number(k.value).toFixed(1)} delta={k.delta} deltaLabel="" trend={<TrendSparkline data={k.trend} />} intent={k.intent || 'neutral'} />
        ))}
      </div>
      <LazyDataTable
        columns={[{ key:'keyword', header:'Keyword'}, { key:'topUrl', header:'Top URL', render: (r:any)=> (r.results?.[0]?.url||'') }, { key:'top3', header:'Top3', render:(r:any)=> (r.results?.some((x:any)=> x.position<=3)? 'Yes':'No') }]}
        rows={serpMetrics.rows.map((r:any)=> ({ ...r, top3: r.results?.some((x:any)=> x.position<=3) }))}
        loading={serpMetrics.loading}
        empty="No SERP snapshots"
      />
      <div
        className={cn(
          "grid gap-8 transition-all duration-500",
          submitted ? "lg:grid-cols-3" : "lg:grid-cols-1"
        )}
      >
        <motion.div layout className="lg:col-span-1">
          <SerpViewForm onSubmit={handleSubmit} isLoading={isLoading} />
        </motion.div>
        <div className="lg:col-span-2" ref={resultsRef}>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading">
                <LoadingScreen text="Fetching search results..." />
              </motion.div>
            )}
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive font-headline flex items-center gap-2">
                      <AlertTriangle /> Analysis Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{error}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {results && <SerpViewResults results={results} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </main>
  );
}
