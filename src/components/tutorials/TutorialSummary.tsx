"use client";

import { useSubscription } from "@/hooks/useSubscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Play,
  Clock,
  Crown,
  Zap,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface TutorialSummaryProps {
  className?: string;
}

export function TutorialSummary({ className = "" }: TutorialSummaryProps) {
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "free";

  // Get featured tutorials based on user&apos;s tier
  const getFeaturedTutorials = () => {
    const baseTutorials = [
      {
        id: "gs-1",
        title: "Getting Started with RankPilot",
        duration: "5 min",
        difficulty: "beginner" as const,
        type: "video" as const,
        completed: false,
      },
      {
        id: "seo-1",
        title: "Complete SEO Audit Tutorial",
        duration: "15 min",
        difficulty: "intermediate" as const,
        type: "video" as const,
        completed: false,
      },
      {
        id: "kw-1",
        title: "Keyword Research Fundamentals",
        duration: "12 min",
        difficulty: "beginner" as const,
        type: "interactive" as const,
        completed: false,
      },
    ];

    const professionalTutorials = [
      {
        id: "ns-1",
        title: "NeuroSEO™ AI Features",
        duration: "25 min",
        difficulty: "intermediate" as const,
        type: "video" as const,
        completed: false,
      },
      {
        id: "ca-1",
        title: "Competitor Analysis Framework",
        duration: "22 min",
        difficulty: "intermediate" as const,
        type: "video" as const,
        completed: false,
      },
    ];

    const enterpriseTutorials = [
      {
        id: "api-1",
        title: "API Authentication & Setup",
        duration: "15 min",
        difficulty: "advanced" as const,
        type: "article" as const,
        completed: false,
      },
      {
        id: "tm-1",
        title: "Team Setup & Management",
        duration: "12 min",
        difficulty: "beginner" as const,
        type: "video" as const,
        completed: false,
      },
      {
        id: "ef-1",
        title: "White-Label Customization",
        duration: "20 min",
        difficulty: "intermediate" as const,
        type: "interactive" as const,
        completed: false,
      },
    ];

    if (tier === "enterprise") {
      return [
        ...baseTutorials,
        ...professionalTutorials,
        ...enterpriseTutorials,
      ].slice(0, 4);
    } else if (tier === "agency") {
      return [...baseTutorials, ...professionalTutorials].slice(0, 4);
    }

    return baseTutorials.slice(0, 3);
  };

  const getTutorialStats = () => {
    const totalByTier: Record<string, number> = {
      free: 8,
      professional: 15,
      enterprise: 23,
    };

    const accessibleCount = totalByTier[tier] || 8;
    const completedCount = 2; // Mock completed count

    return { total: accessibleCount, completed: completedCount };
  };

  const getDifficultyColor = (
    difficulty: "beginner" | "intermediate" | "advanced"
  ) => {
    switch (difficulty) {
      case "beginner":
        return "bg-success/15 text-success";
      case "intermediate":
        return "bg-warning/15 text-warning";
      case "advanced":
        return "bg-destructive/15 text-destructive";
      default:
        return "";
    }
  };

  const getTutorialIcon = (type: "video" | "article" | "interactive") => {
    switch (type) {
      case "video":
        return <Play className="h-3 w-3" />;
      case "article":
        return <BookOpen className="h-3 w-3" />;
      case "interactive":
        return <Zap className="h-3 w-3" />;
    }
  };

  const featuredTutorials = getFeaturedTutorials();
  const stats = getTutorialStats();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Center
            </CardTitle>
            <CardDescription>
              Master RankPilot with guided tutorials
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {stats.completed}/{stats.total}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Learning Progress</span>
            <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Tier Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            <Crown className="h-3 w-3" />
            {tier?.charAt(0).toUpperCase() + tier?.slice(1)} Plan
          </Badge>
          <span className="text-xs text-muted-foreground">
            {stats.total} tutorials available
          </span>
        </div>

        {/* Featured Tutorials */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommended for You</h4>
          {featuredTutorials.map((tutorial) => (
            <div
              key={tutorial.id}
              className="flex items-center justify-between p-2 rounded-lg border"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {tutorial.completed ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    getTutorialIcon(tutorial.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {tutorial.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getDifficultyColor(tutorial.difficulty)}>
                      {tutorial.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.duration}
                    </span>
                  </div>
                </div>
              </div>
              <Button asChild size="sm" variant="ghost" className="h-6 px-2">
                <Link href={`/tutorials?tutorial=${tutorial.id}`}>
                  <Play className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1" size="sm">
            <Link href="/tutorials">
              <BookOpen className="h-3 w-3 mr-1" />
              Browse All
            </Link>
          </Button>
          {tier !== "enterprise" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/pricing">
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
