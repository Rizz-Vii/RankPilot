// Quota Headroom Calculation (Wave 5)
// Calculates remaining capacity across team quota limits

import { adminDb } from '@/lib/firebase-admin';

export interface QuotaHeadroomResult {
  quotaHeadroomPct: number | null;
  details: {
    totalUsed: number;
    totalLimit: number;
    usagePercentage: number;
    teamsAnalyzed: number;
  } | null;
}

/**
 * Calculate overall quota headroom percentage across all team limits
 * Returns null if no quota data available, otherwise percentage of remaining capacity
 */
export async function calculateQuotaHeadroom(): Promise<QuotaHeadroomResult> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Get team quota usage across multiple resource types
    const [crawlerUsage, auditUsage] = await Promise.all([
      // Crawler usage (existing pattern)
      adminDb.collection('teamCrawlerUsage').where('date', '==', today).limit(200).get(),
      // General team quotas 
      adminDb.collection('quotas').limit(200).get()
    ]);

    let totalUsed = 0;
    let totalLimit = 0;
    let teamsAnalyzed = 0;

    // Process crawler usage
    crawlerUsage.docs.forEach(doc => {
      const data = doc.data();
      totalUsed += data.count || 0;
      totalLimit += data.limit || 0;
      if (data.limit > 0) teamsAnalyzed++;
    });

    // Process general quota usage (audits, keywords, reports, etc.)
    auditUsage.docs.forEach(doc => {
      const data = doc.data();
      if (data.usage && data.limits) {
        // Sum up usage across different resource types
        const usage = data.usage;
        const limits = data.limits;
        
        // Only count limited resources (ignore -1 unlimited)
        if (limits.auditsPerMonth > 0) {
          totalUsed += usage.auditsPerformed || 0;
          totalLimit += limits.auditsPerMonth;
        }
        if (limits.keywords > 0) {
          totalUsed += usage.keywordSearches || 0;
          totalLimit += limits.keywords;
        }
        if (limits.reports > 0) {
          totalUsed += usage.reportsGenerated || 0;
          totalLimit += limits.reports;
        }
        if (limits.competitors > 0) {
          totalUsed += usage.competitorAnalyses || 0;
          totalLimit += limits.competitors;
        }
      }
    });

    if (totalLimit === 0) {
      return { quotaHeadroomPct: null, details: null };
    }

    const usagePercentage = (totalUsed / totalLimit) * 100;
    const quotaHeadroomPct = Math.max(0, 100 - usagePercentage);

    return {
      quotaHeadroomPct: +quotaHeadroomPct.toFixed(2),
      details: {
        totalUsed,
        totalLimit,
        usagePercentage: +usagePercentage.toFixed(2),
        teamsAnalyzed
      }
    };
  } catch (error) {
    console.error('Error calculating quota headroom:', error);
    return { quotaHeadroomPct: null, details: null };
  }
}