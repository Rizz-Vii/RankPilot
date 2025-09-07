/**
 * Test Configuration - Legacy types for compatibility
 *
 * Note: This is a compatibility layer. New code should use
 * ../../../config/unified-test-users.ts instead.
 */

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
  tier?: string;
}

// Legacy test users for backward compatibility
export const TEST_CONFIG = {
  users: {
    standard: {
      email: process.env.TEST_STANDARD_EMAIL || "starter@rankpilot.com",
      password: process.env.TEST_STANDARD_PASSWORD || "starter123",
      displayName: "Standard User",
      tier: "starter",
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || "admin@rankpilot.com",
      password: process.env.TEST_ADMIN_PASSWORD || "admin123",
      displayName: "Admin User",
      tier: "admin",
    },
  },

  baseUrl: process.env.TEST_BASE_URL || "http://localhost:3000",
  timeout: 30000,
  retries: 2,
};

export default TEST_CONFIG;
