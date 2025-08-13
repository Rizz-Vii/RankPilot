/**
 * Usage Quota System - Track and enforce usage limits
 * Part of RankPilot's monetization and access control system
 */

import { doc, getDoc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db as sharedDb } from "@/lib/firebase";
import { FREE_PLAN, PlanType, STRIPE_PLANS } from "./stripe";

export interface UsageQuota {
  userId: string;
  plan: PlanType | "free";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  usage: {
    auditsPerformed: number;
    keywordSearches: number;
    reportsGenerated: number;
    competitorAnalyses: number;
  };
  limits: {
    auditsPerMonth: number;
    keywords: number;
    reports: number;
    competitors: number;
  };
  lastUpdated: Date;
}

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  remainingQuota: number;
  remaining: number; // Alias for compatibility
  limit: number; // Total limit
  resetDate: Date;
}

export type UsageType = "audit" | "keyword" | "report" | "competitor";

export class UsageQuotaManager {
  private db = sharedDb;

  async getUserQuota(userId: string): Promise<UsageQuota | null> {
    try {
      const quotaDoc = await getDoc(doc(this.db, "quotas", userId));

      if (!quotaDoc.exists()) {
        // Create default quota for new user
        return await this.initializeUserQuota(userId, "free");
      }

      const data = quotaDoc.data();
      return {
        userId,
        plan: data.plan,
        currentPeriodStart: data.currentPeriodStart.toDate(),
        currentPeriodEnd: data.currentPeriodEnd.toDate(),
        usage: data.usage,
        limits: data.limits,
        lastUpdated: data.lastUpdated.toDate(),
      };
    } catch (error) {
      console.error("Error fetching user quota:", error);
      return null;
    }
  }

  async initializeUserQuota(
    userId: string,
    plan: PlanType | "free"
  ): Promise<UsageQuota> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const limits =
      plan === "free" ? FREE_PLAN.limits : STRIPE_PLANS[plan].limits;

    const quota: UsageQuota = {
      userId,
      plan,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      usage: {
        auditsPerformed: 0,
        keywordSearches: 0,
        reportsGenerated: 0,
        competitorAnalyses: 0,
      },
      limits: {
        auditsPerMonth: limits.auditsPerMonth,
        keywords: limits.keywords,
        reports: limits.reports,
        competitors: limits.competitors,
      },
      lastUpdated: now,
    };

    await setDoc(doc(this.db, "quotas", userId), {
      ...quota,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      lastUpdated: now,
    });

    return quota;
  }

  async checkUsageLimit(
    userId: string,
    usageType: UsageType
  ): Promise<UsageCheck> {
    const quota = await this.getUserQuota(userId);

    if (!quota) {
      return {
        allowed: false,
        reason: "Unable to verify usage quota",
        remaining: 0,
        limit: 0,
        remainingQuota: 0,
        resetDate: new Date(),
      };
    }

    // Check if we need to reset the quota (new month)
    const now = new Date();
    if (now > quota.currentPeriodEnd) {
      await this.resetMonthlyQuota(userId);
      return this.checkUsageLimit(userId, usageType); // Recursive call with reset quota
    }

    // Check specific usage limits
    let currentUsage: number;
    let limit: number;

    switch (usageType) {
      case "audit":
        currentUsage = quota.usage.auditsPerformed;
        limit = quota.limits.auditsPerMonth;
        break;
      case "keyword":
        currentUsage = quota.usage.keywordSearches;
        limit = quota.limits.keywords;
        break;
      case "report":
        currentUsage = quota.usage.reportsGenerated;
        limit = quota.limits.reports;
        break;
      case "competitor":
        currentUsage = quota.usage.competitorAnalyses;
        limit = quota.limits.competitors;
        break;
      default:
        return {
          allowed: false,
          reason: "Invalid usage type",
          remaining: 0,
          limit: 0,
          remainingQuota: 0,
          resetDate: quota.currentPeriodEnd,
        };
    }

    // Unlimited plans (-1 limit)
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        remainingQuota: -1,
        resetDate: quota.currentPeriodEnd,
      };
    }

    const remainingQuota = limit - currentUsage;

    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `${usageType} limit exceeded (${currentUsage}/${limit})`,
        remaining: 0,
        limit: limit,
        remainingQuota: 0,
        resetDate: quota.currentPeriodEnd,
      };
    }

    return {
      allowed: true,
      remaining: remainingQuota,
      limit: limit,
      remainingQuota,
      resetDate: quota.currentPeriodEnd,
    };
  }

  async incrementUsage(
    userId: string,
    usageType: UsageType,
    amount: number = 1
  ): Promise<boolean> {
    try {
      const usageCheck = await this.checkUsageLimit(userId, usageType);

      if (!usageCheck.allowed) {
        return false;
      }

      const usageField = this.getUsageField(usageType);

      await updateDoc(doc(this.db, "quotas", userId), {
        [`usage.${usageField}`]: increment(amount),
        lastUpdated: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }
  }

  private getUsageField(usageType: UsageType): string {
    switch (usageType) {
      case "audit":
        return "auditsPerformed";
      case "keyword":
        return "keywordSearches";
      case "report":
        return "reportsGenerated";
      case "competitor":
        return "competitorAnalyses";
      default:
        throw new Error(`Invalid usage type: ${usageType}`);
    }
  }

  async resetMonthlyQuota(userId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await updateDoc(doc(this.db, "quotas", userId), {
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      usage: {
        auditsPerformed: 0,
        keywordSearches: 0,
        reportsGenerated: 0,
        competitorAnalyses: 0,
      },
      lastUpdated: now,
    });
  }

  async updateUserPlan(
    userId: string,
    newPlan: PlanType | "free"
  ): Promise<void> {
    const limits =
      newPlan === "free" ? FREE_PLAN.limits : STRIPE_PLANS[newPlan].limits;

    await updateDoc(doc(this.db, "quotas", userId), {
      plan: newPlan,
      limits: {
        auditsPerMonth: limits.auditsPerMonth,
        keywords: limits.keywords,
        reports: limits.reports,
        competitors: limits.competitors,
      },
      lastUpdated: new Date(),
    });
  }

  async getUsageStats(userId: string) {
    const quota = await this.getUserQuota(userId);

    if (!quota) {
      return null;
    }

    const stats = {
      plan: quota.plan,
      periodStart: quota.currentPeriodStart,
      periodEnd: quota.currentPeriodEnd,
      usage: quota.usage,
      limits: quota.limits,
      percentageUsed: {
        audits:
          quota.limits.auditsPerMonth === -1
            ? 0
            : (quota.usage.auditsPerformed / quota.limits.auditsPerMonth) * 100,
        keywords:
          quota.limits.keywords === -1
            ? 0
            : (quota.usage.keywordSearches / quota.limits.keywords) * 100,
        reports:
          quota.limits.reports === -1
            ? 0
            : (quota.usage.reportsGenerated / quota.limits.reports) * 100,
        competitors:
          quota.limits.competitors === -1
            ? 0
            : (quota.usage.competitorAnalyses / quota.limits.competitors) * 100,
      },
      daysUntilReset: Math.ceil(
        (quota.currentPeriodEnd.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
      ),
    };

    return stats;
  }

  async isFeatureAvailable(userId: string, feature: string): Promise<boolean> {
    const quota = await this.getUserQuota(userId);

    if (!quota) {
      return false;
    }

    // Feature availability based on plan
    const featureMatrix = {
      free: ["basic-audit", "basic-keywords"],
      starter: [
        "basic-audit",
        "basic-keywords",
        "full-audit",
        "competitor-analysis",
        "reports",
      ],
      agency: [
        "basic-audit",
        "basic-keywords",
        "full-audit",
        "competitor-analysis",
        "reports",
        "white-label",
        "api-access",
      ],
      enterprise: [
        "basic-audit",
        "basic-keywords",
        "full-audit",
        "competitor-analysis",
        "reports",
        "white-label",
        "api-access",
      ],
    };

    const planFeatures = featureMatrix[quota.plan] || featureMatrix["free"];
    return planFeatures.includes(feature);
  }

  // Helper method for API routes
  async enforceUsageLimit(
    userId: string,
    usageType: UsageType
  ): Promise<{ success: boolean; error?: string; }> {
    const usageCheck = await this.checkUsageLimit(userId, usageType);

    if (!usageCheck.allowed) {
      return {
        success: false,
        error: usageCheck.reason || "Usage limit exceeded",
      };
    }

    const incrementSuccess = await this.incrementUsage(userId, usageType);

    if (!incrementSuccess) {
      return {
        success: false,
        error: "Failed to track usage",
      };
    }

    return { success: true };
  }
}

// Singleton instance
export const usageQuotaManager = new UsageQuotaManager();
