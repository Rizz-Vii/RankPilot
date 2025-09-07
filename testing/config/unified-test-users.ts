/**
 * Unified Test User Configuration - Resolves Authentication Conflicts
 *
 * Single source of truth for all test users across the application.
 * Eliminates mismatches between enhanced-auth.ts, create-auth-users.ts,
 * and user-subscription-sync.ts configurations.
 *
 * Generated: July 26, 2025
 * Integration: All testing utilities, Playwright configs, Firebase setup
 */

export type UserTier = "free" | "starter" | "agency" | "enterprise" | "admin";

export interface UnifiedTestUser {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  tier: UserTier;
  role: "user" | "admin";
  subscriptionStatus: "free" | "active" | "canceled" | "past_due";
  // Enhanced tracking fields for our database indexes
  expectedQuotas: {
    monthlyAnalyses: number;
    keywordTracking: number;
    competitorTracking: number;
  };
}

/**
 * UNIFIED TEST USERS - Single Source of Truth
 * FIXED: Now matches test.config.ts email addresses exactly
 * These users will be created in Firebase Auth and have corresponding Firestore documents
 */
export const UNIFIED_TEST_USERS: Record<UserTier, UnifiedTestUser> = {
  free: {
    uid: "vGZSfZA7yPOOCgUGtAS2ywvwP8l1",
    email: "abbas_ali_rizvi@hotmail.com",
    password: "123456",
    displayName: "Abbas Ali (Free)",
    tier: "free",
    role: "user",
    subscriptionStatus: "free",
    expectedQuotas: {
      monthlyAnalyses: 5,
      keywordTracking: 10,
      competitorTracking: 3,
    },
  },
  starter: {
    uid: "Y0hv244mtsYk4dwsxBCS1xBOhab2",
    email: "starter@rankpilot.com",
    password: "starter123",
    displayName: "Starter User",
    tier: "starter",
    role: "user",
    subscriptionStatus: "active",
    expectedQuotas: {
      monthlyAnalyses: 50,
      keywordTracking: 100,
      competitorTracking: 10,
    },
  },
  agency: {
    uid: "test_agency_user",
    email: "agency@rankpilot.com",
    password: "agency123",
    displayName: "Agency User",
    tier: "agency",
    role: "user",
    subscriptionStatus: "active",
    expectedQuotas: {
      monthlyAnalyses: 200,
      keywordTracking: 500,
      competitorTracking: 25,
    },
  },
  enterprise: {
    uid: "m7nbs1tNrxYIlaclebE5sKI6ok53",
    email: "enterprise@rankpilot.com",
    password: "enterprise123",
    displayName: "Enterprise User",
    tier: "enterprise",
    role: "user",
    subscriptionStatus: "active",
    expectedQuotas: {
      monthlyAnalyses: 1000,
      keywordTracking: 2000,
      competitorTracking: 100,
    },
  },
  admin: {
    uid: "UFGrzIf2N3UTPd5Xz7vT8tMZpHJ3",
    email: "admin@rankpilot.com",
    password: "admin123",
    displayName: "Admin User",
    tier: "admin",
    role: "admin",
    subscriptionStatus: "active",
    expectedQuotas: {
      monthlyAnalyses: 999999,
      keywordTracking: 999999,
      competitorTracking: 999999,
    },
  },
};

/**
 * Development user for local testing (maintains compatibility)
 * FIXED: Now uses abbas_ali_rizvi@hotmail.com to match test.config.ts
 */
export const DEV_USER: UnifiedTestUser = {
  uid: "vGZSfZA7yPOOCgUGtAS2ywvwP8l1",
  email: "abbas_ali_rizvi@hotmail.com",
  password: "123456",
  displayName: "Abbas (Dev)",
  tier: "free",
  role: "admin", // Dev user gets admin access
  subscriptionStatus: "free",
  expectedQuotas: {
    monthlyAnalyses: -1, // unlimited for dev
    keywordTracking: -1,
    competitorTracking: -1,
  },
};

/**
 * All test users array for batch operations
 */
export const ALL_TEST_USERS = Object.values(UNIFIED_TEST_USERS);

/**
 * User resolver function for backward compatibility
 */
export function resolveTestUser(
  input: UserTier | UnifiedTestUser | undefined
): UnifiedTestUser {
  if (!input) return DEV_USER;
  if (typeof input === "string") return UNIFIED_TEST_USERS[input];
  return input;
}

/**
 * Get user by email (for login operations)
 */
export function getUserByEmail(email: string): UnifiedTestUser | undefined {
  if (email === DEV_USER.email) return DEV_USER;
  return ALL_TEST_USERS.find((user) => user.email === email);
}

/**
 * Tier hierarchy for access testing
 */
export const TIER_HIERARCHY: UserTier[] = [
  "free",
  "starter",
  "agency",
  "enterprise",
  "admin",
];

/**
 * Get tiers that should have access to a feature requiring a specific tier
 */
export function getTiersWithAccess(requiredTier: UserTier): UserTier[] {
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  return TIER_HIERARCHY.slice(requiredIndex);
}

/**
 * Get tiers that should NOT have access to a feature requiring a specific tier
 */
export function getTiersWithoutAccess(requiredTier: UserTier): UserTier[] {
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  return TIER_HIERARCHY.slice(0, requiredIndex);
}

/**
 * Feature access mapping for testing
 */
export const TEST_FEATURE_ACCESS = {
  dashboard: { requiredTier: "free", adminOnly: false },
  "keyword-tool": { requiredTier: "free", adminOnly: false },
  "content-analyzer": { requiredTier: "starter", adminOnly: false },
  competitors: { requiredTier: "agency", adminOnly: false },
  neuroseo: { requiredTier: "agency", adminOnly: false },
  adminonly: { requiredTier: "admin", adminOnly: true },
  "user-management": { requiredTier: "admin", adminOnly: true },
} as const;

/**
 * Firebase document structure for user creation
 */
export function createFirestoreUserDoc(user: UnifiedTestUser) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    subscriptionTier: user.tier,
    subscriptionStatus: user.subscriptionStatus,
    stripeCustomerId: `test_customer_${user.uid}`,
    quotas: user.expectedQuotas,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    loginCount: 0,
    // Test mode flag
    isTestUser: true,
  };
}
