import { extractErrorMessage } from '@/lib/errors/extract-error-message';
import { adminDb } from "@/lib/firebase-admin";
import { handleCors } from '@/lib/http/cors';
import { withAdmin } from '@/lib/middleware/with-admin';
import { NextResponse } from "next/server";
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Local interfaces to provide structure for analysis objects (avoid explicit any)
interface ActivityRecord {
  id: string;
  type: string;
  timestamp?: unknown;
  data: Record<string, unknown>;
}

interface UserAnalysisItem {
  userId: string;
  userData: {
    email?: unknown;
    displayName?: unknown;
    subscriptionTier?: string;
    role?: string;
    plan?: string;
    planType?: string;
    createdAt?: unknown;
    lastLoginAt?: unknown;
    preferences?: unknown;
    quotas?: Record<string, number> | undefined;
    fullData: Record<string, unknown>;
  };
  tierAnalysis: {
    currentTier: string;
    hasRole: boolean;
    hasPlan: boolean;
    hasPlanType: boolean;
    hasQuotas: boolean;
    inconsistencies: string[];
    isConsistent: boolean;
  };
  collections: {
    activities: { count: number; types: string[]; recent: ActivityRecord[] };
    keywords: { count: number; sample: Array<Record<string, unknown>> };
    competitors: { count: number; domains: string[] };
    contentAnalyses: { count: number; sample: Array<Record<string, unknown>> };
    achievements: { count: number; types: string[] };
  };
}

// Expected quotas for each tier
function getExpectedQuotasForTier(tier: string): Record<string, number> {
  const quotaMap: Record<string, Record<string, number>> = {
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

export const GET = withAdmin(async (request: Request, admin) => {
  try {
    // CORS support (GET/OPTIONS)
    const cors = handleCors(request as unknown as Request, { allowMethods: ['GET', 'OPTIONS'] });
    if ((cors as unknown as { preflight?: Response }).preflight) return (cors as unknown as { preflight: Response }).preflight as unknown as NextResponse;

    const uid = admin.uid;
    console.log("🔍 Starting comprehensive user data review...", { by: uid });

    const usersSnapshot = await adminDb.collection("users").get();
    const userAnalysis: UserAnalysisItem[] = [];

    // Simple pagination over users; default small to prevent huge payloads
    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const sizeParam = parseInt(url.searchParams.get('pageSize') || '25', 10);
    const pageSize = Number.isFinite(sizeParam) ? Math.min(Math.max(sizeParam, 1), 50) : 25; // hard-cap to 50 for safety
    const light = url.searchParams.get('light') === '1'; // skip heavy subcollection scans when enabled
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
    const totalUsers = usersSnapshot.size;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalUsers);
    const pageDocs = usersSnapshot.docs.slice(start, end);

    for (const userDoc of pageDocs) {
      const userId = userDoc.id;
      const userData = userDoc.data() as Record<string, unknown>;

      // Get user's activities (lightweight: limit to 10 to avoid heavy reads)
      const activitiesCol = adminDb.collection("users").doc(userId).collection("activities");
      const activitiesSnapshot = await activitiesCol.orderBy('timestamp', 'desc').limit(light ? 3 : 10).get();
      const activities: ActivityRecord[] = activitiesSnapshot.docs.map((activityDoc) => {
        const activityData = activityDoc.data() as Record<string, unknown>;
        const typeStr = typeof activityData.type === 'string' ? activityData.type : 'unknown';
        return {
          id: activityDoc.id,
          type: typeStr,
          timestamp: activityData.timestamp,
          data: activityData,
        } as ActivityRecord;
      });

      // Get user's keywords (limit sample to reduce load)
      const keywordsSnapshot = await adminDb
        .collection("users").doc(userId).collection("keywords")
        .orderBy('createdAt', 'desc').limit(light ? 3 : 10).get();
      const keywords: Array<Record<string, unknown>> = keywordsSnapshot.docs.map((keywordDoc) => {
        const keywordData = keywordDoc.data();
        return {
          id: keywordDoc.id,
          keyword: (keywordData as Record<string, unknown>)['keyword'] || "",
          data: keywordData,
        };
      });

      // Get user's competitors (limited sample)
      const competitorsSnapshot = await adminDb
        .collection("users").doc(userId).collection("competitors")
        .orderBy('createdAt', 'desc').limit(light ? 3 : 10).get();
      const competitors: Array<Record<string, unknown>> = competitorsSnapshot.docs.map((compDoc) => {
        const compData = compDoc.data();
        return {
          id: compDoc.id,
          domain: (compData as Record<string, unknown>)['domain'] || "",
          data: compData,
        };
      });

      // Get user's content analyses (limited sample)
      const contentSnapshot = await adminDb
        .collection("users").doc(userId).collection("content-analyses")
        .orderBy('createdAt', 'desc').limit(light ? 3 : 10).get();
      const contentAnalyses: Array<Record<string, unknown>> = contentSnapshot.docs.map((contentDoc) => {
        const contentData = contentDoc.data();
        return {
          id: contentDoc.id,
          url: (contentData as Record<string, unknown>)['url'] || "",
          data: contentData,
        };
      });

      // Get user's achievements (limited sample)
      const achievementsSnapshot = await adminDb
        .collection("users").doc(userId).collection("achievements")
        .orderBy('createdAt', 'desc').limit(light ? 3 : 10).get();
      const achievements: Array<Record<string, unknown>> = achievementsSnapshot.docs.map((achDoc) => {
        const achData = achDoc.data();
        return {
          id: achDoc.id,
          type: (achData as Record<string, unknown>)['type'] || "",
          data: achData,
        };
      });

      // Analyze subscription tier consistency
    const subscriptionTier = typeof userData.subscriptionTier === 'string' && userData.subscriptionTier.length > 0
      ? userData.subscriptionTier
      : "free";
    const role = typeof userData.role === 'string' ? userData.role : undefined;
    const plan = typeof userData.plan === 'string' ? userData.plan : undefined;
    const planType = typeof userData.planType === 'string' ? userData.planType : undefined;

      // Check for tier-related inconsistencies
      const tierInconsistencies: string[] = [];

      // Check if quotas match tier expectations
      const expectedQuotas = getExpectedQuotasForTier(subscriptionTier);
    const actualQuotas = (userData && typeof userData.quotas === 'object' && userData.quotas !== null
      ? (userData.quotas as Record<string, number>)
      : ({} as Record<string, number>)
    );

      for (const quotaKey of Object.keys(expectedQuotas)) {
        const actualValue = actualQuotas[quotaKey];
        const expectedValue = expectedQuotas[quotaKey];
        if (actualValue !== expectedValue) {
          tierInconsistencies.push(
            `Quota mismatch: ${quotaKey} expected ${expectedValue}, got ${actualValue}`
          );
        }
      }

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
          subscriptionTier,
          role,
          plan,
          planType,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          preferences: userData.preferences,
          quotas: actualQuotas,
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
            domains: competitors
              .map((c) => (typeof c.domain === 'string' ? c.domain : String(c.domain ?? '')))
              .filter((d): d is string => d.length > 0),
          },
          contentAnalyses: {
            count: contentAnalyses.length,
            sample: contentAnalyses.slice(0, 3),
          },
          achievements: {
            count: achievements.length,
            types: [
              ...new Set(
                achievements.map((a) =>
                  typeof a.type === 'string' ? a.type : String(a.type ?? '')
                )
              ),
            ].filter((t): t is string => t.length > 0),
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

    const responsePayload = {
      success: true,
      summary: {
        ...summary,
        activityTypes: Array.from(summary.activityTypes),
        achievementTypes: Array.from(summary.achievementTypes),
      },
      users: userAnalysis,
      page,
      pageSize,
      total: totalUsers,
      returned: userAnalysis.length,
    };
    return NextResponse.json(responsePayload, {
      headers: {
        'X-Result-Total': String(totalUsers),
        'X-Result-Page': String(page),
        'X-Result-PageSize': String(pageSize),
        'X-Result-Returned': String(userAnalysis.length),
        ...cors.headers,
      }
    });
  } catch (error) {
    console.error("Error reviewing user data:", error);
    const errorMessage = extractErrorMessage(error) || 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}, { path: 'review-users', extraHeaders: (req) => ({ ...(handleCors(req as unknown as Request, { allowMethods: ['GET', 'OPTIONS'] }).headers || {}) }) });

export async function OPTIONS(request: Request): Promise<Response> {
  const cors = handleCors(request as unknown as Request, { allowMethods: ['GET', 'OPTIONS'] });
  if ((cors as unknown as { preflight?: Response }).preflight) return (cors as unknown as { preflight: Response }).preflight;
  return new Response(null, { status: 204, headers: cors.headers });
}
