"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Search,
  FileText,
  TrendingUp,
  Target,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  title?: string;
  url?: string;
  keywords?: string[];
  score?: number;
  timestamp: unknown; // Firestore Timestamp
  metadata?: unknown;
}

interface SEOActivitiesTimelineProps {
  activities: Activity[];
}

export default function SEOActivitiesTimeline({
  activities,
}: SEOActivitiesTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "audit":
        return <FileText className="h-4 w-4" />;
      case "keyword-research":
        return <Search className="h-4 w-4" />;
      case "serp-analysis":
        return <TrendingUp className="h-4 w-4" />;
      case "competitor-analysis":
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityTitle = (activity: Activity) => {
    if (activity.title) return activity.title;

    switch (activity.type) {
      case "audit":
        return `SEO Audit${activity.url ? ` for ${new URL(activity.url).hostname}` : ""}`;
      case "keyword-research":
        return `Keyword Research${activity.keywords?.length ? ` (${activity.keywords.length} keywords)` : ""}`;
      case "serp-analysis":
        return `SERP Analysis${activity.keywords?.length ? ` for "${activity.keywords[0]}"` : ""}`;
      case "competitor-analysis":
        return `Competitor Analysis${activity.url ? ` of ${new URL(activity.url).hostname}` : ""}`;
      default:
        return "SEO Activity";
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case "audit":
        return "bg-blue-100 text-blue-800";
      case "keyword-research":
        return "bg-green-100 text-green-800";
      case "serp-analysis":
        return "bg-purple-100 text-purple-800";
      case "competitor-analysis":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!activities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SEO Activity Timeline
          </CardTitle>
          <CardDescription>
            Track your SEO activities and progress over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Activities Yet</h3>
            <p className="text-muted-foreground">
              Start using RankPilot's SEO tools to see your activity timeline
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          SEO Activity Timeline
        </CardTitle>
        <CardDescription>
          Your recent SEO activities and achievements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 20).map((activity, _index) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 pb-4 border-b last:border-b-0"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 bg-muted rounded-full">
                  {getActivityIcon(activity.type)}
                </div>
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">
                    {getActivityTitle(activity)}
                  </h4>
                  <time className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(activity.timestamp.toDate(), {
                      addSuffix: true,
                    })}
                  </time>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getActivityBadgeColor(activity.type)}`}
                  >
                    {activity.type.replace("-", " ")}
                  </Badge>

                  {activity.score && (
                    <Badge variant="outline" className="text-xs">
                      Score: {activity.score}%
                    </Badge>
                  )}

                  {activity.url && (
                    <a
                      href={activity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(activity.url).hostname}
                    </a>
                  )}
                </div>

                {activity.keywords && activity.keywords.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {activity.keywords.slice(0, 3).map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {activity.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{activity.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {activities.length > 20 && (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Showing 20 most recent activities out of {activities.length}{" "}
                total
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
