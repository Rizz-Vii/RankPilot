// src/app/(app)/profile/page.tsx
"use client";

import ProfileForm from "@/components/profile-form";
import SEOAchievementsBadges from "@/components/profile/seo-achievements-badges";
import SEOActivitiesTimeline from "@/components/profile/seo-activities-timeline";
import { ToolPageHeader } from "@/components/tool-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingScreen from "@/components/ui/loading-screen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toJsDate } from "@/lib/utils";
import { Activity, Award, TrendingUp, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function ProfilePage() {
  const { user, profile, activities, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [defaultTab, setDefaultTab] = useState<string>("profile");
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);

    // Redirect billing tab access to settings page
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab");
      if (tab === "billing") {
        router.push("/settings?tab=billing");
        return;
      }
      // Set default tab from URL params
      if (tab) {
        setDefaultTab(tab);
      }
    }
  }, [router]);

  if (authLoading || !mounted) {
    return <LoadingScreen fullScreen text="Loading your SEO profile..." />;
  }

  if (!user || !profile) {
    return null;
  }

  // Normalize activities to expected Activity shape for downstream components
  type ActivityTs = Date | number | { seconds?: number; toDate?: () => Date };
  type NormalizedActivity = {
    id: string;
    type: string;
    title?: string;
    url?: string;
    keywords?: string[];
    score?: number;
    timestamp: ActivityTs;
    metadata?: unknown;
  };
  const normalizedActivities: NormalizedActivity[] = (activities || []).map(
    (a) => {
      const obj = a as unknown as Record<string, unknown>;
      const id =
        typeof obj.id === "string"
          ? obj.id
          : Math.random().toString(36).slice(2);
      const type = typeof obj.type === "string" ? obj.type : "activity";
      const title = typeof obj.title === "string" ? obj.title : undefined;
      const url = typeof obj.url === "string" ? obj.url : undefined;
      const keywords = Array.isArray(obj.keywords)
        ? (obj.keywords as unknown[]).filter(
            (k): k is string => typeof k === "string"
          )
        : undefined;
      const score = typeof obj.score === "number" ? obj.score : undefined;
      const metadata = obj.metadata as unknown;
      const tsUnknown = obj.timestamp as unknown;
      let timestamp: ActivityTs = tsUnknown as ActivityTs;
      if (typeof tsUnknown === "number" && tsUnknown > 1e12) {
        timestamp = new Date(tsUnknown);
      } else if (typeof tsUnknown === "number" && tsUnknown < 1e12) {
        timestamp = { seconds: tsUnknown };
      }
      return { id, type, title, url, keywords, score, timestamp, metadata };
    }
  );

  return (
    <main className="container mx-auto py-6 space-y-8">
      <ToolPageHeader
        title="Your SEO Profile"
        description="Professional SEO identity, achievements, and activity history."
        badges={[{ label: "User", variant: "secondary" }]}
        showBreadcrumb
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileForm user={user} profile={profile} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <SEOActivitiesTimeline activities={normalizedActivities} />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <SEOAchievementsBadges
            user={user}
            profile={profile}
            activities={normalizedActivities}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SEO Audits</CardTitle>
                <CardDescription>Total audits completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(activities || []).filter((a) => a.type === "audit")
                    .length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {(activities || []).filter(
                    (a) =>
                      a.type === "audit" &&
                      toJsDate(
                        (a as { timestamp?: unknown }).timestamp
                      ).getMonth() === new Date().getMonth()
                  ).length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keywords Researched</CardTitle>
                <CardDescription>Total keyword analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(activities || []).filter(
                    (a) => a.type === "keyword-research"
                  ).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {(activities || []).filter(
                    (a) =>
                      a.type === "keyword-research" &&
                      toJsDate(
                        (a as { timestamp?: unknown }).timestamp
                      ).getMonth() === new Date().getMonth()
                  ).length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SERP Analysis</CardTitle>
                <CardDescription>Search result reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(activities || []).filter((a) => a.type === "serp-analysis")
                    .length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {(activities || []).filter(
                    (a) =>
                      a.type === "serp-analysis" &&
                      toJsDate(
                        (a as { timestamp?: unknown }).timestamp
                      ).getMonth() === new Date().getMonth()
                  ).length || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
