import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { STRIPE_PLANS, PlanType } from "./stripe";

export interface SubscriptionData {
  status: "active" | "canceled" | "past_due" | "free";
  tier: PlanType | "free";
  customerId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export async function getUserSubscription(
  userId: string
): Promise<SubscriptionData> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();

    if (!userData) {
      return { status: "free", tier: "free" };
    }

    return {
      status: userData.subscriptionStatus || "free",
      tier: userData.subscriptionTier || "free",
      customerId: userData.stripeCustomerId,
      subscriptionId: userData.stripeSubscriptionId,
      currentPeriodEnd: userData.nextBillingDate?.toDate(),
      cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
    };
  } catch (_error) {
    console.error("Error fetching user subscription:", _error);
    return { status: "free", tier: "free" };
  }
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<SubscriptionData>
): Promise<void> {
  try {
    const updateData: Record<string, any> = {};

    if (subscriptionData.status) {
      updateData.subscriptionStatus = subscriptionData.status;
    }

    if (subscriptionData.tier) {
      updateData.subscriptionTier = subscriptionData.tier;
    }

    if (subscriptionData.customerId) {
      updateData.stripeCustomerId = subscriptionData.customerId;
    }

    if (subscriptionData.subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionData.subscriptionId;
    }

    if (subscriptionData.currentPeriodEnd) {
      updateData.nextBillingDate = subscriptionData.currentPeriodEnd;
    }

    if (subscriptionData.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = subscriptionData.cancelAtPeriodEnd;
    }

    updateData.updatedAt = new Date();

    await updateDoc(doc(db, "users", userId), updateData);
  } catch (_error) {
    console.error("Error updating user subscription:", _error);
    throw _error;
  }
}

export function getSubscriptionLimits(tier: PlanType | "free") {
  const limits = {
    free: {
      auditsPerMonth: 5,
      keywordTracking: 10,
      competitorAnalysis: 1,
      exportData: false,
      prioritySupport: false,
      apiAccess: false,
    },
    starter: {
      auditsPerMonth: 50,
      keywordTracking: 50,
      competitorAnalysis: 5,
      exportData: true,
      prioritySupport: false,
      apiAccess: false,
    },
    agency: {
      auditsPerMonth: -1, // Unlimited
      keywordTracking: -1, // Unlimited
      competitorAnalysis: -1, // Unlimited
      exportData: true,
      prioritySupport: true,
      apiAccess: true,
    },
    enterprise: {
      auditsPerMonth: -1, // Unlimited
      keywordTracking: -1, // Unlimited
      competitorAnalysis: -1, // Unlimited
      exportData: true,
      prioritySupport: true,
      apiAccess: true,
    },
  };

  return limits[tier] || limits.free;
}

export function canAccessFeature(
  userTier: PlanType | "free",
  feature: string
): boolean {
  const limits = getSubscriptionLimits(userTier);

  switch (feature) {
    case "export":
      return limits.exportData;
    case "priority_support":
      return limits.prioritySupport;
    case "api_access":
      return limits.apiAccess;
    case "advanced_audit":
      return userTier !== "free";
    case "white_label":
      return userTier === "agency";
    case "custom_integrations":
      return userTier === "agency";
    default:
      return true;
  }
}

export function getRemainingUsage(
  userTier: PlanType | "free",
  currentUsage: { [_key: string]: number }
) {
  const limits = getSubscriptionLimits(userTier);

  return {
    audits:
      limits.auditsPerMonth === -1
        ? "unlimited"
        : Math.max(0, limits.auditsPerMonth - (currentUsage.audits || 0)),
    keywords:
      limits.keywordTracking === -1
        ? "unlimited"
        : Math.max(0, limits.keywordTracking - (currentUsage.keywords || 0)),
    competitors:
      limits.competitorAnalysis === -1
        ? "unlimited"
        : Math.max(
          0,
          limits.competitorAnalysis - (currentUsage.competitors || 0)
        ),
  };
}

export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "canceled":
      return "Canceled";
    case "past_due":
      return "Past Due";
    case "free":
      return "Free Plan";
    default:
      return "Unknown";
  }
}

export function getUpgradeRecommendation(
  currentTier: PlanType | "free",
  usage: { [_key: string]: number }
): { shouldUpgrade: boolean; recommendedTier?: PlanType; reason?: string } {
  const limits = getSubscriptionLimits(currentTier);

  // Check if user is hitting limits
  if (
    limits.auditsPerMonth !== -1 &&
    (usage.audits || 0) >= limits.auditsPerMonth * 0.8
  ) {
    return {
      shouldUpgrade: true,
      recommendedTier:
        currentTier === "free"
          ? "starter"
          : currentTier === "starter"
            ? "agency"
            : "agency",
      reason: "You're approaching your monthly audit limit",
    };
  }

  if (
    limits.keywordTracking !== -1 &&
    (usage.keywords || 0) >= limits.keywordTracking * 0.8
  ) {
    return {
      shouldUpgrade: true,
      recommendedTier:
        currentTier === "free"
          ? "starter"
          : currentTier === "starter"
            ? "agency"
            : "agency",
      reason: "You're approaching your keyword tracking limit",
    };
  }

  return { shouldUpgrade: false };
}
