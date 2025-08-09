/**
 * Unified Access Control System for RankPilot
 *
 * This module provides a centralized, consistent system for managing:
 * - User roles (system permissions: admin vs user)
 * - Subscription tiers (feature access: free, starter, agency, enterprise)
 * - Feature access control across the entire application
 *
 * Last Updated: July 21, 2025
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** System roles for permission control */
export type UserRole = "admin" | "user";

/** Subscription tiers for feature access */
export type SubscriptionTier = "free" | "starter" | "agency" | "enterprise";

/** Combined user access information */
export interface UserAccess {
  role: UserRole;
  tier: SubscriptionTier;
  status: "active" | "canceled" | "past_due" | "free";
}

/** Feature access configuration */
export interface FeatureConfig {
  requiredTier?: SubscriptionTier;
  requiresAdmin?: boolean;
  description: string;
}

// =============================================================================
// TIER HIERARCHY & LIMITS
// =============================================================================

/** Tier hierarchy for access control (lower index = lower tier) */
export const TIER_HIERARCHY: SubscriptionTier[] = [
  "free",
  "starter",
  "agency",
  "enterprise",
];

/** Tier level mapping for quick comparisons */
export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  agency: 2,
  enterprise: 3,
} as const;

/** Plan limits for each tier */
export const TIER_LIMITS = {
  free: {
    auditsPerMonth: 5,
    keywords: 10,
    reports: 3,
    competitors: 1,
    apiAccess: false,
    whiteLabel: false,
    prioritySupport: false,
    teamMembers: 1,
    exportFormats: ["pdf"],
  },
  starter: {
    auditsPerMonth: 50,
    keywords: 100,
    reports: 25,
    competitors: 5,
    apiAccess: false,
    whiteLabel: false,
    prioritySupport: false,
    teamMembers: 3,
    exportFormats: ["pdf", "csv"],
  },
  agency: {
    auditsPerMonth: -1, // unlimited
    keywords: -1,
    reports: -1,
    competitors: -1,
    apiAccess: true,
    whiteLabel: true,
    prioritySupport: true,
    teamMembers: 10,
    exportFormats: ["pdf", "csv", "excel"],
  },
  enterprise: {
    auditsPerMonth: -1, // unlimited
    keywords: -1,
    reports: -1,
    competitors: -1,
    apiAccess: true,
    whiteLabel: true,
    prioritySupport: true,
    teamMembers: -1, // unlimited
    exportFormats: ["pdf", "csv", "excel", "json"],
  },
} as const;

// =============================================================================
// FEATURE ACCESS CONFIGURATION
// =============================================================================

/** Centralized feature access control */
export const FEATURE_ACCESS: Record<string, FeatureConfig> = {
  // Dashboard & Basic Features
  dashboard: { description: "Access to main dashboard" },
  keyword_analysis: { description: "Basic keyword analysis" },

  // Starter Features
  link_analysis: {
    requiredTier: "starter",
    description: "Link analysis tools",
  },
  serp_analysis: {
    requiredTier: "starter",
    description: "SERP analysis features",
  },
  performance_metrics: {
    requiredTier: "starter",
    description: "Performance tracking",
  },
  export_pdf: { requiredTier: "starter", description: "PDF export capability" },

  // Agency Features
  competitor_analysis: {
    requiredTier: "agency",
    description: "Advanced competitor analysis",
  },
  bulk_operations: {
    requiredTier: "agency",
    description: "Bulk operations and automation",
  },
  white_label: { requiredTier: "agency", description: "White-label reports" },
  api_access: {
    requiredTier: "agency",
    description: "API access and integrations",
  },
  priority_support: {
    requiredTier: "agency",
    description: "Priority customer support",
  },
  export_csv: { requiredTier: "agency", description: "CSV export capability" },

  // Enterprise Features
  custom_integrations: {
    requiredTier: "enterprise",
    description: "Custom integrations",
  },
  dedicated_support: {
    requiredTier: "enterprise",
    description: "Dedicated account manager",
  },
  enterprise_sla: {
    requiredTier: "enterprise",
    description: "Enterprise SLA guarantees",
  },
  advanced_security: {
    requiredTier: "enterprise",
    description: "Advanced security features",
  },

  // Admin-Only Features
  admin_panel: {
    requiresAdmin: true,
    description: "Administrative panel access",
  },
  user_management: {
    requiresAdmin: true,
    description: "User management tools",
  },
  system_settings: { requiresAdmin: true, description: "System configuration" },
  analytics_admin: {
    requiresAdmin: true,
    description: "System analytics and monitoring",
  },

  // CRITICAL MISSING FEATURES - Fix for "Unknown feature" errors
  neuroseo: {
    requiredTier: "starter",
    description: "NeuroSEO™ AI-powered SEO optimization and analysis",
  },

  ai_content_generation: {
    requiredTier: "agency",
    description: "AI-powered content generation",
  },

  ai_insights: {
    requiredTier: "starter",
    description: "AI-driven SEO insights and recommendations",
  },

  // Team Management Features - CHANGED from enterprise to agency
  team_management: {
    requiredTier: "agency", // Changed from "enterprise" to make it more accessible
    description: "Team member management and collaboration",
  },

  // Additional missing features identified in codebase
  advanced_analytics: {
    requiredTier: "enterprise",
    description: "Advanced analytics and reporting",
  },
  // Marketing (enterprise)
  marketing_email_campaigns: {
    requiredTier: "enterprise",
    description: "Enterprise AI-driven email campaign automation",
  },
  marketing_lead_generation: {
    requiredTier: "enterprise",
    description: "Automated AI lead capture & enrichment",
  },
  marketing_social_presence: {
    requiredTier: "enterprise",
    description: "Multi-channel social scheduling & optimization",
  },
  marketing_content_generation: {
    requiredTier: "enterprise",
    description: "Cross-format marketing asset generation",
  },
  // Sales (progressive)
  sales_pipeline: {
    requiredTier: "starter",
    description: "Sales pipeline visibility & velocity metrics",
  },
  sales_deals: {
    requiredTier: "agency",
    description: "Deal management & forecasting",
  },
  sales_outreach: {
    requiredTier: "agency",
    description: "AI-assisted outbound sequencing",
  },
  // Finance (progressive)
  finance_billing_overview: {
    requiredTier: "starter",
    description: "Billing overview & quota tracking",
  },
  finance_invoices: {
    requiredTier: "starter",
    description: "Historical invoices & receipts",
  },
  finance_revenue_analytics: {
    requiredTier: "agency",
    description: "Revenue, churn & LTV analytics",
  },
} as const;

// =============================================================================
// ACCESS CONTROL FUNCTIONS
// =============================================================================

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(
  userAccess: UserAccess,
  featureName: string
): boolean {
  const feature = FEATURE_ACCESS[featureName];
  if (!feature) {
    console.warn(`Unknown feature: ${featureName}`);
    return false;
  }

  // Check admin requirement
  if (feature.requiresAdmin && userAccess.role !== "admin") {
    return false;
  }

  // Check tier requirement
  if (feature.requiredTier) {
    return canAccessTier(userAccess.tier, feature.requiredTier);
  }

  return true;
}

/**
 * Check if user tier meets or exceeds required tier
 */
export function canAccessTier(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Get user's plan limits
 */
export function getUserLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}

/**
 * Check if user is at or over usage limit
 */
export function isAtUsageLimit(
  tier: SubscriptionTier,
  usageType: keyof typeof TIER_LIMITS.free,
  currentUsage: number
): boolean {
  const limits = TIER_LIMITS[tier];
  const limit = limits[usageType];

  // -1 means unlimited
  if (limit === -1) return false;

  return typeof limit === "number" && currentUsage >= limit;
}

/**
 * Get remaining usage for a specific limit
 */
export function getRemainingUsage(
  tier: SubscriptionTier,
  usageType: keyof typeof TIER_LIMITS.free,
  currentUsage: number
): number {
  const limits = TIER_LIMITS[tier];
  const limit = limits[usageType];

  // -1 means unlimited
  if (limit === -1) return -1;

  return typeof limit === "number" ? Math.max(0, limit - currentUsage) : 0;
}

/**
 * Get all accessible features for a user
 */
export function getAccessibleFeatures(userAccess: UserAccess): string[] {
  return Object.keys(FEATURE_ACCESS).filter((feature) =>
    canAccessFeature(userAccess, feature)
  );
}

/**
 * Get features available at a specific tier
 */
export function getFeaturesForTier(tier: SubscriptionTier): string[] {
  return Object.entries(FEATURE_ACCESS)
    .filter(([_, config]) => {
      if (config.requiresAdmin) return false;
      if (!config.requiredTier) return true;
      return canAccessTier(tier, config.requiredTier);
    })
    .map(([feature, _]) => feature);
}

/**
 * Get upgrade message for restricted features
 */
export function getUpgradeMessage(
  userTier: SubscriptionTier,
  featureName: string
): string {
  const feature = FEATURE_ACCESS[featureName];
  if (!feature) return "Feature not found";

  if (feature.requiresAdmin) {
    return "This feature requires administrator privileges";
  }

  if (feature.requiredTier) {
    const requiredTierName =
      feature.requiredTier.charAt(0).toUpperCase() +
      feature.requiredTier.slice(1);
    return `Upgrade to ${requiredTierName} plan to access ${feature.description}`;
  }

  return "Feature access restricted";
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate user access object
 */
export function validateUserAccess(userAccess: any): userAccess is UserAccess {
  return (
    userAccess &&
    typeof userAccess.role === "string" &&
    ["admin", "user"].includes(userAccess.role) &&
    typeof userAccess.tier === "string" &&
    TIER_HIERARCHY.includes(userAccess.tier) &&
    typeof userAccess.status === "string" &&
    ["active", "canceled", "past_due", "free"].includes(userAccess.status)
  );
}

/**
 * Normalize user data from database
 */
export function normalizeUserAccess(dbUser: any): UserAccess {
  // Handle admin tier mapping - admin tier gets enterprise features with admin role
  let mappedTier: SubscriptionTier;
  let mappedRole: UserRole;

  if (dbUser.subscriptionTier === "admin" || dbUser.tier === "admin") {
    mappedTier = "enterprise"; // Admin gets enterprise-level features
    mappedRole = "admin"; // But with admin role for special permissions
  } else {
    mappedRole = (dbUser.role === "admin" ? "admin" : "user") as UserRole;
    mappedTier = (TIER_HIERARCHY.includes(dbUser.subscriptionTier)
      ? dbUser.subscriptionTier
      : "free") as SubscriptionTier;
  }

  return {
    role: mappedRole,
    tier: mappedTier,
    status: dbUser.subscriptionStatus || "free",
  };
}
