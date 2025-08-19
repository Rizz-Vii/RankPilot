// src/app/(app)/link-view/page.tsx
"use client";

import LinkAnalysisForm from "@/components/link-analysis-form";
import { ToolPageHeader } from "@/components/tool-page-header";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useProvenance } from "@/hooks/useProvenance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ChartConfig} from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { cn, safeErrorMessage } from "@/lib/utils";
import { analyzeLinks } from "@/lib/utils/content-functions";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import type {
  LinkAnalysisInput,
  LinkAnalysisOutput
} from "@/types";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts";

const DomainAuthorityChart = ({
  backlinks,
}: {
  backlinks: LinkAnalysisOutput["backlinks"];
}) => {
  const daRanges = [
    { range: "0-10", count: 0 },
    { range: "11-20", count: 0 },
    { range: "21-30", count: 0 },
    { range: "31-40", count: 0 },
    { range: "41-50", count: 0 },
    { range: "51-60", count: 0 },
    { range: "61-70", count: 0 },
    { range: "71-80", count: 0 },
    { range: "81-90", count: 0 },
    { range: "91-100", count: 0 },
  ];

  backlinks.forEach((link) => {
    const index = Math.floor(link.domainAuthority / 10.01);
    if (daRanges[index]) {
      daRanges[index].count++;
    }
  });

  const chartConfig: ChartConfig = {
    count: { label: "Backlinks", color: "hsl(var(--chart-1))" },
    range: { label: "DA Range" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <BarChart3 />
          Domain Authority Distribution
        </CardTitle>
        <CardDescription>
          Number of backlinks from domains in each DA range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={daRanges} margin={{ left: -10, right: 10 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="range" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent {...props} indicator="line" />
              )}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const LinkAnalysisResults = ({ results }: { results: LinkAnalysisOutput; }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    <DomainAuthorityChart backlinks={results.backlinks} />
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Backlink Profile</CardTitle>
        <CardDescription>
          Found {results.summary.totalBacklinks} backlinks from{" "}
          {results.summary.referringDomains} unique domains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referring Domain</TableHead>
              <TableHead>Anchor Text</TableHead>
              <TableHead className="text-right">Domain Authority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.backlinks.map((link) => (
              <TableRow key={`${link.referringDomain}-${link.backlinkUrl}`}>
                <TableCell
                  className="font-medium truncate"
                  style={{ maxWidth: "200px" }}
                >
                  <a
                    href={link.backlinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {link.referringDomain}
                  </a>
                </TableCell>
                <TableCell className="italic">"{link.anchorText}"</TableCell>
                <TableCell className="text-right">
                  {link.domainAuthority}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </motion.div>
);

export default function LinkViewPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LinkAnalysisOutput | null>(null);
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

  const handleSubmit = async (values: { url: string; }) => {
    setIsLoading(true);
    setSubmitted(true);
    setResults(null);
    setError(null);
    setProvenance(null);
    try {
      // Transform form values to LinkAnalysisInput
      const analysisInput: LinkAnalysisInput = {
        url: values.url,
        analysisType: 'comprehensive',
        limit: 100
      };
  const result = await analyzeLinks(analysisInput);
      setResults(result);
  markLive();

      if (user) {
        const userActivitiesRef = collection(
          db,
          "users",
          user.uid,
          "activities"
        );
        await addDoc(userActivitiesRef, {
          type: "Link Analysis",
          tool: "Link View",
          timestamp: serverTimestamp(),
          details: values,
          resultsSummary: `Analyzed backlinks for ${values.url}. Found ${result.summary.totalBacklinks} links.`,
        });
      }
    } catch (e: unknown) {
      setError(safeErrorMessage(e) || "An unexpected error occurred during link analysis.");
      if (!results) markFallback();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureGate feature="link_view" requiredTier="agency" showUpgrade>
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="Link View Analyzer"
        description="Evaluate backlink quality and domain authority distribution."
  badges={composeToolHeaderBadges("link-view", provenance)}
        showBreadcrumb
      />
    <div
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
          <LinkAnalysisForm
            onFormSubmitAction={handleSubmit}
            isLoading={isLoading}
          />
        </motion.div>

        <div className="lg:col-span-2" ref={resultsRef}>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading">
                <LoadingScreen text="Discovering backlinks..." />
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
            {results && (
              <motion.div key="results">
                <LinkAnalysisResults results={results} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </main>
  </FeatureGate>
  );
}
