// src/app/(app)/content-brief/page.tsx
"use client";

import ContentBriefForm from "@/components/content-brief-form";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { ToolPageHeader } from "@/components/tool-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { useProvenance } from "@/hooks/useProvenance";
import { db } from "@/lib/firebase";
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { cn } from "@/lib/utils";
import { generateContentBrief } from "@/lib/utils/content-functions";
import type {
  ContentBriefInput,
  ContentBriefOutput
} from "@/types";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart2,
  BrainCircuit,
  FileText,
  Users
} from "lucide-react";
import type { ElementType, FC, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  PolarGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer
} from "recharts";

const ResultCard: FC<{
  title: string;
  icon: ElementType;
  children: ReactNode;
  description?: string;
}> = ({ title, icon: Icon, children, description }) => (
  <Card className="flex flex-col h-full">
    <CardHeader className="pb-4">
      <CardTitle className="font-headline text-lg flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-grow">{children}</CardContent>
  </Card>
);

const SeoScoreGauge: FC<{ score: number }> = ({ score }) => {
  const data = [
    { name: "SEO Score", value: score, fill: "hsl(var(--primary))" },
  ];
  return (
    <ResponsiveContainer width="100%" height={150}>
      <RadialBarChart
        data={data}
        startAngle={180}
        endAngle={0}
        innerRadius="70%"
        outerRadius="110%"
        barSize={20}
      >
        <PolarGrid gridType="circle" radialLines={false} stroke="none" />
        <RadialBar background dataKey="value" cornerRadius={10} />
        <text
          x="50%"
          y="75%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-4xl font-headline fill-foreground"
        >
          {score}
        </text>
        <text
          x="50%"
          y="95%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-body fill-muted-foreground"
        >
          / 100
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
};

const BriefResults: FC<{ briefResult: ContentBriefOutput }> = ({ briefResult }) => (
  <motion.div
    className="space-y-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <ResultCard
      title="Executive Summary"
      icon={BrainCircuit}
      description="Core strategy and targets for this content piece."
    >
      <div className="space-y-3">
        <p className="text-muted-foreground font-body">
          {briefResult.briefSummary}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center pt-2">
          <div className="text-center">
            <p className="font-bold text-lg text-primary font-headline truncate">
              {briefResult.primaryKeyword}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Primary Keyword
            </p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-primary font-headline">
              {briefResult.searchIntent}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Search Intent
            </p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <SeoScoreGauge score={briefResult.seoScore} />
            <p className="text-xs text-muted-foreground font-body -mt-4">
              SEO Potential
            </p>
          </div>
        </div>
      </div>
    </ResultCard>

    <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <ResultCard title="Title and Meta" icon={FileText}>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold font-body">Suggested Title</h4>
              <p className="text-muted-foreground font-body">
                {briefResult.recommendedMeta.title}
              </p>
            </div>
            <div>
              <h4 className="font-semibold font-body">Meta Description</h4>
              <p className="text-muted-foreground font-body">
                {briefResult.recommendedMeta.description}
              </p>
            </div>
          </div>
        </ResultCard>
        <ResultCard
          title="Competitor Insights"
          icon={Users}
          description="What top-ranking pages are doing right."
        >
          <ul className="space-y-2 list-disc pl-5 font-body">
            {briefResult.competitorInsights.map((insight, i) => (
              <li
          key={`${i}-${typeof insight === 'string' ? insight.slice(0, 24) : 'insight'}`}
                className="p-1 rounded transition-colors hover:bg-muted/50"
              >
                {insight}
              </li>
            ))}
          </ul>
        </ResultCard>
      </div>
      <ResultCard
        title="Content Outline"
        icon={BarChart2}
        description="A logical structure for the article."
      >
        <ul className="space-y-2 list-disc pl-5">
          {briefResult.llmGeneratedOutline.map((heading, i) => (
            <li
          key={`${i}-${heading.title}-${heading.level}`}
              className="font-body p-1 -ml-1 rounded transition-colors hover:bg-muted/50"
            >
              <div>
                <strong>H{heading.level}:</strong> {heading.title}
                <p className="text-sm text-muted-foreground">{heading.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </ResultCard>
    </div>
  </motion.div>
);

export default function ContentBriefPage(): JSX.Element {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<ContentBriefOutput | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (briefResult || error) {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [briefResult, error]);

  const { provenance, setProvenance, markLive, markFallback } = useProvenance();

  const handleSubmit = async (values: { keyword: string; }): Promise<void> => {
    setIsLoading(true);
    setSubmitted(true);
    setBriefResult(null);
    setError(null);
    setProvenance(null);
    try {
      // Transform form values to ContentBriefInput
      const contentBriefInput: ContentBriefInput = {
        topic: values.keyword,
        keyword: values.keyword,
        targetKeywords: [values.keyword],
        targetAudience: 'general audience',
        contentType: 'blog post'
      };
  const result = await generateContentBrief(contentBriefInput);
  setBriefResult(result);
  markLive();

      if (user) {
        const userActivitiesRef = collection(
          db,
          "users",
          user.uid,
          "activities"
        );
        await addDoc(userActivitiesRef, {
          type: "Content Brief Generation",
          tool: "Content Brief",
          timestamp: serverTimestamp(),
          details: {
            keyword: values.keyword,
            title: result.title,
          },
          resultsSummary: `Generated content brief for keyword: "${values.keyword}".`,
        });
      }
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string')
        ? (e as { message: string }).message
        : 'An unexpected error occurred.';
      setError(msg);
      if (!briefResult) markFallback();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureGate feature="content_briefs" requiredTier="agency" showUpgrade>
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="Content Brief Generator"
        description="Generate data-driven content briefs with semantic insights."
  badges={composeToolHeaderBadges("content-brief", provenance)}
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
          <ContentBriefForm onSubmit={handleSubmit} isLoading={isLoading} />
        </motion.div>

        <div className="lg:col-span-2" ref={resultsRef}>
          <AnimatePresence>
            {isLoading && (
              <LoadingScreen text="Generating your content brief..." />
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive font-headline flex items-center gap-2">
                      <AlertTriangle /> Generation Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-body text-destructive-foreground">
                      {error}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {briefResult && <BriefResults briefResult={briefResult} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </main>
  </FeatureGate>
  );
}
