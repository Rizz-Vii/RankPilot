"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/useSubscription";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  HelpCircle,
  Lock,
  Play,
} from "lucide-react";
import Link from "next/link";

interface TutorialAccessProps {
  feature?: string;
  tutorialId?: string;
  title?: string;
  description?: string;
  variant?: "button" | "card" | "inline";
  className?: string;
}

export function TutorialAccess({
  feature,
  tutorialId,
  title = "Learn More",
  description = "Check out our tutorials to learn how to use this feature.",
  variant = "button",
  className = "",
}: TutorialAccessProps) {
  // Rename unused subscription to _subscription to satisfy no-unused-vars while preserving future intent
  const { subscription: _subscription, canUseFeature } = useSubscription();

  // Get relevant tutorials based on feature
  const getRelevantTutorials = () => {
    const tutorialMap: Record<
      string,
      { id: string; title: string; description: string; tier: string }[]
    > = {
      neuroseo: [
        {
          id: "ns-1",
          title: "NeuroSEO™ AI Features",
          description: "Harness AI for advanced SEO analysis",
          tier: "agency",
        },
      ],
      serp_analysis: [
        {
          id: "seo-2",
          title: "SERP Analysis Masterclass",
          description: "Master SERP analysis and competition research",
          tier: "agency",
        },
      ],
      competitor_analysis: [
        {
          id: "ca-1",
          title: "Competitor Analysis Framework",
          description: "Analyze competitors and find opportunities",
          tier: "agency",
        },
      ],
  link_view: [
        {
          id: "la-1",
          title: "Link Analysis & Building",
          description: "Master link analysis and building strategies",
          tier: "agency",
        },
      ],
      content_brief: [
        {
          id: "co-2",
          title: "Content Brief Creation",
          description: "Create comprehensive content briefs",
          tier: "agency",
        },
      ],
      api_access: [
        {
          id: "api-1",
          title: "API Authentication & Setup",
          description: "Get started with RankPilot API",
          tier: "enterprise",
        },
        {
          id: "api-2",
          title: "Building Custom Integrations",
          description: "Create custom integrations and webhooks",
          tier: "enterprise",
        },
      ],
      team_management: [
        {
          id: "tm-1",
          title: "Team Setup & Management",
          description: "Set up teams, roles, and permissions",
          tier: "enterprise",
        },
      ],
      white_label: [
        {
          id: "ef-1",
          title: "White-Label Customization",
          description: "Customize branding for client reports",
          tier: "enterprise",
        },
      ],
      custom_integrations: [
        {
          id: "api-2",
          title: "Building Custom Integrations",
          description: "Create webhooks and API integrations",
          tier: "enterprise",
        },
      ],
    };

    if (feature && tutorialMap[feature]) {
      return tutorialMap[feature];
    }

    // Default tutorials for general features
    return [
      {
        id: "gs-1",
        title: "Getting Started with RankPilot",
        description: "Learn the basics and navigate the dashboard",
        tier: "free",
      },
      {
        id: "seo-1",
        title: "Complete SEO Audit Tutorial",
        description: "Perform comprehensive SEO audits",
        tier: "free",
      },
    ];
  };

  const tutorials = getRelevantTutorials();
  const hasFeatureAccess = !feature || canUseFeature(feature);

  if (variant === "button") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <HelpCircle className="h-4 w-4 mr-1" />
            {title}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Related Tutorials
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tutorials.map((tutorial) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} />
            ))}
            <div className="flex gap-3 pt-4">
              <Button asChild className="flex-1">
                <Link href="/tutorials">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Browse All Tutorials
                </Link>
              </Button>
              {!hasFeatureAccess && (
                <Button asChild variant="outline">
                  <Link href="/pricing">
                    <Lock className="h-4 w-4 mr-1" />
                    Upgrade Access
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "card") {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tutorials.slice(0, 2).map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} compact />
          ))}
          <Button asChild className="w-full">
            <Link href="/tutorials">
              View All Tutorials
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-primary hover:text-primary/80"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How to use this feature</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tutorials.slice(0, 1).map((tutorial) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} />
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link href="/tutorials">
                More Tutorials
                <ExternalLink className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tutorial Card Component for the dialog
interface TutorialCardProps {
  tutorial: {
    id: string;
    title: string;
    description: string;
    tier: string;
  };
  compact?: boolean;
}

function TutorialCard({ tutorial, compact = false }: TutorialCardProps) {
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "free";

  const hasAccess =
    tutorial.tier === "free" ||
    (tutorial.tier === "agency" &&
      (tier === "agency" || tier === "enterprise")) ||
    (tutorial.tier === "enterprise" && tier === "enterprise");

  const getTierColor = (requiredTier: string) => {
    // Map tiers to semantic token surfaces (primary, accent, warning) avoiding raw palette classes
    switch (requiredTier) {
      case "free":
        return "bg-primary/10 text-primary";
      case "agency":
        return "bg-accent/10 text-accent";
      case "enterprise":
        return "bg-warning/15 text-warning";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg ${!hasAccess ? "opacity-60" : ""}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-medium ${compact ? "text-sm" : ""}`}>
            {tutorial.title}
          </h4>
          <Badge className={getTierColor(tutorial.tier)} variant="outline">
            {tutorial.tier}
          </Badge>
        </div>
        <p
          className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
        >
          {tutorial.description}
        </p>
      </div>
      <Button
        asChild
        size="sm"
        variant={hasAccess ? "default" : "outline"}
        disabled={!hasAccess}
        className="ml-3"
      >
        {hasAccess ? (
          <Link href={`/tutorials?tutorial=${tutorial.id}`}>
            <Play className="h-3 w-3 mr-1" />
            Start
          </Link>
        ) : (
          <Link href="/pricing">
            <Lock className="h-3 w-3 mr-1" />
            Upgrade
          </Link>
        )}
      </Button>
    </div>
  );
}
