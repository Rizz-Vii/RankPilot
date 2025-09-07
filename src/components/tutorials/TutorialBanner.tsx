"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, X, Play, ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";

interface TutorialBannerProps {
  feature?: string;
  title?: string;
  description?: string;
  tutorialIds?: string[];
  dismissible?: boolean;
  variant?: "default" | "compact" | "floating";
  className?: string;
}

export function TutorialBanner({
  feature,
  title,
  description,
  tutorialIds = [],
  dismissible = true,
  variant = "default",
  className = "",
}: TutorialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  useSubscription();

  // Auto-generate content based on feature if not provided
  const getFeatureContent = () => {
    const featureMap: Record<
      string,
      { title: string; description: string; tutorials: string[] }
    > = {
      neuroseo: {
        title: "New to NeuroSEO™?",
        description:
          "Learn how to leverage AI-powered SEO analysis for better results.",
        tutorials: ["ns-1"],
      },
      serp_analysis: {
        title: "Master SERP Analysis",
        description:
          "Understand your competition and find ranking opportunities.",
        tutorials: ["seo-2"],
      },
      competitor_analysis: {
        title: "Competitor Analysis Guide",
        description: "Learn to analyze competitors and identify market gaps.",
        tutorials: ["ca-1"],
      },
      link_view: {
        title: "Link Building Strategies",
        description:
          "Master link analysis and develop effective link building campaigns.",
        tutorials: ["la-1"],
      },
      api_access: {
        title: "API Integration Help",
        description:
          "Get started with RankPilot API and build custom integrations.",
        tutorials: ["api-1", "api-2"],
      },
      team_management: {
        title: "Team Setup Tutorial",
        description:
          "Learn to set up your team, assign roles, and manage permissions.",
        tutorials: ["tm-1"],
      },
      white_label: {
        title: "White-Label Setup",
        description:
          "Customize RankPilot with your branding for professional reports.",
        tutorials: ["ef-1"],
      },
    };

    if (feature && featureMap[feature]) {
      return featureMap[feature];
    }

    return {
      title: title || "Learn RankPilot",
      description:
        description || "Check out our tutorials to master all features.",
      tutorials: tutorialIds,
    };
  };

  const content = getFeatureContent();

  if (isDismissed) {
    return null;
  }

  if (variant === "floating") {
    return (
      <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
        <Card className="border-primary shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{content.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {content.description}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" className="text-xs h-7">
                    <Link href="/tutorials">
                      Learn
                      <Play className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                  {dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setIsDismissed(true)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`bg-primary/5 border border-primary/20 rounded-lg p-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{content.title}</p>
              <p className="text-xs text-muted-foreground">
                {content.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs h-7">
              <Link href="/tutorials">
                Tutorials
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Card className={`border-l-4 border-l-primary bg-primary/5 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{content.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {content.description}
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/tutorials">
                    <Play className="h-4 w-4 mr-1" />
                    Start Learning
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/tutorials">
                    Browse All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
