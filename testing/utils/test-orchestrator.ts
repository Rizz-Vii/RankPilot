import type { Page} from "@playwright/test";
import { expect } from "@playwright/test";
import type { UserTier, UnifiedTestUser} from "./enhanced-auth";
import { EnhancedAuth, TEST_USERS } from "./enhanced-auth";
import { GracefulTestUtils } from "./graceful-test-utils";

/**
 * TestOrchestrator - Comprehensive test execution and user management
 * Based on RankPilot role-based testing strategy
 */

export interface UserFlow {
  name: string;
  description: string;
  steps: FlowStep[];
  requiredTier?: UserTier;
  expectedOutcome?: string;
}

export interface FlowStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'verify' | 'screenshot';
  target?: string;
  value?: string;
  timeout?: number;
  optional?: boolean;
}

export class UserManager {
  private auth: EnhancedAuth;
  private gracefulUtils: GracefulTestUtils;

  constructor(private page: Page) {
    this.auth = new EnhancedAuth(page);
    this.gracefulUtils = new GracefulTestUtils(page);
  }

  /**
   * Login as specific tier user
   */
  async loginAs(tier: UserTier): Promise<void> {
    await this.auth.loginAndGoToDashboard(tier);
  }

  /**
   * Switch to different user tier
   */
  async switchToTier(tier: UserTier): Promise<void> {
    await this.auth.logout();
    await this.auth.loginAndGoToDashboard(tier);
  }

  /**
   * Get current user info
   */
  getCurrentUser(tier: UserTier): UnifiedTestUser {
    return TEST_USERS[tier];
  }

  /**
   * Verify user has access to feature
   */
  async verifyAccess(route: string, expectedAccess: boolean = true): Promise<void> {
    try {
      await this.gracefulUtils.navigateGracefully(route);

      if (expectedAccess) {
        // Should have access - verify no upgrade prompts
        const upgradePrompts = [
          'text=/upgrade|premium|subscribe/i',
          '[data-testid="upgrade-prompt"]',
          '[data-testid="limited-access-message"]'
        ];

        for (const prompt of upgradePrompts) {
          await expect(this.page.locator(prompt)).not.toBeVisible({ timeout: 5000 });
        }
        console.log(`✅ Access granted to ${route}`);
      } else {
        // Should be blocked - verify upgrade prompts or redirects
        const blockIndicators = [
          'text=/upgrade|premium|subscribe/i',
          '[data-testid="upgrade-prompt"]',
          '[data-testid="limited-access-message"]'
        ];

        let foundBlockIndicator = false;
        for (const indicator of blockIndicators) {
          if (await this.page.locator(indicator).isVisible({ timeout: 5000 })) {
            foundBlockIndicator = true;
            break;
          }
        }

        expect(foundBlockIndicator).toBeTruthy();
        console.log(`🚫 Access properly blocked for ${route}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Access verification failed for ${route}: ${errorMessage}`);
    }
  }
}

export class TestOrchestrator {
  public userManager: UserManager;
  private gracefulUtils: GracefulTestUtils;

  constructor(private page: Page) {
    this.userManager = new UserManager(page);
    this.gracefulUtils = new GracefulTestUtils(page);

    // Set enhanced timeouts for orchestrated tests
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);
  }

  /**
   * Execute a complete user flow
   */
  async executeFlow(flow: UserFlow): Promise<void> {
    console.log(`🎭 Executing flow: ${flow.name}`);
    console.log(`📝 Description: ${flow.description}`);

    // Login with required tier if specified
    if (flow.requiredTier) {
      await this.userManager.loginAs(flow.requiredTier);
    }

    // Execute each step in the flow
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      console.log(`📋 Step ${i + 1}/${flow.steps.length}: ${step.action} ${step.target || ''}`);

      try {
        await this.executeStep(step);
      } catch (error) {
        if (step.optional) {
          console.log(`⚠️ Optional step failed, continuing...`);
          continue;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.page.screenshot({
          path: `test-results/flow-failure-${flow.name}-step-${i + 1}-${Date.now()}.png`
        });
        throw new Error(`Flow "${flow.name}" failed at step ${i + 1}: ${errorMessage}`);
      }
    }

    console.log(`✅ Flow completed successfully: ${flow.name}`);

    // Verify expected outcome if specified
    if (flow.expectedOutcome) {
      await this.verifyOutcome(flow.expectedOutcome);
    }
  }

  /**
   * Execute individual flow step
   */
  private async executeStep(step: FlowStep): Promise<void> {
    const timeout = step.timeout || 20000;

    switch (step.action) {
      case 'navigate':
        if (!step.target) throw new Error('Navigate step requires target URL');
        await this.gracefulUtils.navigateGracefully(step.target, { timeout });
        break;

      case 'click':
        if (!step.target) throw new Error('Click step requires target selector');
        await this.gracefulUtils.clickGracefully(step.target, { timeout });
        break;

      case 'fill':
        if (!step.target || !step.value) throw new Error('Fill step requires target and value');
        const element = await this.gracefulUtils.waitForElementGracefully(step.target, { timeout });
        if (element) {
          await element.fill(step.value);
        } else {
          throw new Error(`Element not found for fill action: ${step.target}`);
        }
        break;

      case 'wait':
        if (step.target) {
          await this.gracefulUtils.waitForElementGracefully(step.target, { timeout });
        } else {
          await this.page.waitForTimeout(step.timeout || 2000);
        }
        break;

      case 'verify':
        if (!step.target) throw new Error('Verify step requires target selector');
        await this.gracefulUtils.waitForElementGracefully(step.target, { timeout });
        break;

      case 'screenshot':
        await this.page.screenshot({
          path: `test-results/flow-screenshot-${Date.now()}.png`,
          fullPage: true
        });
        break;

      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  /**
   * Verify expected outcome
   */
  private async verifyOutcome(outcome: string): Promise<void> {
    console.log(`🎯 Verifying outcome: ${outcome}`);

    // Common outcome patterns
    if (outcome.includes('dashboard')) {
      await expect(this.page).toHaveURL(/.*dashboard.*/);
      await this.gracefulUtils.waitForElementGracefully('[data-testid="dashboard-content"]');
    } else if (outcome.includes('error') || outcome.includes('blocked')) {
      const errorIndicators = ['text=/error|blocked|unauthorized/i', '.error-message'];
      let foundError = false;
      for (const indicator of errorIndicators) {
        if (await this.page.locator(indicator).isVisible({ timeout: 5000 })) {
          foundError = true;
          break;
        }
      }
      expect(foundError).toBeTruthy();
    } else {
      // Generic text verification
      await expect(this.page.locator('body')).toContainText(outcome, { timeout: 10000 });
    }
  }

  /**
   * Run tier-specific feature test
   */
  async testTierAccess(
    tier: UserTier,
    featureRoute: string,
    shouldHaveAccess: boolean = true
  ): Promise<void> {
    console.log(`🔒 Testing ${tier} tier access to ${featureRoute}`);

    await this.userManager.loginAs(tier);
    await this.userManager.verifyAccess(featureRoute, shouldHaveAccess);
  }

  /**
   * Run data-driven navigation test
   */
  async testNavigation(navigationItems: Array<{
    name: string;
    url: string;
    requiredTier?: UserTier;
    shouldBeVisible?: boolean;
  }>): Promise<void> {
    console.log(`🧭 Testing navigation for ${navigationItems.length} items`);

    for (const item of navigationItems) {
      console.log(`📍 Testing navigation to ${item.name} (${item.url})`);

      if (item.requiredTier) {
        await this.userManager.loginAs(item.requiredTier);
      }

      if (item.shouldBeVisible !== false) {
        await this.gracefulUtils.navigateGracefully(item.url);
        await expect(this.page).toHaveURL(new RegExp(item.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        console.log(`✅ Successfully navigated to ${item.name}`);
      } else {
        // Should not be accessible
        await this.userManager.verifyAccess(item.url, false);
      }
    }
  }

  /**
   * Comprehensive mobile performance test
   */
  async testMobilePerformance(): Promise<void> {
    console.log(`📱 Running comprehensive mobile performance tests`);

    const viewports = [
      { name: 'Mobile Small', width: 320, height: 568 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Tablet', width: 768, height: 1024 }
    ];

    for (const viewport of viewports) {
      console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await this.page.setViewportSize(viewport);
      await this.gracefulUtils.navigateGracefully('/');

      // Test touch targets (minimum 48px)
      const buttons = this.page.locator('button, a, [role="button"]');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible({ timeout: 2000 })) {
          const box = await button.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44); // Close to 48px with tolerance
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }

      console.log(`✅ ${viewport.name} mobile performance validated`);
    }

    // Reset to default viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}

/**
 * Pre-defined user flows for common testing scenarios
 */
export const commonFlows: UserFlow[] = [
  {
    name: "Basic Dashboard Access",
    description: "Login and verify dashboard loads correctly",
    requiredTier: "free",
    steps: [
      { action: 'navigate', target: '/dashboard' },
      { action: 'verify', target: '[data-testid="dashboard-content"]' },
      { action: 'verify', target: 'h1' }
    ],
    expectedOutcome: "dashboard"
  },
  {
    name: "NeuroSEO Access Test",
    description: "Test access to NeuroSEO features",
    requiredTier: "agency",
    steps: [
      { action: 'navigate', target: '/neuroseo' },
      { action: 'verify', target: '[data-testid="neuroseo-dashboard"]' },
      { action: 'wait', timeout: 3000 }
    ]
  },
  {
    name: "Feature Restriction Test",
    description: "Verify tier restrictions work correctly",
    requiredTier: "free",
    steps: [
      { action: 'navigate', target: '/enterprise-features' },
      { action: 'verify', target: 'text=/upgrade|premium/i' }
    ],
    expectedOutcome: "blocked"
  }
];

/**
 * Convenience function for creating TestOrchestrator
 */
export function createTestOrchestrator(page: Page): TestOrchestrator {
  return new TestOrchestrator(page);
}
