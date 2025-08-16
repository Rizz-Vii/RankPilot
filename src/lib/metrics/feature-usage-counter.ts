/**
 * Feature Usage Counter Service (Wave 1)
 * Tracks per-feature usage across NeuroSEO subtools, crawler, semantic map, and briefs.
 * Persists counts over a 24h sliding window.
 */

export interface FeatureUsageSnapshot {
  neuralCrawler: number;
  semanticMap: number;
  aiVisibilityEngine: number;
  trustBlock: number;
  rewriteGen: number;
  orchestrator: number;
  briefGenerator: number;
  totalFeatureUsage: number;
}

interface UsageEntry {
  timestamp: number;
  feature: keyof Omit<FeatureUsageSnapshot, 'totalFeatureUsage'>;
}

// In-memory storage with 24h sliding window
const usageEntries: UsageEntry[] = [];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Records usage of a specific NeuroSEO feature
 */
export function recordFeatureUsage(feature: keyof Omit<FeatureUsageSnapshot, 'totalFeatureUsage'>) {
  const entry: UsageEntry = {
    timestamp: Date.now(),
    feature
  };
  
  usageEntries.push(entry);
  
  // Clean up entries older than 24 hours (performance optimization)
  if (usageEntries.length > 1000) {
    cleanupOldEntries();
  }
}

/**
 * Gets current feature usage counts for the last 24 hours
 */
export function getFeatureUsageSnapshot(): FeatureUsageSnapshot {
  const cutoffTime = Date.now() - TWENTY_FOUR_HOURS_MS;
  
  // Filter entries within the last 24 hours
  const recentEntries = usageEntries.filter(entry => entry.timestamp > cutoffTime);
  
  // Count by feature
  const counts: Record<string, number> = {};
  recentEntries.forEach(entry => {
    counts[entry.feature] = (counts[entry.feature] || 0) + 1;
  });
  
  const snapshot: FeatureUsageSnapshot = {
    neuralCrawler: counts.neuralCrawler || 0,
    semanticMap: counts.semanticMap || 0,
    aiVisibilityEngine: counts.aiVisibilityEngine || 0,
    trustBlock: counts.trustBlock || 0,
    rewriteGen: counts.rewriteGen || 0,
    orchestrator: counts.orchestrator || 0,
    briefGenerator: counts.briefGenerator || 0,
    totalFeatureUsage: recentEntries.length
  };
  
  return snapshot;
}

/**
 * Clean up entries older than 24 hours
 */
function cleanupOldEntries() {
  const cutoffTime = Date.now() - TWENTY_FOUR_HOURS_MS;
  const validEntriesCount = usageEntries.findIndex(entry => entry.timestamp > cutoffTime);
  
  if (validEntriesCount > 0) {
    usageEntries.splice(0, validEntriesCount);
  }
}

/**
 * Resets all counters (primarily for testing)
 */
export function resetFeatureUsageCounters() {
  usageEntries.length = 0;
}

/**
 * Gets total entries count (for debugging/testing)
 */
export function getEntriesCount(): number {
  return usageEntries.length;
}