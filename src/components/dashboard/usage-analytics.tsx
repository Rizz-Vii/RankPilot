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
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Crown,
  FileText,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface UsageData {
  projects: number;
  keywords: number;
  reports: number;
  apiCalls: number;
  storage: number; // in MB
  users: number; // team members
}

interface UsageLimit {
  name: string;
  current: number;
  limit: number;
  icon: React.ReactNode;
  color: string;
  unit?: string;
}

export function UsageAnalytics() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [usage, setUsage] = useState<UsageData>({
    projects: 0,
    keywords: 0,
    reports: 0,
    apiCalls: 0,
    storage: 0,
    users: 1,
  });
  const [loading, setLoading] = useState(true);

  // Helper functions to derive missing properties
  const isActive = subscription?.status === "active";
  const isPremium = subscription?.tier !== "free";
  const getLimits = () =>
    subscription?.planLimits || {
      auditsPerMonth: 3,
      keywords: 50,
      reports: 1,
      competitors: 1,
    };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!user?.uid) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "usageMetrics", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists() && mounted) {
          const data = snap.data() as Partial<UsageData> | undefined;
          setUsage((prev) => ({
            projects:
              typeof data?.projects === "number"
                ? data.projects
                : prev.projects,
            keywords:
              typeof data?.keywords === "number"
                ? data.keywords
                : prev.keywords,
            reports:
              typeof data?.reports === "number" ? data.reports : prev.reports,
            apiCalls:
              typeof data?.apiCalls === "number"
                ? data.apiCalls
                : prev.apiCalls,
            storage:
              typeof data?.storage === "number" ? data.storage : prev.storage,
            users: typeof data?.users === "number" ? data.users : prev.users,
          }));
        } else if (mounted) {
          // Deterministic fallback (bounded) for UI continuity
          setUsage((u) => ({ ...u }));
        }
      } catch {
        // silent degrade – keep prior usage
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Fire & forget metrics fetch (safe: internal state update only)
    void run();

    return () => {
      mounted = false;
    };
  }, [user]);

  const limits = getLimits();

  const usageLimits: UsageLimit[] = [
    {
      name: "Projects",
      current: usage.projects || 0,
      limit: limits.auditsPerMonth,
      icon: <FileText className="w-4 h-4" />,
      color:
        (usage.projects || 0) >= limits.auditsPerMonth * 0.8
          ? "text-destructive-foreground"
          : "text-primary",
    },
    {
      name: "Keywords",
      current: usage.keywords || 0,
      limit: limits.keywords,
      icon: <Zap className="w-4 h-4" />,
      color:
        (usage.keywords || 0) >= limits.keywords * 0.8
          ? "text-destructive-foreground"
          : "text-success-foreground",
    },
    {
      name: "Reports",
      current: usage.reports || 0,
      limit: limits.auditsPerMonth,
      icon: <BarChart3 className="w-4 h-4" />,
      color:
        (usage.reports || 0) >= limits.auditsPerMonth * 0.8
          ? "text-destructive-foreground"
          : "text-accent-foreground",
    },
    {
      name: "Team Members",
      current: usage.users || 0,
      limit: limits.competitors,
      icon: <Users className="w-4 h-4" />,
      color:
        (usage.users || 0) >= limits.competitors * 0.8
          ? "text-destructive-foreground"
          : "text-warning-foreground",
    },
  ];

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    if (limit <= 0) return current > 0 ? 100 : 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageStatus = (current: number, limit: number) => {
    if (limit === -1) return "unlimited";
    if (limit <= 0) return current > 0 ? "exceeded" : "normal";
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return "exceeded";
    if (percentage >= 80) return "warning";
    return "normal";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded":
        return "text-destructive-foreground";
      case "warning":
        return "text-warning-foreground";
      case "unlimited":
        return "text-success-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPremium ? (
                  <Crown className="w-5 h-5 text-warning-foreground" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                Current Plan:{" "}
                {(subscription?.tier?.charAt(0).toUpperCase() || "") +
                  (subscription?.tier?.slice(1) || "") || "Free"}
              </CardTitle>
              <CardDescription>
                {isActive ? "Active subscription" : "Inactive or free plan"}
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {subscription?.status?.toUpperCase() || "FREE"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {usageLimits.map((item) => {
          const percentage = getUsagePercentage(item.current, item.limit);
          const status = getUsageStatus(item.current, item.limit);

          return (
            <Card key={item.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {item.name}
                </CardTitle>
                <div className={item.color}>{item.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {item.current}
                  {item.limit === -1 ? "" : `/${item.limit}`}
                  {item.unit && ` ${item.unit}`}
                </div>

                {item.limit !== -1 && (
                  <div className="mt-2 space-y-1">
                    <Progress value={percentage} className="h-2" />
                    <p className={`text-xs ${getStatusColor(status)}`}>
                      {status === "unlimited"
                        ? "Unlimited"
                        : status === "exceeded"
                          ? "Limit exceeded!"
                          : status === "warning"
                            ? "Approaching limit"
                            : `${Math.round(percentage)}% used`}
                    </p>
                  </div>
                )}

                {item.limit === -1 && (
                  <p className="text-xs text-success-foreground mt-2">
                    Unlimited
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warnings and Recommendations */}
      {usageLimits.some(
        (item) =>
          getUsageStatus(item.current, item.limit) === "warning" ||
          getUsageStatus(item.current, item.limit) === "exceeded"
      ) && (
        <Card className="border-warning/30 bg-warning/10 dark:border-warning/40 dark:bg-warning/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="w-5 h-5" />
              Usage Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usageLimits
              .filter(
                (item) =>
                  getUsageStatus(item.current, item.limit) !== "normal" &&
                  getUsageStatus(item.current, item.limit) !== "unlimited"
              )
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {item.name}: {item.current}/{item.limit}
                  </span>
                  <Badge
                    variant={
                      getUsageStatus(item.current, item.limit) === "exceeded"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {getUsageStatus(item.current, item.limit) === "exceeded"
                      ? "Exceeded"
                      : "Near Limit"}
                  </Badge>
                </div>
              ))}

            <div className="pt-2 border-t border-warning/30 dark:border-warning/40">
              <p className="text-sm text-warning-foreground mb-2">
                Consider upgrading your plan to continue using all features.
              </p>
              <Button
                asChild
                size="sm"
                className="bg-warning text-warning-foreground hover:bg-warning/80"
              >
                <Link href="/pricing" className="flex items-center gap-1">
                  Upgrade Plan
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Details</CardTitle>
          <CardDescription>
            Detailed breakdown of your current usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Calls (this month)</span>
                  <span className="font-medium">
                    {usage.apiCalls.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span className="font-medium">{usage.storage} MB</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Features</span>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {[
                        `${limits.auditsPerMonth === -1 ? "Unlimited" : limits.auditsPerMonth} audits/month`,
                        `${limits.keywords === -1 ? "Unlimited" : limits.keywords} keywords`,
                        `${limits.reports === -1 ? "Unlimited" : limits.reports} reports`,
                        `${limits.competitors === -1 ? "Unlimited" : limits.competitors} competitors`,
                      ].join(", ")}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Support Level</span>
                  <span className="font-medium capitalize">
                    {isPremium ? "Priority" : "Standard"}
                  </span>
                </div>
              </div>
            </div>

            {!isPremium && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Want more?</p>
                    <p className="text-xs text-muted-foreground">
                      Upgrade to unlock unlimited features
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/pricing" className="flex items-center gap-1">
                      View Plans
                      <TrendingUp className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
