// src/app/(app)/content-brief/page.tsx
"use client";

import ContentBriefForm from "@/components/content-brief-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
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
import { useEffect, useRef, useState } from "react";
import {
  PolarGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer
} from "recharts";

const ResultCard = ({
  title,
  icon: Icon,
  children,
  description,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  description?: string;
}) => (
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

const SeoScoreGauge = ({ score }: { score: number; }) => {
  const _data = [
    { name: "SEO Score", _value: score, fill: "hsl(var(--primary))" },
  ];
  return (
    <ResponsiveContainer width="100%" height={150}>
      <RadialBarChart
        data={_data}
        startAngle={180}
        endAngle={0}
        innerRadius="70%"
        outerRadius="110%"
        barSize={20}
      >
        <PolarGrid gridType="circle" radialLines={false} stroke="none" />
        <RadialBar background dataKey="_value" cornerRadius={10} />
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

const BriefResults = ({ briefResult }: { briefResult: ContentBriefOutput; }) => (
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
                key={i}
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
              key={i}
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

export default function ContentBriefPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [briefResult, setBriefResult] = useState<ContentBriefOutput | null>(
    null
  );
  const [_error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (briefResult || _error) {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [briefResult, _error]);

  const handleSubmit = async (values: { keyword: string; }) => {
    setIsLoading(true);
    setSubmitted(true);
    setBriefResult(null);
    setError(null);
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
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

            {_error && (
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
                      {_error}
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
  );
}
