// src/app/(app)/profile/page.tsx
"use client";

import ProfileForm from "@/components/profile-form";
import SEOAchievementsBadges from "@/components/profile/seo-achievements-badges";
import SEOActivitiesTimeline from "@/components/profile/seo-activities-timeline";
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
import { Activity, Award, TrendingUp, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toJsDate } from "@/lib/utils";
import { ToolPageHeader } from "@/components/tool-page-header";

export default function ProfilePage() {
  const { user, profile, activities, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [defaultTab, setDefaultTab] = useState("profile");
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
  const normalizedActivities = (activities || []).map((a: any) => {
    const ts = a?.timestamp;
    // Accept number (assumed seconds), Date, or Firestore-like { seconds, toDate }
    let timestamp: any = ts;
    if (typeof ts === 'number' && ts > 1e12) { // likely ms -> convert to Date
      timestamp = new Date(ts);
    } else if (typeof ts === 'number' && ts < 1e12) { // likely seconds
      timestamp = { seconds: ts };
    }
    return { ...a, timestamp };
  });

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
          <SEOActivitiesTimeline activities={activities || []} />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <SEOAchievementsBadges
            user={user}
            profile={profile}
            activities={normalizedActivities as any}
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
                  {activities?.filter((a) => a.type === "audit").length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {activities?.filter(
                    (a) => a.type === "audit" && toJsDate((a as any).timestamp).getMonth() === new Date().getMonth()
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
                  {activities?.filter((a) => a.type === "keyword-research")
                    .length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {activities?.filter(
                    (a) => a.type === "keyword-research" && toJsDate((a as any).timestamp).getMonth() === new Date().getMonth()
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
                  {activities?.filter((a) => a.type === "serp-analysis")
                    .length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  This month:{" "}
                  {activities?.filter(
                    (a) => a.type === "serp-analysis" && toJsDate((a as any).timestamp).getMonth() === new Date().getMonth()
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
