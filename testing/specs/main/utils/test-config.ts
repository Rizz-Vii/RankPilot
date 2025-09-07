/**
 * Legacy Compatibility Layer for Test Configuration
 * Provides backwards compatibility for older test files
 */

import type { UnifiedTestUser } from "../../../utils/enhanced-auth";

// Legacy TestUser interface for backwards compatibility
export interface LegacyTestUser {
  email: string;
  password: string;
  tier: string;
  displayName?: string;
}

// Convert UnifiedTestUser to LegacyTestUser format
export function toLegacyTestUser(user: UnifiedTestUser): LegacyTestUser {
  return {
    email: user.email,
    password: user.password,
    tier: user.tier,
    displayName: user.displayName,
  };
}

// Legacy test configuration for older test files
export const legacyTestConfig = {
  timeout: 60000,
  actionTimeout: 15000,
  navigationTimeout: 20000,
  retries: 2,
};

// Legacy user configurations
export const legacyTestUsers = {
  free: {
    email: "free.user1@test.com",
    password: "TestPass123!",
    tier: "free",
    displayName: "Free User",
  },
  starter: {
    email: "starter.user1@test.com",
    password: "TestPass123!",
    tier: "starter",
    displayName: "Starter User",
  },
  agency: {
    email: "agency.user1@test.com",
    password: "TestPass123!",
    tier: "agency",
    displayName: "Agency User",
  },
  enterprise: {
    email: "enterprise.user1@test.com",
    password: "TestPass123!",
    tier: "enterprise",
    displayName: "Enterprise User",
  },
  admin: {
    email: "admin.enterprise@test.com",
    password: "TestPass123!",
    tier: "admin",
    displayName: "Admin User",
  },
} as const;

export type LegacyUserTier = keyof typeof legacyTestUsers;

// Helper function to get legacy user by tier
export function getLegacyUser(tier: LegacyUserTier): LegacyTestUser {
  return legacyTestUsers[tier];
}

// Export for compatibility
export default {
  legacyTestConfig,
  legacyTestUsers,
  getLegacyUser,
  toLegacyTestUser,
};
