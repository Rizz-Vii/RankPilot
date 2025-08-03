// src/app/(app)/insights/page.tsx
"use client";

import { generateInsights } from "@/lib/utils/content-functions";
import type { GenerateInsightsOutput } from "@/types";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

export default function InsightsPage() {
  const { user, activities, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState<GenerateInsightsOutput["insights"]>(
    []
  );
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (authLoading) {
        return;
      }
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (activities.length === 0) {
          setInsights([]);
          return;
        }

        const simplifiedActivities = activities.map((activity) => ({
          type: activity.type,
          tool: activity.tool,
          details: activity.details,
          resultsSummary: activity.resultsSummary,
        }));

        const result = await generateInsights({
          keywords: ['seo', 'content', 'optimization'],
          urls: ['https://example.com'],
        });
        setInsights(result.insights);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [user, activities, authLoading]);

  const priorityColors: { [_key: string]: string; } = {
    High: "bg-destructive",
    Medium: "bg-warning",
    Low: "bg-success",
  };

  if (isLoading) {
    return <LoadingScreen text="Generating personalized insights..." />;
  }

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <main className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">
          Actionable Insights
        </h1>
        <p className="text-muted-foreground font-body">
          AI-generated recommendations based on your recent activity.
        </p>
      </header>

      {_error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive font-headline flex items-center gap-2">
              <AlertTriangle /> Error Generating Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-body text-destructive-foreground">{_error}</p>
          </CardContent>
        </Card>
      )}

      {!_error && insights.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-headline mb-2">No Insights Yet</h3>
            <p className="font-body text-muted-foreground">
              Use the tools in the sidebar to perform some SEO tasks. We'll
              analyze your activity and provide personalized recommendations
              here.
            </p>
          </CardContent>
        </Card>
      )}

      {!_error && insights.length > 0 && (
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {insights.map((insight) => (
            <motion.div key={insight.id} variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline">
                      {insight.title}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className={`h-3 w-3 rounded-full ${priorityColors[insight.priority]}`}
                          ></div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{insight.priority} Priority</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription>
                    <Badge variant="outline" className="mr-2">
                      {insight.category}
                    </Badge>
                    Impact:{" "}
                    <Badge variant="secondary">{insight.estimatedImpact}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-body text-muted-foreground">
                    {insight.description}
                  </p>
                </CardContent>
                {insight.actionLink && insight.actionText && (
                  <CardFooter>
                    <Button asChild>
                      <Link href={insight.actionLink}>
                        {insight.actionText}{" "}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  );
}
