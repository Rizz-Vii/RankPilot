/**
 * Team Quota System - Track and enforce team-wide usage limits
 * Wave 2: Design Quota Document & Enforcement Guard
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export interface TeamQuotaDocument {
  teamId: string;
  date: string; // YYYY-MM-DD for 24h rolling window
  quotas: {
    crawlerRuns24h: { used: number; limit: number; };
    seoAnalyses24h: { used: number; limit: number; };
    neuroseoAnalyses24h: { used: number; limit: number; };
    reportGenerations24h: { used: number; limit: number; };
  };
  updatedAt: FirebaseFirestore.Timestamp;
  rejections?: { [quotaType: string]: number }; // track rejections per quota type
}

export interface QuotaCheckResult {
  allowed: boolean;
  quotaType: string;
  used: number;
  limit: number;
  remaining: number;
  rejections?: number;
}

export interface TeamQuotaStats {
  teamId: string;
  date: string;
  quotas: TeamQuotaDocument['quotas'];
  headroom: { [quotaType: string]: number }; // percentage remaining (0-100)
  totalRejections: number;
}

export type QuotaType = 'crawlerRuns24h' | 'seoAnalyses24h' | 'neuroseoAnalyses24h' | 'reportGenerations24h';

// Default limits per plan - aligned with existing patterns
const TEAM_QUOTA_LIMITS: Record<string, Record<QuotaType, number>> = {
  free: {
    crawlerRuns24h: 10,
    seoAnalyses24h: 5,
    neuroseoAnalyses24h: 3,
    reportGenerations24h: 2,
  },
  starter: {
    crawlerRuns24h: 50,
    seoAnalyses24h: 25,
    neuroseoAnalyses24h: 15,
    reportGenerations24h: 10,
  },
  agency: {
    crawlerRuns24h: 200,
    seoAnalyses24h: 100,
    neuroseoAnalyses24h: 60,
    reportGenerations24h: 40,
  },
  enterprise: {
    crawlerRuns24h: 500,
    seoAnalyses24h: 250,
    neuroseoAnalyses24h: 150,
    reportGenerations24h: 100,
  },
  admin: {
    crawlerRuns24h: 1000,
    seoAnalyses24h: 500,
    neuroseoAnalyses24h: 300,
    reportGenerations24h: 200,
  },
  default: {
    crawlerRuns24h: 20,
    seoAnalyses24h: 10,
    neuroseoAnalyses24h: 6,
    reportGenerations24h: 4,
  },
};

function getTeamQuotaLimits(plan?: string): Record<QuotaType, number> {
  if (!plan) return TEAM_QUOTA_LIMITS.default;
  return TEAM_QUOTA_LIMITS[plan as keyof typeof TEAM_QUOTA_LIMITS] ?? TEAM_QUOTA_LIMITS.default;
}

/**
 * Enforce team quota with concurrency-safe Firestore transaction
 * Returns quota info on success, throws HttpsError on limit exceeded
 */
export async function enforceTeamQuota(
  teamId: string, 
  quotaType: QuotaType, 
  plan?: string,
  debugLimit?: number
): Promise<QuotaCheckResult> {
  if (!teamId) {
    throw new Error('Team ID is required for quota enforcement');
  }

  const today = new Date().toISOString().slice(0, 10);
  const limits = getTeamQuotaLimits(plan);
  const limit = (debugLimit && (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production')) 
    ? debugLimit 
    : limits[quotaType];

  const docId = `${teamId}_${today}`;
  const docRef = adminDb.collection('teamQuotas').doc(docId);

  let result: QuotaCheckResult | null = null;

  await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    
    let quotaDoc: TeamQuotaDocument;
    
    if (doc.exists) {
      quotaDoc = doc.data() as TeamQuotaDocument;
    } else {
      // Initialize new quota document
      quotaDoc = {
        teamId,
        date: today,
        quotas: {
          crawlerRuns24h: { used: 0, limit: limits.crawlerRuns24h },
          seoAnalyses24h: { used: 0, limit: limits.seoAnalyses24h },
          neuroseoAnalyses24h: { used: 0, limit: limits.neuroseoAnalyses24h },
          reportGenerations24h: { used: 0, limit: limits.reportGenerations24h },
        },
        updatedAt: FieldValue.serverTimestamp() as any,
        rejections: {},
      };
    }

    const currentQuota = quotaDoc.quotas[quotaType];
    const currentUsed = currentQuota?.used || 0;
    const currentRejections = quotaDoc.rejections?.[quotaType] || 0;

    // Check if quota is exceeded
    if (currentUsed >= limit) {
      // Record rejection
      const updatedRejections = { ...quotaDoc.rejections };
      updatedRejections[quotaType] = currentRejections + 1;
      
      transaction.set(docRef, {
        ...quotaDoc,
        rejections: updatedRejections,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      const error = new Error(`Team ${quotaType} quota exceeded: ${currentUsed}/${limit}`);
      (error as any).code = 'resource-exhausted';
      (error as any).httpStatus = 429;
      throw error;
    }

    // Increment usage
    const updatedQuotas = { ...quotaDoc.quotas };
    updatedQuotas[quotaType] = { 
      used: currentUsed + 1, 
      limit: limit 
    };

    transaction.set(docRef, {
      ...quotaDoc,
      quotas: updatedQuotas,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    result = {
      allowed: true,
      quotaType,
      used: currentUsed + 1,
      limit,
      remaining: Math.max(0, limit - (currentUsed + 1)),
      rejections: currentRejections,
    };
  });

  if (!result) {
    throw new Error('Transaction failed to produce result');
  }

  return result;
}

/**
 * Check team quota without incrementing (read-only)
 */
export async function checkTeamQuota(
  teamId: string, 
  quotaType: QuotaType, 
  plan?: string
): Promise<QuotaCheckResult> {
  if (!teamId) {
    return {
      allowed: false,
      quotaType,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const limits = getTeamQuotaLimits(plan);
  const limit = limits[quotaType];

  const docId = `${teamId}_${today}`;
  const docRef = adminDb.collection('teamQuotas').doc(docId);

  try {
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return {
        allowed: true,
        quotaType,
        used: 0,
        limit,
        remaining: limit,
      };
    }

    const quotaDoc = doc.data() as TeamQuotaDocument;
    const currentQuota = quotaDoc.quotas[quotaType];
    const used = currentQuota?.used || 0;
    const remaining = Math.max(0, limit - used);

    return {
      allowed: used < limit,
      quotaType,
      used,
      limit,
      remaining,
      rejections: quotaDoc.rejections?.[quotaType] || 0,
    };
  } catch (error) {
    console.error('Error checking team quota:', error);
    return {
      allowed: false,
      quotaType,
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }
}

/**
 * Get comprehensive team quota statistics
 */
export async function getTeamQuotaStats(teamId: string, plan?: string): Promise<TeamQuotaStats | null> {
  if (!teamId) return null;

  const today = new Date().toISOString().slice(0, 10);
  const docId = `${teamId}_${today}`;
  const docRef = adminDb.collection('teamQuotas').doc(docId);

  try {
    const doc = await docRef.get();
    const limits = getTeamQuotaLimits(plan);

    if (!doc.exists) {
      // Return default stats if no usage yet
      const defaultQuotas = {
        crawlerRuns24h: { used: 0, limit: limits.crawlerRuns24h },
        seoAnalyses24h: { used: 0, limit: limits.seoAnalyses24h },
        neuroseoAnalyses24h: { used: 0, limit: limits.neuroseoAnalyses24h },
        reportGenerations24h: { used: 0, limit: limits.reportGenerations24h },
      };

      return {
        teamId,
        date: today,
        quotas: defaultQuotas,
        headroom: {
          crawlerRuns24h: 100,
          seoAnalyses24h: 100,
          neuroseoAnalyses24h: 100,
          reportGenerations24h: 100,
        },
        totalRejections: 0,
      };
    }

    const quotaDoc = doc.data() as TeamQuotaDocument;
    const headroom: { [quotaType: string]: number } = {};
    let totalRejections = 0;

    // Calculate headroom percentages
    Object.entries(quotaDoc.quotas).forEach(([type, quota]) => {
      if (quota.limit > 0) {
        headroom[type] = Math.round(((quota.limit - quota.used) / quota.limit) * 100);
      } else {
        headroom[type] = 100; // Unlimited
      }
    });

    // Sum total rejections
    if (quotaDoc.rejections) {
      totalRejections = Object.values(quotaDoc.rejections).reduce((sum, val) => sum + val, 0);
    }

    return {
      teamId,
      date: today,
      quotas: quotaDoc.quotas,
      headroom,
      totalRejections,
    };
  } catch (error) {
    console.error('Error getting team quota stats:', error);
    return null;
  }
}

/**
 * Get quota headroom percentage for a specific quota type
 */
export async function getQuotaHeadroomPercentage(
  teamId: string, 
  quotaType: QuotaType, 
  plan?: string
): Promise<number> {
  const result = await checkTeamQuota(teamId, quotaType, plan);
  
  if (result.limit <= 0) return 100; // Unlimited
  return Math.round((result.remaining / result.limit) * 100);
}