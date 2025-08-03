import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/index";
import { collection, getDocs } from "firebase/firestore";

// Expected quotas for each tier
function getExpectedQuotasForTier(tier: string) {
  const quotaMap: Record<string, any> = {
    free: { monthlyAnalyses: 3, keywordTracking: 10, competitorTracking: 3 },
    starter: {
      monthlyAnalyses: 20,
      keywordTracking: 50,
      competitorTracking: 10,
    },
    agency: {
      monthlyAnalyses: 100,
      keywordTracking: 200,
      competitorTracking: 25,
    },
    enterprise: {
      monthlyAnalyses: 500,
      keywordTracking: 1000,
      competitorTracking: 100,
    },
    admin: { monthlyAnalyses: -1, keywordTracking: -1, competitorTracking: -1 }, // unlimited
  };
  return quotaMap[tier] || quotaMap.free;
}

export async function GET() {
  try {
    console.log("🔍 Starting comprehensive user data review...");

    const usersSnapshot = await getDocs(collection(db, "users"));
    const userAnalysis = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Get user's activities
      const activitiesSnapshot = await getDocs(
        collection(db, "users", userId, "activities")
      );
      const activities = [];

      for (const activityDoc of activitiesSnapshot.docs) {
        const activityData = activityDoc.data();
        activities.push({
          id: activityDoc.id,
          type: activityData.type || "unknown",
          timestamp: activityData.timestamp,
          _data: activityData,
        });
      }

      // Get user's keywords
      const keywordsSnapshot = await getDocs(
        collection(db, "users", userId, "keywords")
      );
      const keywords = [];

      for (const keywordDoc of keywordsSnapshot.docs) {
        const keywordData = keywordDoc.data();
        keywords.push({
          id: keywordDoc.id,
          keyword: keywordData.keyword || "",
          _data: keywordData,
        });
      }

      // Get user's competitors
      const competitorsSnapshot = await getDocs(
        collection(db, "users", userId, "competitors")
      );
      const competitors = [];

      for (const compDoc of competitorsSnapshot.docs) {
        const compData = compDoc.data();
        competitors.push({
          id: compDoc.id,
          domain: compData.domain || "",
          _data: compData,
        });
      }

      // Get user's content analyses
      const contentSnapshot = await getDocs(
        collection(db, "users", userId, "content-analyses")
      );
      const contentAnalyses = [];

      for (const contentDoc of contentSnapshot.docs) {
        const contentData = contentDoc.data();
        contentAnalyses.push({
          id: contentDoc.id,
          url: contentData.url || "",
          _data: contentData,
        });
      }

      // Get user's achievements
      const achievementsSnapshot = await getDocs(
        collection(db, "users", userId, "achievements")
      );
      const achievements = [];

      for (const achDoc of achievementsSnapshot.docs) {
        const achData = achDoc.data();
        achievements.push({
          id: achDoc.id,
          type: achData.type || "",
          _data: achData,
        });
      }

      // Analyze subscription tier consistency
      const subscriptionTier = userData.subscriptionTier || "free";
      const role = userData.role;
      const plan = userData.plan;
      const planType = userData.planType;

      // Check for tier-related inconsistencies
      const tierInconsistencies = [];

      // Check if quotas match tier expectations
      const expectedQuotas = getExpectedQuotasForTier(subscriptionTier);
      const actualQuotas = userData.quotas || {};

      Object.keys(expectedQuotas).forEach((quotaKey) => {
        const actualValue = actualQuotas[quotaKey as keyof typeof actualQuotas];
        const expectedValue =
          expectedQuotas[quotaKey as keyof typeof expectedQuotas];
        if (actualValue !== expectedValue) {
          tierInconsistencies.push(
            `Quota mismatch: ${quotaKey} expected ${expectedValue}, got ${actualValue}`
          );
        }
      });

      // Check for conflicting tier/role/plan values
      if (role && role !== subscriptionTier) {
        tierInconsistencies.push(
          `Role (${role}) doesn't match subscriptionTier (${subscriptionTier})`
        );
      }

      if (plan && plan !== subscriptionTier) {
        tierInconsistencies.push(
          `Plan (${plan}) doesn't match subscriptionTier (${subscriptionTier})`
        );
      }

      if (planType && planType !== subscriptionTier) {
        tierInconsistencies.push(
          `PlanType (${planType}) doesn't match subscriptionTier (${subscriptionTier})`
        );
      }

      userAnalysis.push({
        userId,
        userData: {
          email: userData.email,
          displayName: userData.displayName,
          subscriptionTier: userData.subscriptionTier,
          role: userData.role,
          plan: userData.plan,
          planType: userData.planType,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          preferences: userData.preferences,
          quotas: userData.quotas,
          // Full user data for analysis
          fullData: userData,
        },
        tierAnalysis: {
          currentTier: subscriptionTier,
          hasRole: !!role,
          hasPlan: !!plan,
          hasPlanType: !!planType,
          hasQuotas: !!userData.quotas,
          inconsistencies: tierInconsistencies,
          isConsistent: tierInconsistencies.length === 0,
        },
        collections: {
          activities: {
            count: activities.length,
            types: [...new Set(activities.map((a) => a.type))],
            recent: activities.slice(-3),
          },
          keywords: {
            count: keywords.length,
            sample: keywords.slice(0, 3),
          },
          competitors: {
            count: competitors.length,
            domains: competitors.map((c) => c.domain),
          },
          contentAnalyses: {
            count: contentAnalyses.length,
            sample: contentAnalyses.slice(0, 3),
          },
          achievements: {
            count: achievements.length,
            types: [...new Set(achievements.map((a) => a.type))],
          },
        },
      });
    }

    // Generate summary statistics
    const summary = {
      totalUsers: userAnalysis.length,
      subscriptionTiers: {} as Record<string, number>,
      tierConsistency: {
        consistent: 0,
        inconsistent: 0,
        commonIssues: {} as Record<string, number>,
      },
      roleAnalysis: {
        usersWithRole: 0,
        usersWithPlan: 0,
        usersWithPlanType: 0,
        usersWithQuotas: 0,
      },
      totalActivities: 0,
      activityTypes: new Set<string>(),
      totalKeywords: 0,
      totalCompetitors: 0,
      totalContentAnalyses: 0,
      totalAchievements: 0,
      achievementTypes: new Set<string>(),
    };

    userAnalysis.forEach((user) => {
      // Count subscription tiers
      const tier = user.userData.subscriptionTier || "free";
      summary.subscriptionTiers[tier] =
        (summary.subscriptionTiers[tier] || 0) + 1;

      // Analyze tier consistency
      if (user.tierAnalysis.isConsistent) {
        summary.tierConsistency.consistent++;
      } else {
        summary.tierConsistency.inconsistent++;
        user.tierAnalysis.inconsistencies.forEach((issue) => {
          summary.tierConsistency.commonIssues[issue] =
            (summary.tierConsistency.commonIssues[issue] || 0) + 1;
        });
      }

      // Role analysis
      if (user.tierAnalysis.hasRole) summary.roleAnalysis.usersWithRole++;
      if (user.tierAnalysis.hasPlan) summary.roleAnalysis.usersWithPlan++;
      if (user.tierAnalysis.hasPlanType)
        summary.roleAnalysis.usersWithPlanType++;
      if (user.tierAnalysis.hasQuotas) summary.roleAnalysis.usersWithQuotas++;

      // Count activities
      summary.totalActivities += user.collections.activities.count;
      user.collections.activities.types.forEach((type) =>
        summary.activityTypes.add(type)
      );

      // Count other collections
      summary.totalKeywords += user.collections.keywords.count;
      summary.totalCompetitors += user.collections.competitors.count;
      summary.totalContentAnalyses += user.collections.contentAnalyses.count;
      summary.totalAchievements += user.collections.achievements.count;
      user.collections.achievements.types.forEach((type) =>
        summary.achievementTypes.add(type)
      );
    });

    return NextResponse.json({
      success: true,
      summary: {
        ...summary,
        activityTypes: Array.from(summary.activityTypes),
        achievementTypes: Array.from(summary.achievementTypes),
      },
      users: userAnalysis,
    });
  } catch (error) {
    console.error("Error reviewing user _data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        _error: errorMessage,
      },
      { status: 500 }
    );
  }
}
