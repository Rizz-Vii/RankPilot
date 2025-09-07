"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/ui/loading-screen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/useSubscription";
import { isDemoContentEnabled } from "@/lib/flags/demo";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Crown,
  FileText,
  Filter,
  Lightbulb,
  Lock,
  Play,
  Search,
  Star,
  Users,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string; // e.g., "10 min"
  type: "video" | "article" | "interactive";
  requiredTier: "free" | "agency" | "enterprise";
  feature?: string; // Feature flag for specific functionality
  tags: string[];
  thumbnail?: string;
  videoUrl?: string;
  articleContent?: string;
  steps?: TutorialStep[];
  popularity: number; // 1-5 stars
  lastUpdated: Date;
  prerequisites?: string[];
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  image?: string;
  code?: string;
}

type TutorialCategory =
  | "getting-started"
  | "seo-analysis"
  | "keyword-research"
  | "content-optimization"
  | "competitor-analysis"
  | "reporting"
  | "api-integration"
  | "team-management"
  | "enterprise-features"
  | "advanced-features";

const TUTORIAL_CATEGORIES = [
  { value: "getting-started", label: "Getting Started", icon: Lightbulb },
  { value: "seo-analysis", label: "SEO Analysis", icon: Search },
  { value: "keyword-research", label: "Keyword Research", icon: Star },
  {
    value: "content-optimization",
    label: "Content Optimization",
    icon: FileText,
  },
  { value: "competitor-analysis", label: "Competitor Analysis", icon: Users },
  { value: "reporting", label: "Reporting", icon: BookOpen },
  { value: "api-integration", label: "API Integration", icon: Zap },
  { value: "team-management", label: "Team Management", icon: Users },
  { value: "enterprise-features", label: "Enterprise Features", icon: Crown },
  { value: "advanced-features", label: "Advanced Features", icon: Star },
];

export default function TutorialsPage() {
  // Auth context currently unused in this static/demonstration page – omit to satisfy no-unused-vars
  // const { user, loading: authLoading } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  const tier = subscription?.tier || "free";
  const demoEnabled = isDemoContentEnabled();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [filteredTutorials, setFilteredTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(
    null
  );

  // Load tutorials (demo or placeholder)
  useEffect(() => {
    async function fetchTutorials() {
      try {
        setLoading(true);
        if (demoEnabled) {
          const demo: Tutorial[] = [
            {
              id: "demo-quickstart",
              title: "Getting Started with RankPilot",
              description: "A quick overview to get productive fast.",
              category: "getting-started",
              difficulty: "beginner",
              duration: "8 min",
              type: "video",
              requiredTier: "free",
              tags: ["setup", "overview"],
              popularity: 4,
              lastUpdated: new Date(),
            },
            {
              id: "demo-keywords",
              title: "Keyword Research Workflow",
              description: "Use the built-in tools to discover opportunities.",
              category: "keyword-research",
              difficulty: "intermediate",
              duration: "12 min",
              type: "article",
              requiredTier: "agency",
              tags: ["keywords", "strategy"],
              popularity: 5,
              lastUpdated: new Date(),
            },
          ];
          setTutorials(demo);
          setFilteredTutorials(demo);
        } else {
          setTutorials([]);
          setFilteredTutorials([]);
        }
      } finally {
        setLoading(false);
      }
    }
    void fetchTutorials();
    // demoEnabled is stable boolean; fetchTutorials has no external deps beyond it
  }, [demoEnabled]);

  // Apply filters to tutorials list
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    const next = tutorials.filter((t) => {
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchCat =
        selectedCategory === "all" || t.category === selectedCategory;
      const matchDiff =
        selectedDifficulty === "all" || t.difficulty === selectedDifficulty;
      const matchType = selectedType === "all" || t.type === selectedType;
      return matchQuery && matchCat && matchDiff && matchType;
    });
    setFilteredTutorials(next);
  }, [
    tutorials,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    selectedType,
  ]);

  const checkTutorialAccess = (tutorial: Tutorial): boolean => {
    // Check tier requirement
    if (tutorial.requiredTier === "enterprise" && tier !== "enterprise") {
      return false;
    }
    if (tutorial.requiredTier === "agency" && tier === "free") {
      return false;
    }

    // Check feature requirement
    if (tutorial.feature && !canUseFeature(tutorial.feature)) {
      return false;
    }

    return true;
  };

  const getTutorialIcon = (type: Tutorial["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "interactive":
        return <Play className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: Tutorial["difficulty"]) => {
    switch (difficulty) {
      case "beginner":
        return "bg-success/10 text-success-foreground";
      case "intermediate":
        return "bg-warning/10 text-warning-foreground";
      case "advanced":
        return "bg-destructive/10 text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTierColor = (requiredTier: Tutorial["requiredTier"]) => {
    switch (requiredTier) {
      case "free":
        return "bg-muted text-muted-foreground";
      case "agency":
        return "bg-accent text-accent-foreground";
      case "enterprise":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const groupedTutorials = TUTORIAL_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.value] = filteredTutorials.filter(
        (t) => t.category === category.value
      );
      return acc;
    },
    {} as Record<string, Tutorial[]>
  );

  if (loading) {
    return <LoadingScreen fullScreen text="Loading tutorials..." />;
  }

  return (
    <main className="max-w-7xl mx-auto space-y-8" data-testid="tutorials-page">
      {/* Demo mode banner */}
      <Alert data-testid="tutorials-banner">
        <AlertTitle>Tutorials</AlertTitle>
        <AlertDescription>
          {demoEnabled
            ? "Showing curated demo tutorials. Enable full content once the tutorials API is connected."
            : "Tutorials are not available in this environment. Enable demo content (NEXT_PUBLIC_DEMO_CONTENT=true) to preview mock tutorials."}
        </AlertDescription>
      </Alert>
      {/* Header */}
      <header className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1
            className="text-3xl font-bold font-headline"
            data-testid="tutorials-header"
          >
            Tutorials & Guides
          </h1>
          <p className="text-muted-foreground font-body">
            Master RankPilot with step-by-step tutorials and comprehensive
            guides.
          </p>
        </div>
      </header>

      {/* Subscription Tier Info */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">
                  Current Plan:{" "}
                  {tier?.charAt(0).toUpperCase() + tier?.slice(1) || "Free"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Access to{" "}
                  {tier === "enterprise"
                    ? "all"
                    : tier === "agency"
                      ? "agency and free"
                      : "free"}{" "}
                  tutorials
                </p>
              </div>
            </div>
            {tier !== "enterprise" && (
              <Button asChild variant="outline">
                <Link href="/pricing">
                  Upgrade for More Tutorials
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Find Tutorials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tutorials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TUTORIAL_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="interactive">Interactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tutorials by Category */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
          <TabsTrigger value="all">All</TabsTrigger>
          {TUTORIAL_CATEGORIES.slice(0, 9).map((category) => (
            <TabsTrigger
              key={category.value}
              value={category.value}
              className="text-xs"
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filteredTutorials.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTutorials.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  hasAccess={checkTutorialAccess(tutorial)}
                  onSelect={setSelectedTutorial}
                  getDifficultyColor={getDifficultyColor}
                  getTierColor={getTierColor}
                  getTutorialIcon={getTutorialIcon}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {demoEnabled
                    ? "No tutorials match your filters"
                    : "Tutorials unavailable"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {demoEnabled
                    ? "Try adjusting your filters or search terms."
                    : "Set NEXT_PUBLIC_DEMO_CONTENT=true to preview mock tutorials, or check back once live tutorials are enabled."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {TUTORIAL_CATEGORIES.map((category) => (
          <TabsContent
            key={category.value}
            value={category.value}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-6">
              {React.createElement(category.icon, {
                className: "h-6 w-6 text-primary",
              })}
              <h2 className="text-2xl font-bold">{category.label}</h2>
            </div>

            {groupedTutorials[category.value]?.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedTutorials[category.value].map((tutorial) => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    hasAccess={checkTutorialAccess(tutorial)}
                    onSelect={setSelectedTutorial}
                    getDifficultyColor={getDifficultyColor}
                    getTierColor={getTierColor}
                    getTutorialIcon={getTutorialIcon}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  {React.createElement(category.icon, {
                    className: "h-12 w-12 text-muted-foreground mb-4",
                  })}
                  <h3 className="text-lg font-semibold mb-2">
                    No {category.label.toLowerCase()} tutorials
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Check back later for new content in this category.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Tutorial Detail Modal */}
      <Dialog
        open={!!selectedTutorial}
        onOpenChange={(open) => !open && setSelectedTutorial(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTutorial && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTutorialIcon(selectedTutorial.type)}
                  {selectedTutorial.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedTutorial.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={getDifficultyColor(selectedTutorial.difficulty)}
                  >
                    {selectedTutorial.difficulty}
                  </Badge>
                  <Badge
                    className={getTierColor(selectedTutorial.requiredTier)}
                  >
                    {selectedTutorial.requiredTier}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedTutorial.duration}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < selectedTutorial.popularity ? "text-warning-foreground fill-current" : "text-muted-foreground/40"}`}
                      />
                    ))}
                  </div>
                </div>

                {selectedTutorial.prerequisites && (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">Prerequisites:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {selectedTutorial.prerequisites.map((prereq, index) => (
                        <li key={index}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTutorial.steps && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Tutorial Steps:</h4>
                    {selectedTutorial.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium mb-1">{step.title}</h5>
                          <p className="text-sm text-muted-foreground">
                            {step.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    disabled={!checkTutorialAccess(selectedTutorial)}
                  >
                    {selectedTutorial.type === "video"
                      ? "Watch Video"
                      : selectedTutorial.type === "interactive"
                        ? "Start Tutorial"
                        : "Read Article"}
                  </Button>
                  {!checkTutorialAccess(selectedTutorial) && (
                    <Button asChild variant="outline">
                      <Link href="/pricing">
                        <Lock className="h-4 w-4 mr-1" />
                        Upgrade
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Tutorial Card Component
interface TutorialCardProps {
  tutorial: Tutorial;
  hasAccess: boolean;
  onSelect: (tutorial: Tutorial) => void;
  getDifficultyColor: (difficulty: Tutorial["difficulty"]) => string;
  getTierColor: (tier: Tutorial["requiredTier"]) => string;
  getTutorialIcon: (type: Tutorial["type"]) => React.ReactNode;
}

function TutorialCard({
  tutorial,
  hasAccess,
  onSelect,
  getDifficultyColor,
  getTierColor,
  getTutorialIcon,
}: TutorialCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${!hasAccess ? "opacity-75" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTutorialIcon(tutorial.type)}
            <Badge className={getDifficultyColor(tutorial.difficulty)}>
              {tutorial.difficulty}
            </Badge>
          </div>
          {!hasAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        <CardTitle className="text-lg line-clamp-2">{tutorial.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {tutorial.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {tutorial.duration}
            </span>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < tutorial.popularity ? "text-warning-foreground fill-current" : "text-muted-foreground/40"}`}
                />
              ))}
            </div>
          </div>
          <Badge
            className={getTierColor(tutorial.requiredTier)}
            variant="outline"
          >
            {tutorial.requiredTier}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {tutorial.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tutorial.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{tutorial.tags.length - 3}
            </Badge>
          )}
        </div>

        <Button
          onClick={() => onSelect(tutorial)}
          className="w-full"
          variant={hasAccess ? "default" : "outline"}
          disabled={!hasAccess}
        >
          {hasAccess ? (
            tutorial.type === "video" ? (
              "Watch Video"
            ) : tutorial.type === "interactive" ? (
              "Start Tutorial"
            ) : (
              "Read Article"
            )
          ) : (
            <>
              <Lock className="h-4 w-4 mr-1" />
              Upgrade Required
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
