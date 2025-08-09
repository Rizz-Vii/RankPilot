"use client";

import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_HIERARCHY } from "@/lib/access-control";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import Link from "next/link";

interface FeatureGateProps {
  children?: ReactNode;
  feature?: string;
  requiredTier?: "starter" | "agency" | "enterprise";
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  children,
  feature,
  requiredTier,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const { subscription, canUseFeature, userAccess, loading } = useSubscription();

  // Avoid showing an upgrade prompt while subscription state is loading
  if (loading) {
    return null;
  }

  // Check if user has access to the feature
  const hasAccess = feature ? canUseFeature(feature) : true;

  // Determine effective tier (normalized: admin -> enterprise) and check requirement
  const meetsTierRequirement = requiredTier
    ? (() => {
        const effectiveTier = (userAccess?.tier || subscription?.tier || "free") as typeof TIER_HIERARCHY[number];
        const userTierIndex = TIER_HIERARCHY.indexOf(effectiveTier);
        const requiredTierIndex = TIER_HIERARCHY.indexOf(requiredTier);
        if (userTierIndex === -1 || requiredTierIndex === -1) return false;
        return userTierIndex >= requiredTierIndex;
      })()
    : true;

  if (hasAccess && meetsTierRequirement) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade || !children) {
    return null;
  }

  // Default upgrade prompt
  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="mb-2">
          {requiredTier === "starter"
            ? "Starter"
            : requiredTier === "agency"
              ? "Agency"
              : requiredTier === "enterprise"
                ? "Enterprise"
                : "Premium"}{" "}
          Feature
        </CardTitle>
        <CardDescription className="mb-4 max-w-sm">
          This feature is available with the{" "}
          {requiredTier === "starter"
            ? "Starter"
            : requiredTier === "agency"
              ? "Agency"
              : requiredTier === "enterprise"
                ? "Enterprise"
                : "premium"}{" "}
          plan. Upgrade to unlock advanced capabilities.
        </CardDescription>
        <Link href="/settings/billing">
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface UsageLimitProps {
  children: ReactNode;
  usageType: "auditsPerMonth" | "keywords" | "reports" | "competitors";
  currentUsage: number;
  showWarning?: boolean;
  warningThreshold?: number; // percentage
}

export function UsageLimit({
  children,
  usageType,
  currentUsage,
  showWarning = true,
  warningThreshold = 80,
}: UsageLimitProps) {
  const { subscription, isAtLimit, getRemainingUsage } = useSubscription();

  const atLimit = isAtLimit(usageType, currentUsage);
  const remaining = getRemainingUsage(usageType, currentUsage);
  const limit = subscription?.planLimits[usageType] || 0;
  const usagePercentage = limit > 0 ? (currentUsage / limit) * 100 : 0;

  if (atLimit) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-orange-800">
              Usage Limit Reached
            </span>
          </div>
          <p className="text-sm text-orange-700 mb-3">
            You've reached your monthly limit for{" "}
            {usageType.replace(/([A-Z])/g, " $1").toLowerCase()}. Upgrade your
            plan to continue using this feature.
          </p>
          <Link href="/settings/billing">
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700"
            >
              Upgrade Plan
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (
    showWarning &&
    usagePercentage >= warningThreshold &&
    !subscription?.isUnlimited
  ) {
    return (
      <div className="space-y-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Usage Warning: {Math.round(usagePercentage)}% used
                </p>
                <p className="text-xs text-yellow-700">
                  {remaining}{" "}
                  {usageType.replace(/([A-Z])/g, " $1").toLowerCase()} remaining
                  this month
                </p>
              </div>
              <Link href="/settings/billing">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-yellow-300 text-yellow-700"
                >
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for page-level access control
export function withSubscriptionAccess<P extends object>(
  Component: React.ComponentType<P>,
  requiredTier?: "starter" | "agency" | "enterprise"
) {
  return function SubscriptionProtectedComponent(props: P) {
    const { subscription, loading } = useSubscription();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!requiredTier) {
      return <Component {...props} />;
    }

    const userTier = subscription?.tier;
    if (!userTier) {
      return (
        <div className="container mx-auto px-4 py-8">
          <FeatureGate requiredTier={requiredTier} />
        </div>
      );
    }

    const userIndex = TIER_HIERARCHY.indexOf(userTier as any);
    const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier as any);
    const hasAccess = userIndex !== -1 && requiredIndex !== -1 && userIndex >= requiredIndex;

    if (!hasAccess) {
      return (
        <div className="container mx-auto px-4 py-8">
          <FeatureGate requiredTier={requiredTier} />
        </div>
      );
    }

    return <Component {...props} />;
  };
}
