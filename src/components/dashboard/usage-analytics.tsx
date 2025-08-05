"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TrendingUp,
  Zap,
  Users,
  FileText,
  BarChart3,
  ArrowUpRight,
  Crown,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

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
  const { subscription, loading: subscriptionLoading } = useSubscription();
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
    if (user) {
      fetchUsageData();
    }
  }, [user]);

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      setUsage({
        projects: userData?.usage?.projects || 0,
        keywords: userData?.usage?.keywords || 0,
        reports: userData?.usage?.reports || 0,
        apiCalls: userData?.usage?.apiCalls || 0,
        storage: userData?.usage?.storage || 0,
        users: userData?.usage?.users || 1,
      });
    } catch (_error) {
      console.error("Error fetching usage data:", _error);
    } finally {
      setLoading(false);
    }
  };

  const limits = getLimits();

  const usageLimits: UsageLimit[] = [
    {
      name: "Projects",
      current: usage.projects || 0,
      limit: limits.auditsPerMonth,
      icon: <FileText className="w-4 h-4" />,
      color:
        (usage.projects || 0) >= limits.auditsPerMonth * 0.8
          ? "text-red-500"
          : "text-blue-500",
    },
    {
      name: "Keywords",
      current: usage.keywords || 0,
      limit: limits.keywords,
      icon: <Zap className="w-4 h-4" />,
      color:
        (usage.keywords || 0) >= limits.keywords * 0.8
          ? "text-red-500"
          : "text-green-500",
    },
    {
      name: "Reports",
      current: usage.reports || 0,
      limit: limits.auditsPerMonth,
      icon: <BarChart3 className="w-4 h-4" />,
      color:
        (usage.reports || 0) >= limits.auditsPerMonth * 0.8
          ? "text-red-500"
          : "text-purple-500",
    },
    {
      name: "Team Members",
      current: usage.users || 0,
      limit: limits.competitors,
      icon: <Users className="w-4 h-4" />,
      color:
        (usage.users || 0) >= limits.competitors * 0.8
          ? "text-red-500"
          : "text-orange-500",
    },
  ];

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageStatus = (current: number, limit: number) => {
    if (limit === -1) return "unlimited";
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return "exceeded";
    if (percentage >= 80) return "warning";
    return "normal";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded":
        return "text-red-500";
      case "warning":
        return "text-yellow-500";
      case "unlimited":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, _i) => (
            <Card key={_i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
                  <Crown className="w-5 h-5 text-yellow-500" />
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
        {usageLimits.map((_item) => {
          const percentage = getUsagePercentage(_item.current, _item.limit);
          const status = getUsageStatus(_item.current, _item.limit);

          return (
            <Card key={_item.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {_item.name}
                </CardTitle>
                <div className={_item.color}>{_item.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {_item.current}
                  {_item.limit === -1 ? "" : `/${_item.limit}`}
                  {_item.unit && ` ${_item.unit}`}
                </div>

                {_item.limit !== -1 && (
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

                {_item.limit === -1 && (
                  <p className="text-xs text-green-500 mt-2">Unlimited</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warnings and Recommendations */}
      {usageLimits.some(
        (_item) =>
          getUsageStatus(_item.current, _item.limit) === "warning" ||
          getUsageStatus(_item.current, _item.limit) === "exceeded"
      ) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-5 h-5" />
              Usage Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usageLimits
              .filter(
                (_item) =>
                  getUsageStatus(_item.current, _item.limit) !== "normal" &&
                  getUsageStatus(_item.current, _item.limit) !== "unlimited"
              )
              .map((_item) => (
                <div
                  key={_item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {_item.name}: {_item.current}/{_item.limit}
                  </span>
                  <Badge
                    variant={
                      getUsageStatus(_item.current, _item.limit) === "exceeded"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {getUsageStatus(_item.current, _item.limit) === "exceeded"
                      ? "Exceeded"
                      : "Near Limit"}
                  </Badge>
                </div>
              ))}

            <div className="pt-2 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                Consider upgrading your plan to continue using all features.
              </p>
              <Button
                asChild
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
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
