"use client";
import { useAuth } from "@/context/AuthContext";
import type { SubscriptionTier, UserAccess } from "@/lib/access-control";
import { canAccessCapability, getAccessibleFeatures, getRemainingUsage, isAtUsageLimit, normalizeUserAccess } from "@/lib/access-control";
import { db } from "@/lib/firebase";
import type { PlanType } from "@/lib/stripe";
import { FREE_PLAN, STRIPE_PLANS } from "@/lib/stripe";
import type { SubscriptionData } from "@/lib/subscription";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
// Optional real-time subscription consolidation
// We intentionally lazy-load onSnapshot only when realtime enabled to avoid bundling cost for static pages
let _onSnapshot: ((...args: any[]) => any) | null = null;

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

export function useSubscription(options: { realtime?: boolean } = {}) {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const realtime = options.realtime === true; // default off to reduce duplicate listeners
  // Track active realtime listener (single consolidated)
  const [unsubRef, setUnsubRef] = useState<null | (() => void)>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSubscription() {
      // Ultra-early test override (Playwright / E2E) via global variable to avoid auth & Firestore
      try {
        if (typeof window !== 'undefined' && (window as unknown as { __SUBSCRIPTION_OVERRIDE__?: { tier: SubscriptionTier; status?: string } }).__SUBSCRIPTION_OVERRIDE__) {
          const ov = (window as unknown as { __SUBSCRIPTION_OVERRIDE__?: { tier: SubscriptionTier; status?: string } }).__SUBSCRIPTION_OVERRIDE__!;
          if (ov?.tier) {
            const forcedTier = ov.tier;
            const defaultUserAccess: UserAccess = { role: 'user', tier: forcedTier, status: (ov.status as SubscriptionInfo['status']) || 'active' };
            const planRef = forcedTier === 'free' ? FREE_PLAN : STRIPE_PLANS[forcedTier as PlanType] || FREE_PLAN;
            if (!cancelled) setSubscription({
              status: defaultUserAccess.status,
              tier: forcedTier,
              planName: planRef.name,
              planLimits: planRef.limits,
              features: planRef.features,
              isUnlimited: planRef.limits.auditsPerMonth === -1,
              userAccess: defaultUserAccess,
              accessibleFeatures: getAccessibleFeatures(defaultUserAccess)
            });
            if (!cancelled) setLoading(false);
            return; // Skip rest
          }
        }
      } catch { }
      // Development/testing override (Playwright/local) to bypass Firestore + Auth
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('DEV_SUBSCRIPTION_OVERRIDE');
          if (raw) {
            const ov = JSON.parse(raw || '{}');
            if (ov && ov.tier) {
              const forcedTier = ov.tier as SubscriptionTier;
              const defaultUserAccess: UserAccess = {
                role: 'user',
                tier: forcedTier,
                status: (ov.status as SubscriptionInfo['status']) || 'active'
              };
              if (!cancelled) setSubscription({
                status: defaultUserAccess.status,
                tier: forcedTier,
                planName: forcedTier === 'free' ? FREE_PLAN.name : STRIPE_PLANS[forcedTier as PlanType]?.name || FREE_PLAN.name,
                planLimits: forcedTier === 'free' ? FREE_PLAN.limits : STRIPE_PLANS[forcedTier as PlanType]?.limits || FREE_PLAN.limits,
                features: forcedTier === 'free' ? FREE_PLAN.features : STRIPE_PLANS[forcedTier as PlanType]?.features || FREE_PLAN.features,
                isUnlimited: forcedTier !== 'free',
                userAccess: defaultUserAccess,
                accessibleFeatures: getAccessibleFeatures(defaultUserAccess)
              });
              if (!cancelled) setLoading(false);
              return; // short-circuit normal fetch
            }
          }
        }
      } catch { }

      if (!user?.uid) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        // Inline subscription fetch to avoid import issues
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        // Development override: allow tests to force tier via localStorage flag (handled in page context)
        let forcedTier: string | undefined;
        try {
          if (typeof window !== 'undefined') forcedTier = localStorage.getItem('DEV_FORCED_TIER') || undefined;
        } catch { }

        const subData: SubscriptionData = userData
          ? {
            status: userData.subscriptionStatus || "free",
            tier: (forcedTier as unknown) || userData.subscriptionTier || "free",
            customerId: userData.stripeCustomerId,
            subscriptionId: userData.stripeSubscriptionId,
            currentPeriodEnd: userData.nextBillingDate?.toDate(),
            cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
          }
          : { status: "free", tier: "free" };

        let planInfo;
        if (subData.tier === "free") {
          planInfo = FREE_PLAN;
        } else if (subData.tier === ("admin" as unknown)) {
          // Treat admin as enterprise tier for plan benefits (avoid custom name that breaks PlanType types)
          planInfo = STRIPE_PLANS.enterprise;
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

        if (!cancelled) setSubscription(subscriptionInfo);
      } catch (error) {
        console.error("Error fetching subscription:", error);

        // Default to free plan on error
        const defaultUserAccess: UserAccess = {
          role: "user",
          tier: "free",
          status: "free",
        };

        if (!cancelled) setSubscription({
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
        if (!cancelled) setLoading(false);
      }
    }
    // Initial fetch
    fetchSubscription();

    // Optional realtime listener (single consolidated) only when enabled & user present
    if (realtime && user?.uid) {
      (async () => {
        if (!_onSnapshot) {
          const mod = await import('firebase/firestore');
          _onSnapshot = mod.onSnapshot;
        }
        const ref = doc(db, 'users', user.uid);
        const unsub = _onSnapshot(ref, (snap: { exists: () => boolean; data: () => any }) => {
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, any>;
          const subData: SubscriptionData = {
            status: data.subscriptionStatus || 'free',
            tier: data.subscriptionTier || 'free',
            customerId: data.stripeCustomerId,
            subscriptionId: data.stripeSubscriptionId,
            currentPeriodEnd: data.nextBillingDate?.toDate?.() || data.nextBillingDate,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          };
          let planInfo = subData.tier === 'free' ? FREE_PLAN : STRIPE_PLANS[subData.tier as PlanType] || FREE_PLAN;
          if (subData.tier === ('admin' as unknown)) planInfo = STRIPE_PLANS.enterprise;
          const userAccess = normalizeUserAccess({ role: profile?.role || 'user', subscriptionTier: subData.tier, subscriptionStatus: subData.status });
          const subscriptionInfo: SubscriptionInfo = {
            ...subData,
            planName: planInfo.name,
            planLimits: planInfo.limits,
            features: planInfo.features,
            isUnlimited: planInfo.limits.auditsPerMonth === -1,
            userAccess,
            accessibleFeatures: getAccessibleFeatures(userAccess)
          };
          if (!cancelled) setSubscription(subscriptionInfo);
        }, (err: unknown) => console.error('[SubscriptionRealtime] snapshot error', err));
        setUnsubRef(() => unsub);
      })();
    }
    return () => { cancelled = true; if (unsubRef) unsubRef(); };
  }, [user?.uid, profile?.role, realtime]);

  const canUseFeature = (featureName: string): boolean => {
    if (!subscription?.userAccess) return false;
    return canAccessCapability(subscription.userAccess, featureName);
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
