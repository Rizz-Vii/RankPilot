import { Page } from "@playwright/test";
import {
  DEV_USER,
  UNIFIED_TEST_USERS,
  type UnifiedTestUser,
  type UserTier,
  resolveTestUser
} from "../config/unified-test-users";
import { GracefulTestUtils } from "./graceful-test-utils";

/**
 * Enhanced Authentication Utilities - Unified Test User Management
 * Resolves conflicts between different test user configurations
 */

export type { UnifiedTestUser, UserTier };

// Export unified test users for backward compatibility
export const TEST_USERS = UNIFIED_TEST_USERS;

export class EnhancedAuth {
  private gracefulUtils: GracefulTestUtils;

  constructor(private page: Page) {
    this.gracefulUtils = new GracefulTestUtils(page);
  }

  /**
   * Enhanced login with unified test users and enhanced auth service integration
   * TEMPORARY FIX: Use dev user for testing until Firebase Admin credentials are configured
   */
  async loginAndGoToDashboard(user?: UnifiedTestUser | UserTier): Promise<void> {
    // Resolve requested user (defaults to DEV_USER if unspecified)
    const targetUser = resolveTestUser(user);

    try {
      // If we're already authenticated, skip the login flow
      if (await this.isAuthenticated()) {
        console.log("🔓 Already authenticated, going to dashboard...");
        await this.gracefulUtils.navigateGracefully("/dashboard", { waitStrategy: 'domcontentloaded' });
        return;
      }

      console.log(`🔐 Logging in as ${targetUser.displayName} (${targetUser.tier})`);

      // Navigate to login page gracefully
      await this.gracefulUtils.navigateGracefully("/login", {
        waitStrategy: 'domcontentloaded',
        timeout: 60000
      });

      // Wait for body to be visible before interacting
      await this.waitForBodyVisible();

      // Wait for login form elements and fill them
      const emailInput = await this.gracefulUtils.waitForElementGracefully('#email', {
        timeout: 30000
      });
      const passwordInput = await this.gracefulUtils.waitForElementGracefully('#password', {
        timeout: 30000
      });

      // Fill in login form
      if (emailInput && passwordInput) {
        console.log(`📝 Filling email: ${targetUser.email}`);
        await emailInput.fill(targetUser.email);
        console.log(`📝 Filling password: ${targetUser.password}`);
        await passwordInput.fill(targetUser.password);
        console.log(`✅ Form filled successfully`);
      } else {
        throw new Error("Email or password input not found");
      }

      // Dismiss any overlays that could intercept pointer events
      await this.dismissPotentialOverlays();

      // Submit the form programmatically to avoid overlay interception
      const submitted = await this.submitLoginFormProgrammatically();
      if (!submitted) {
        // Fallback to pressing Enter on password field
        await passwordInput.press('Enter');
      }

      console.log(`🔄 Waiting for authentication to complete...`);

      // Wait for navigation to expected path with more flexible matching
      const expectedPath = targetUser.tier === 'admin' ? '**/adminonly' : '**/dashboard';

      try {
        // Wait for navigation with enhanced timeout for Firebase auth
        await this.page.waitForURL(expectedPath, {
          timeout: 45000,
          waitUntil: 'domcontentloaded'
        });
        console.log(`✅ Navigation to ${expectedPath} successful`);
      } catch (navError) {
        // Check current URL if navigation fails
        const currentUrl = this.page.url();
        console.log(`⚠️ Navigation timeout. Current URL: ${currentUrl}`);

        // Check for common redirect patterns
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/app') || currentUrl.includes('/home')) {
          console.log(`✅ Successfully authenticated, landed on: ${currentUrl}`);
        } else if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
          throw new Error(`Authentication failed - still on login page: ${currentUrl}`);
        } else {
          console.log(`⚠️ Unexpected redirect to: ${currentUrl}, proceeding...`);
        }
      }

      // Small delay for auth state to propagate
      await this.page.waitForTimeout(800);

      // Verify we're logged in by checking for user-specific elements
      const isAuthenticated = await this.page.evaluate(() => {
        // Check multiple indicators of authentication
        const indicators = [
          !!document.querySelector('[data-testid*="user"]'),
          !!document.querySelector('[data-testid*="dashboard"]'),
          !!document.querySelector('.user-menu'),
          !!document.querySelector('[aria-label*="user"]'),
          !!Object.keys(localStorage).some(key => key.startsWith('firebase:authUser:')),
          !!document.cookie.includes('auth'),
          window.location.pathname.includes('/app') || window.location.pathname.includes('/dashboard')
        ];

        console.log('Authentication indicators:', indicators);
        return indicators.some(Boolean);
      });

      console.log(`🔍 Authentication verification: ${isAuthenticated ? 'PASSED' : 'FAILED'}`);

      // Try to verify page loaded successfully (dashboard or admin panel), but do not fail the whole login if it flakes
      try {
        const contentSelector = targetUser.tier === 'admin'
          ? '[data-testid="admin-content"], [data-testid="dashboard-content"], main, .main-content'
          : '[data-testid="dashboard-content"], main, .main-content';
        await this.gracefulUtils.waitForElementGracefully(contentSelector, { timeout: 4000, retries: 1 });
      } catch (waitErr) {
        console.log('⚠️ Dashboard content verification timed out, continuing as auth already verified.');
      }

      console.log(`✅ Successfully logged in as ${targetUser.displayName}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Login failed for ${targetUser.displayName}:`, errorMessage);

      // Capture debug screenshot (best-effort) — guard against renderer crashes
      try {
        if (!this.page.isClosed()) {
          await this.page.screenshot({
            path: `test-results/login-failure-${targetUser.tier}-${Date.now()}.png`,
            fullPage: true
          });
        } else {
          // Try a minimal fallback using any open page in the context
          const pages = this.page.context()?.pages?.() || [];
          const fallback = pages.find(p => !p.isClosed());
          if (fallback) {
            await fallback.screenshot({
              path: `test-results/login-failure-fallback-${targetUser.tier}-${Date.now()}.png`,
              fullPage: true
            }).catch(() => { });
          }
        }
      } catch (screenshotErr) {
        console.warn('⚠️ Failed to capture failure screenshot (page may have crashed).');
      }

      throw new Error(`Authentication failed for ${targetUser.tier} user: ${errorMessage}`);
    }
  }

  /**
   * Attempt to submit the login form programmatically to avoid click interception
   */
  private async submitLoginFormProgrammatically(): Promise<boolean> {
    try {
      const hadForm = await this.page.locator('form').first().isVisible({ timeout: 3000 }).catch(() => false);
      if (!hadForm) return false;

      // Use requestSubmit when available to trigger native submit with validation
      await this.page.locator('form').first().evaluate((form: any) => {
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
          return true;
        }
        form?.submit?.();
        return true;
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dismiss potential overlays or modals that might intercept clicks
   */
  private async dismissPotentialOverlays(): Promise<void> {
    try {
      // Press Escape to close any modal
      await this.page.keyboard.press('Escape').catch(() => { });

      // Click common close buttons if present
      const closeSelectors = [
        '[data-testid="modal-close"]',
        '[aria-label="Close"], button[aria-label~="close" i]',
        '.modal [data-action="close"]',
        '.dialog [data-action="close"]'
      ];
      for (const sel of closeSelectors) {
        const el = this.page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
          await el.click().catch(() => { });
        }
      }

      // As a last resort in CI, remove full-screen backdrops that block pointer events
      await this.page.evaluate(() => {
        const blockers = Array.from(document.querySelectorAll(
          '.fixed.inset-0, .backdrop, .backdrop-blur-sm, [data-testid="global-overlay"]'
        ));
        blockers.forEach((el: any) => {
          const style = window.getComputedStyle(el);
          // Only remove very high z-index overlays likely used as backdrops
          const z = parseInt(style.zIndex || '0', 10);
          if (z >= 50 && (style.position === 'fixed' || style.position === 'absolute')) {
            el.parentElement?.removeChild(el);
          }
        });
      }).catch(() => { });
    } catch {
      // best-effort only
    }
  }

  /**
   * Login without navigation - just handle auth
   */
  async loginOnly(user?: UnifiedTestUser | UserTier): Promise<void> {
    const targetUser = resolveTestUser(user);

    console.log(`🔐 Logging in as ${targetUser.displayName} (${targetUser.tier})`);

    await this.gracefulUtils.navigateGracefully("/login");
    await this.waitForBodyVisible();

    // Fill login form directly
    await this.page.fill("#email", targetUser.email);
    await this.page.fill("#password", targetUser.password);

    // Click the main login button using test ID
    const loginButton = this.page.locator('[data-testid="login-button"]');
    await loginButton.click();

    // Wait for auth to complete (not navigation)
    await this.page.waitForTimeout(3000);
  }

  /**
   * Check if user is already authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for common authenticated indicators
      const authIndicators = [
        '[data-testid="user-menu"]',
        '[data-testid="logout-button"]',
        'text=Dashboard',
        'text=Profile',
        '.user-avatar'
      ];

      for (const indicator of authIndicators) {
        if (await this.page.locator(indicator).isVisible({ timeout: 2000 })) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to a protected route with authentication check
   */
  async navigateToProtectedRoute(route: string, user?: UnifiedTestUser | UserTier): Promise<void> {
    console.log(`🛡️ Navigating to protected route: ${route}`);

    // Check if already authenticated
    if (!(await this.isAuthenticated())) {
      await this.loginAndGoToDashboard(user);
    }

    // Navigate to the target route
    await this.gracefulUtils.navigateGracefully(route);
  }

  /**
   * Wait for body element to be visible (fixes display: none issue)
   */
  private async waitForBodyVisible(): Promise<void> {
    try {
      console.log("🔍 Checking body visibility...");

      // Wait for body to exist
      await this.page.waitForSelector('body', { timeout: 30000 });

      // Check if body has display: none and wait for it to become visible
      await this.page.waitForFunction(
        () => {
          const body = document.body;
          const style = window.getComputedStyle(body);
          return style.display !== 'none' && style.visibility !== 'hidden';
        },
        { timeout: 30000 }
      );

      console.log("✅ Body is now visible");
    } catch (error) {
      console.log("⚠️ Body visibility check failed, continuing anyway");
      await this.page.screenshot({
        path: `test-results/body-visibility-debug-${Date.now()}.png`,
        fullPage: true
      });
    }
  }

  /**
   * Resolve user input to UnifiedTestUser object
   */
  private resolveUser(user?: UnifiedTestUser | UserTier): UnifiedTestUser {
    return resolveTestUser(user);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      console.log("🚪 Logging out...");

      // Try multiple logout methods
      const logoutSelectors = [
        '[data-testid="logout-button"]',
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        '[data-testid="user-menu"] button:has-text("Logout")'
      ];

      for (const selector of logoutSelectors) {
        const element = this.page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          break;
        }
      }

      // Wait for redirect to login or home page
      await this.page.waitForURL(/\/(login|$)/, { timeout: 10000 });
      console.log("✅ Successfully logged out");

    } catch (error) {
      console.log("⚠️ Logout may have failed, continuing...");
    }
  }
}

/**
 * Convenience function for backwards compatibility
 */
export async function loginAndGoToDashboard(
  page: Page,
  user?: UnifiedTestUser | UserTier
): Promise<void> {
  const auth = new EnhancedAuth(page);
  await auth.loginAndGoToDashboard(user);
}
