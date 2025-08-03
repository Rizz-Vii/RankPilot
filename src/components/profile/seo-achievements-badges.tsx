"use client";

import "./seo-achievements-badges.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Star,
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import type { User } from "firebase/auth";

interface Activity {
  id: string;
  type: string;
  title?: string;
  url?: string;
  keywords?: string[];
  score?: number;
  timestamp: unknown;
  metadata?: unknown;
}

interface Profile {
  displayName?: string;
  bio?: string;
  primaryKeywords?: string;
  // add other fields as needed
}

interface SEOAchievementsBadgesProps {
  user: User;
  profile: Profile;
  activities: Activity[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  earnedDate?: Date;
  progress?: number;
  requirement: number;
}

export default function SEOAchievementsBadges({
  user,
  profile,
  activities,
}: SEOAchievementsBadgesProps) {
  // Calculate achievement progress
  const auditCount = activities.filter((a) => a.type === "audit").length;
  const keywordCount = activities.filter(
    (a) => a.type === "keyword-research"
  ).length;
  const serpCount = activities.filter((a) => a.type === "serp-analysis").length;
  const highScoreAudits = activities.filter(
    (a) => a.type === "audit" && a.score && a.score >= 90
  ).length;
  const daysSinceJoining = user.metadata.creationTime
    ? Math.floor(
        (Date.now() - new Date(user.metadata.creationTime).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const achievements: Achievement[] = [
    {
      id: "first-audit",
      title: "First Steps",
      description: "Completed your first SEO audit",
      icon: <Trophy className="h-5 w-5" />,
      earned: auditCount >= 1,
      earnedDate:
        auditCount >= 1
          ? (() => {
              const ts = activities.find((a) => a.type === "audit")?.timestamp;
              if (ts && typeof (ts as any).toDate === "function") {
                return (ts as { toDate: () => Date }).toDate();
              }
              if (typeof ts === "string" || typeof ts === "number") {
                return new Date(ts as string | number);
              }
              return undefined;
            })()
          : undefined,
      progress: Math.min(auditCount, 1),
      requirement: 1,
    },
    {
      id: "audit-master",
      title: "Audit Master",
      description: "Completed 10 SEO audits",
      icon: <Award className="h-5 w-5" />,
      earned: auditCount >= 10,
      progress: Math.min(auditCount, 10),
      requirement: 10,
    },
    {
      id: "keyword-researcher",
      title: "Keyword Researcher",
      description: "Performed 25 keyword research sessions",
      icon: <Target className="h-5 w-5" />,
      earned: keywordCount >= 25,
      progress: Math.min(keywordCount, 25),
      requirement: 25,
    },
    {
      id: "serp-analyzer",
      title: "SERP Analyzer",
      description: "Analyzed 50 search result pages",
      icon: <TrendingUp className="h-5 w-5" />,
      earned: serpCount >= 50,
      progress: Math.min(serpCount, 50),
      requirement: 50,
    },
    {
      id: "high-performer",
      title: "High Performer",
      description: "Achieved 90%+ audit scores 5 times",
      icon: <Star className="h-5 w-5" />,
      earned: highScoreAudits >= 5,
      progress: Math.min(highScoreAudits, 5),
      requirement: 5,
    },
    {
      id: "power-user",
      title: "Power User",
      description: "Completed 100 total SEO activities",
      icon: <Zap className="h-5 w-5" />,
      earned: activities.length >= 100,
      progress: Math.min(activities.length, 100),
      requirement: 100,
    },
    {
      id: "veteran",
      title: "SEO Veteran",
      description: "Active member for 90+ days",
      icon: <Clock className="h-5 w-5" />,
      earned: daysSinceJoining >= 90,
      progress: Math.min(daysSinceJoining, 90),
      requirement: 90,
    },
    {
      id: "community-member",
      title: "Community Member",
      description: "Completed profile with all details",
      icon: <Users className="h-5 w-5" />,
      earned: !!(
        profile?.displayName &&
        profile?.bio &&
        profile?.primaryKeywords
      ),
      progress: [
        profile?.displayName,
        profile?.bio,
        profile?.primaryKeywords,
      ].filter(Boolean).length,
      requirement: 3,
    },
  ];

  const earnedAchievements = achievements.filter((a) => a.earned);
  const unearned = achievements.filter((a) => !a.earned);

  return (
    <div className="space-y-6">
      {/* Earned Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Earned Achievements ({earnedAchievements.length})
          </CardTitle>
          <CardDescription>
            Congratulations on your SEO accomplishments!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnedAchievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                      {achievement.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">
                        {achievement.title}
                      </h3>
                      {achievement.earnedDate && (
                        <p className="text-xs text-muted-foreground">
                          Earned {achievement.earnedDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  <Badge className="mt-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    ✓ Completed
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Achievements Yet</h3>
              <p className="text-muted-foreground">
                Keep using RankPilot to unlock your first achievement!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Towards Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Achievement Progress
          </CardTitle>
          <CardDescription>
            Keep working towards these milestones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unearned.map((achievement) => (
              <div
                key={achievement.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full text-muted-foreground">
                      {achievement.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">
                        {achievement.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {achievement.progress}/{achievement.requirement}
                  </Badge>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    data-progress={Math.min(
                      (achievement.progress! / achievement.requirement) * 100,
                      100
                    )}
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {achievement.requirement - achievement.progress!} more to
                  unlock
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Your SEO Stats</CardTitle>
          <CardDescription>
            Overview of your SEO activities on RankPilot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{auditCount}</div>
              <div className="text-sm text-muted-foreground">SEO Audits</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{keywordCount}</div>
              <div className="text-sm text-muted-foreground">Keywords</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{serpCount}</div>
              <div className="text-sm text-muted-foreground">SERP Analysis</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{daysSinceJoining}</div>
              <div className="text-sm text-muted-foreground">Days Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
