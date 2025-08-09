import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SubscriptionData } from "@/lib/subscription";
import { STRIPE_PLANS, FREE_PLAN, PlanType } from "@/lib/stripe";
import {
  UserAccess,
  SubscriptionTier,
  UserRole,
  canAccessFeature,
  getUserLimits,
  getRemainingUsage,
  isAtUsageLimit,
  getAccessibleFeatures,
  normalizeUserAccess,
  TIER_LIMITS,
} from "@/lib/access-control";

export interface PlanLimits {
  auditsPerMonth: number;
  keywords: number;
  reports: number;
  competitors: number;
}

export interface SubscriptionInfo extends SubscriptionData {
  planName: string;
  planLimits: PlanLimits;
  features: readonly string[];
  isUnlimited: boolean;
  // Enhanced access control
  userAccess: UserAccess;
  accessibleFeatures: string[];
}

export function useSubscription() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Inline subscription fetch to avoid import issues
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        const subData: SubscriptionData = userData
          ? {
            status: userData.subscriptionStatus || "free",
            tier: userData.subscriptionTier || "free",
            customerId: userData.stripeCustomerId,
            subscriptionId: userData.stripeSubscriptionId,
            currentPeriodEnd: userData.nextBillingDate?.toDate(),
            cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
          }
          : { status: "free", tier: "free" };

        let planInfo;
        if (subData.tier === "free") {
          planInfo = FREE_PLAN;
        } else if (subData.tier === ("admin" as any)) {
          // Admin users get enterprise-level features but with admin tier label
          planInfo = {
            ...STRIPE_PLANS.enterprise,
            name: "Admin",
          };
        } else if (subData.tier && subData.tier in STRIPE_PLANS) {
          planInfo = STRIPE_PLANS[subData.tier as PlanType];
        }

        // Fallback to FREE_PLAN if planInfo is still undefined
        if (!planInfo) {
          planInfo = FREE_PLAN;
        }

        // Create user access object from profile and subscription data
        const userAccess = normalizeUserAccess({
          role: profile?.role || "user",
          subscriptionTier: subData.tier,
          subscriptionStatus: subData.status,
        });

        const subscriptionInfo: SubscriptionInfo = {
          ...subData,
          planName: planInfo.name,
          planLimits: planInfo.limits,
          features: planInfo.features,
          isUnlimited: planInfo.limits.auditsPerMonth === -1,
          userAccess,
          accessibleFeatures: getAccessibleFeatures(userAccess),
        };

        setSubscription(subscriptionInfo);
      } catch (error) {
        console.error("Error fetching subscription:", error);

        // Default to free plan on error
        const defaultUserAccess: UserAccess = {
          role: "user",
          tier: "free",
          status: "free",
        };

        setSubscription({
          status: "free",
          tier: "free",
          planName: FREE_PLAN.name,
          planLimits: FREE_PLAN.limits,
          features: FREE_PLAN.features,
          isUnlimited: false,
          userAccess: defaultUserAccess,
          accessibleFeatures: getAccessibleFeatures(defaultUserAccess),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [user?.uid, profile?.role]);

  const canUseFeature = (featureName: string): boolean => {
    if (!subscription?.userAccess) return false;
    return canAccessFeature(subscription.userAccess, featureName);
  };

  const getRemainingUsageCount = (
    usageType: keyof PlanLimits,
    currentUsage: number
  ): number => {
    if (!subscription) return 0;
    return getRemainingUsage(
      subscription.userAccess.tier,
      usageType,
      currentUsage
    );
  };

  const isAtLimitCheck = (
    usageType: keyof PlanLimits,
    currentUsage: number
  ): boolean => {
    if (!subscription) return true;
    return isAtUsageLimit(
      subscription.userAccess.tier,
      usageType,
      currentUsage
    );
  };

  return {
    subscription,
    loading,
    canUseFeature,
    getRemainingUsage: getRemainingUsageCount,
    isAtLimit: isAtLimitCheck,
    // Enhanced access control
    userAccess: subscription?.userAccess || null,
    accessibleFeatures: subscription?.accessibleFeatures || [],
    refetch: async () => {
      if (!user?.uid) return;
      setLoading(true);

      try {
        // Inline subscription fetch to avoid import issues
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        const subData: SubscriptionData = userData
          ? {
            status: userData.subscriptionStatus || "free",
            tier: userData.subscriptionTier || "free",
            customerId: userData.stripeCustomerId,
            subscriptionId: userData.stripeSubscriptionId,
            currentPeriodEnd: userData.nextBillingDate?.toDate(),
            cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
          }
          : { status: "free", tier: "free" };

        let planInfo;
        if (subData.tier === "free") {
          planInfo = FREE_PLAN;
        } else if (subData.tier && subData.tier in STRIPE_PLANS) {
          planInfo = STRIPE_PLANS[subData.tier as PlanType];
        }

        // Fallback to FREE_PLAN if planInfo is still undefined
        if (!planInfo) {
          planInfo = FREE_PLAN;
        }

        // Create user access object from profile and subscription data
        const userAccess = normalizeUserAccess({
          role: profile?.role || "user",
          subscriptionTier: subData.tier,
          subscriptionStatus: subData.status,
        });

        const subscriptionInfo: SubscriptionInfo = {
          ...subData,
          planName: planInfo.name,
          planLimits: planInfo.limits,
          features: planInfo.features,
          isUnlimited: planInfo.limits.auditsPerMonth === -1,
          userAccess,
          accessibleFeatures: getAccessibleFeatures(userAccess),
        };

        setSubscription(subscriptionInfo);
      } catch (error) {
        console.error("Error refetching subscription:", error);
      } finally {
        setLoading(false);
      }
    },
  };
}

export function usePlanComparison() {
  const plans = [
    {
      tier: "free" as const,
      name: FREE_PLAN.name,
      price: FREE_PLAN.price.monthly,
      features: FREE_PLAN.features,
      limits: FREE_PLAN.limits,
      popular: false,
    },
    {
      tier: "starter" as const,
      name: STRIPE_PLANS.starter.name,
      price: STRIPE_PLANS.starter.price.monthly,
      features: STRIPE_PLANS.starter.features,
      limits: STRIPE_PLANS.starter.limits,
      popular: false,
    },
    {
      tier: "agency" as const,
      name: STRIPE_PLANS.agency.name,
      price: STRIPE_PLANS.agency.price.monthly,
      features: STRIPE_PLANS.agency.features,
      limits: STRIPE_PLANS.agency.limits,
      popular: true,
    },
    {
      tier: "enterprise" as const,
      name: STRIPE_PLANS.enterprise.name,
      price: STRIPE_PLANS.enterprise.price.monthly,
      features: STRIPE_PLANS.enterprise.features,
      limits: STRIPE_PLANS.enterprise.limits,
      popular: false,
    },
  ];

  return { plans };
}
