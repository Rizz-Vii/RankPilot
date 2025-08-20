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

import { DEFAULT_ENTITLEMENTS } from './access/entitlements';

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
  // audit:ignore-orphan category=legacy-ui rationale="Superseded by consolidated NeuroSEO SERP component; retained for backward compatibility"
  serp_analysis: {
    requiredTier: "starter",
    description: "SERP analysis features",
  },

  // Agency Features
  competitor_analysis: {
    requiredTier: "agency",
    description: "Advanced competitor analysis",
  },
  // audit:ignore-orphan category=roadmap rationale="Upcoming bulk action workflow Q4"
  bulk_operations: {
    requiredTier: "agency",
    description: "Bulk operations and automation",
  },
  white_label: { requiredTier: "agency", description: "White-label reports" },
  api_access: {
    requiredTier: "agency",
    description: "API access and integrations",
  },
  // audit:ignore-orphan category=entitlement rationale="Handled via support channel role mapping; not a navigable feature"
  priority_support: {
    requiredTier: "agency",
    description: "Priority customer support",
  },

  // Enterprise Features
  custom_integrations: {
    requiredTier: "enterprise",
    description: "Custom integrations",
  },
  // audit:ignore-orphan category=entitlement rationale="Account management entitlement; no direct page"
  dedicated_support: {
    requiredTier: "enterprise",
    description: "Dedicated account manager",
  },
  // audit:ignore-orphan category=entitlement rationale="Contract / SLA metadata only"
  enterprise_sla: {
    requiredTier: "enterprise",
    description: "Enterprise SLA guarantees",
  },
  // audit:ignore-orphan category=roadmap rationale="Future advanced security center"
  advanced_security: {
    requiredTier: "enterprise",
    description: "Advanced security features",
  },

  // Admin-Only Features
  // audit:ignore-orphan category=admin rationale="Admin surface consolidated elsewhere"
  admin_panel: {
    requiresAdmin: true,
    description: "Administrative panel access",
  },
  // audit:ignore-orphan category=admin rationale="Consolidated user mgmt controls in settings"
  user_management: {
    requiresAdmin: true,
    description: "User management tools",
  },
  // audit:ignore-orphan category=admin rationale="Settings distributed; keeping key for permission checks"
  system_settings: { requiresAdmin: true, description: "System configuration" },
  // audit:ignore-orphan category=admin rationale="Internal analytics aggregation; hidden from nav"
  analytics_admin: {
    requiresAdmin: true,
    description: "System analytics and monitoring",
  },

  // Unified export capability (new consolidated key)
  // audit:ignore-orphan category=export rationale="Capability-level gate consumed indirectly; replaces export_pdf & export_csv aliases"
  export_formats: {
    requiredTier: "starter",
    description: "Unified export formats capability (PDF/CSV/Excel based on tier)",
  },

  // Integration Hub (admin-only demo)
  integration_hub: {
    requiresAdmin: true,
    requiredTier: "enterprise",
    description: "Enterprise Integration Hub (demo)",
  },


  // audit:ignore-orphan category=roadmap rationale="To be merged into analytics surfaces"
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
  // audit:ignore-orphan category=roadmap rationale="Planned advanced analytics workspace"
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
  automation_recipes: {
    requiredTier: "agency",
    description: "Scheduled AI automation recipes & digests",
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
  finance_accounting: {
    requiredTier: "agency",
    description: "Accounting snapshots: P&L, Balance Sheet, reconciliation",
  },
  // Content Briefs (agency tier)
  content_briefs: {
    requiredTier: "agency",
    description: "Content briefs dashboard & metrics",
  },
  // NeuroSEO Subtools (new granular feature keys)
  neural_crawler: {
    requiredTier: "starter",
    description: "NeuralCrawler™ intelligent content extraction",
  },
  semantic_map: {
    requiredTier: "starter",
    description: "SemanticMap™ advanced topic & semantic analysis",
  },
  trust_block: {
    requiredTier: "starter",
    description: "TrustBlock™ E-E-A-T & authenticity scoring",
  },
  ai_visibility: {
    requiredTier: "agency",
    description: "AI Visibility Engine – AI citation & platform coverage",
  },
  rewrite_gen: {
    requiredTier: "agency",
    description: "RewriteGen™ AI content rewrite & optimization",
  },
  link_view: {
    requiredTier: "agency",
    description: "Link View backlink intelligence & DA distribution",
  },
  // Dashboard-level composite views (new PR2 additions)
  sales_dashboard: {
    requiredTier: "starter",
    description: "Sales funnel & forecast overview dashboard",
  },
  finance_dashboard: {
    requiredTier: "starter",
    description: "Finance metrics & subscription economics dashboard",
  },
  marketing_dashboard: {
    requiredTier: "enterprise",
    description: "Marketing performance & growth attribution dashboard",
  },
  // Core analyzer tools newly explicit for nav-feature alignment
  content_analyzer: {
    requiredTier: "starter",
    description: "Content optimization & readability analyzer",
  },
  seo_audit: {
    requiredTier: "starter",
    description: "Technical SEO audit engine",
  },
} as const;

// =============================================================================
// ENTITLEMENT FLAGS (Phase 2 externalization)
// Imported after FEATURE_ACCESS to preserve legacy ordering; not part of FEATURE_ACCESS
// because they represent subscription metadata entitlements, not navigable features.
// Entitlement metadata now resolved via dedicated helper (Phase 2 refactor)

// Track entitlement keys we've already warned about to avoid console spam
const _warnedEntitlements = new Set<string>();

// =============================================================================
// FEATURE ALIASES (legacy -> canonical)
// =============================================================================
export const FEATURE_ALIASES: Record<string, string> = {
  // Legacy / umbrella keys (RETIRING: aliases removed T17). Remaining minimal transitional mapping (remove next release if unused):
  ai_insights: "advanced_analytics",
};


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
  // Resolve alias chain (max depth safeguard)
  let resolved = featureName;
  const visited = new Set<string>();
  while (FEATURE_ALIASES[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = FEATURE_ALIASES[resolved];
  }

  // Phase 2: Entitlements no longer resolved via canAccessFeature.
  // If callers pass an entitlement key here, warn for migration to canAccessEntitlement.
  if (Object.prototype.hasOwnProperty.call(DEFAULT_ENTITLEMENTS, resolved)) {
    // Warn only once per entitlement key to reduce noise while legacy callers migrate
    if (!_warnedEntitlements.has(resolved)) {
      console.warn(
        `Entitlement key '${resolved}' passed to canAccessFeature(). Use canAccessEntitlement(userAccess, key) instead.`
      );
      _warnedEntitlements.add(resolved);
    }
    return false; // do not grant access implicitly
  }

  const feature = FEATURE_ACCESS[resolved];
  if (!feature) {
    console.warn(`Unknown feature: ${featureName} (resolved: ${resolved})`);
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
  _userTier: SubscriptionTier,
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
export function validateUserAccess(userAccess: unknown): userAccess is UserAccess {
  if (!userAccess || typeof userAccess !== 'object') return false;
  const ua = userAccess as Partial<UserAccess>;
  return (
    typeof ua.role === 'string' && ["admin", "user"].includes(ua.role) &&
    typeof ua.tier === 'string' && (TIER_HIERARCHY as string[]).includes(ua.tier) &&
    typeof ua.status === 'string' && ["active", "canceled", "past_due", "free"].includes(ua.status)
  );
}

/**
 * Normalize user data from database
 */
export function normalizeUserAccess(dbUser: any): UserAccess {
  // Handle admin tier mapping - admin tier gets enterprise features with admin role
  let mappedTier: SubscriptionTier;
  let mappedRole: UserRole;

  if (dbUser?.subscriptionTier === "admin" || dbUser?.tier === "admin") {
    mappedTier = "enterprise"; // Admin gets enterprise-level features
    mappedRole = "admin"; // But with admin role for special permissions
  } else {
    mappedRole = (dbUser?.role === "admin" ? "admin" : "user") as UserRole;
    mappedTier = (TIER_HIERARCHY.includes(dbUser?.subscriptionTier)
      ? dbUser.subscriptionTier
      : "free") as SubscriptionTier;
  }

  return {
    role: mappedRole,
    tier: mappedTier,
    status: dbUser?.subscriptionStatus || "free",
  };
}

// =============================================================================
// TEAM-01: Effective tier (team plan overrides individual if higher)
// =============================================================================
export function computeEffectiveTier(userTier: SubscriptionTier, teamPlanTier?: SubscriptionTier): SubscriptionTier {
  if (!teamPlanTier) return userTier;
  return TIER_LEVELS[teamPlanTier] > TIER_LEVELS[userTier] ? teamPlanTier : userTier;
}

// =============================================================================
// ENTITLEMENTS (Plan metadata) – dedicated access helper
// =============================================================================
export function canAccessEntitlement(
  userAccess: UserAccess,
  entitlementKey: string
): boolean {
  const ent = (DEFAULT_ENTITLEMENTS as Record<string, { minimumTier: SubscriptionTier }>)[entitlementKey];
  if (!ent) return false;
  return canAccessTier(userAccess.tier, ent.minimumTier as SubscriptionTier);
}

// =============================================================================
// Bridged capability helper (feature OR entitlement) – migration aid
// Prefer explicit canAccessFeature / canAccessEntitlement in new code; this
// suppresses entitlement warnings by routing directly when a key matches.
// =============================================================================
export function canAccessCapability(userAccess: UserAccess, key: string): boolean {
  if (Object.prototype.hasOwnProperty.call(DEFAULT_ENTITLEMENTS, key)) {
    return canAccessEntitlement(userAccess, key);
  }
  return canAccessFeature(userAccess, key);
}

export function listEntitlementsForTier(tier: SubscriptionTier): string[] {
  return Object.entries(DEFAULT_ENTITLEMENTS)
    .filter(([_, def]) => canAccessTier(tier, def.minimumTier))
    .map(([k]) => k);
}
