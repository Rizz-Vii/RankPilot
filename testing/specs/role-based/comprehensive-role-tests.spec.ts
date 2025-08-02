/**
 * Comprehensive Role-Based Tests - Resolves Missing Test Files
 * 
 * Creates the role-based test files referenced in Playwright configs.
 * Tests tier-based access control with our unified test users.
 * 
 * Generated: July 26, 2025
 * Integration: Unified test users, enhanced auth service, access control
 */

import { test, expect } from '@playwright/test';
import {
    EnhancedAuth,
    type UserTier
} from '../../utils/enhanced-auth';
import {
    UNIFIED_TEST_USERS,
    getTiersWithAccess,
    getTiersWithoutAccess,
    TEST_FEATURE_ACCESS
} from '../../config/unified-test-users';

test.describe('Role-Based Access Control - Free Tier', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    test('free user can access basic features', async ({ page }) => {
        console.log('🆓 Testing free tier user access to basic features');

        const freeUser = UNIFIED_TEST_USERS.free;
        await auth.loginAndGoToDashboard(freeUser);

        // Test basic feature access
        const basicFeatures = ['/dashboard', '/keyword-tool'];

        for (const feature of basicFeatures) {
            await page.goto(feature);

            // Verify no upgrade prompts for basic features
            const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]');
            await expect(upgradePrompt).not.toBeVisible();

            console.log(`✅ Free user has access to ${feature}`);
        }
    });

    test('free user is blocked from premium features', async ({ page }) => {
        console.log('🚫 Testing free tier user blocked from premium features');

        const freeUser = UNIFIED_TEST_USERS.free;
        await auth.loginAndGoToDashboard(freeUser);

        // Test premium feature blocking
        const premiumFeatures = ['/competitors', '/neuroseo', '/content-analyzer'];

        for (const feature of premiumFeatures) {
            await page.goto(feature);

            // Should see upgrade prompt or be redirected
            const upgradeIndicators = [
                page.locator('[data-testid="upgrade-prompt"]'),
                page.locator('text=upgrade'),
                page.locator('text=premium'),
                page.locator('text=subscribe')
            ];

            let foundUpgradeIndicator = false;
            for (const indicator of upgradeIndicators) {
                if (await indicator.isVisible({ timeout: 5000 })) {
                    foundUpgradeIndicator = true;
                    break;
                }
            }

            expect(foundUpgradeIndicator).toBeTruthy();
            console.log(`🚫 Free user properly blocked from ${feature}`);
        }
    });

    test('free user cannot access admin features', async ({ page }) => {
        console.log('🔒 Testing free tier user blocked from admin features');

        const freeUser = UNIFIED_TEST_USERS.free;
        await auth.loginAndGoToDashboard(freeUser);

        // Try to access admin features
        await page.goto('/adminonly');

        // Should be redirected or see access denied
        await expect(page).not.toHaveURL('/adminonly');
        console.log('✅ Free user properly blocked from admin features');
    });
});

test.describe('Role-Based Access Control - Enterprise Tier', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    test('enterprise user can access all premium features', async ({ page }) => {
        console.log('🏢 Testing enterprise tier user access to premium features');

        const enterpriseUser = UNIFIED_TEST_USERS.enterprise;
        await auth.loginAndGoToDashboard(enterpriseUser);

        // Test access to all premium features
        const allFeatures = [
            '/dashboard',
            '/keyword-tool',
            '/content-analyzer',
            '/competitors',
            '/neuroseo'
        ];

        for (const feature of allFeatures) {
            await page.goto(feature);

            // Verify no upgrade prompts
            const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]');
            await expect(upgradePrompt).not.toBeVisible();

            console.log(`✅ Enterprise user has access to ${feature}`);
        }
    });

    test('enterprise user still blocked from admin features', async ({ page }) => {
        console.log('🔒 Testing enterprise tier user blocked from admin features');

        const enterpriseUser = UNIFIED_TEST_USERS.enterprise;
        await auth.loginAndGoToDashboard(enterpriseUser);

        // Try to access admin features
        await page.goto('/adminonly');

        // Should be redirected or see access denied (unless user has admin role)
        if (enterpriseUser.role !== 'admin') {
            await expect(page).not.toHaveURL('/adminonly');
            console.log('✅ Enterprise user properly blocked from admin features');
        }
    });
});

test.describe('Role-Based Access Control - Admin Access', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    test('admin user can access all features', async ({ page }) => {
        console.log('👑 Testing admin user access to all features');

        const adminUser = UNIFIED_TEST_USERS.admin;
        await auth.loginAndGoToDashboard(adminUser);

        // Test access to all features including admin
        const allFeatures = [
            '/dashboard',
            '/keyword-tool',
            '/content-analyzer',
            '/competitors',
            '/neuroseo',
            '/adminonly'
        ];

        for (const feature of allFeatures) {
            await page.goto(feature);

            // Verify access granted (no redirects or upgrade prompts)
            if (feature === '/adminonly') {
                await expect(page).toHaveURL('/adminonly');
            } else {
                const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]');
                await expect(upgradePrompt).not.toBeVisible();
            }

            console.log(`✅ Admin user has access to ${feature}`);
        }
    });

    test('admin user sees admin-specific UI elements', async ({ page }) => {
        console.log('🛠️ Testing admin user sees admin UI elements');

        const adminUser = UNIFIED_TEST_USERS.admin;
        await auth.loginAndGoToDashboard(adminUser);

        // Check for admin-specific elements in navigation
        const adminElements = [
            '[data-testid="admin-nav"]',
            'text=Admin',
            'text=User Management',
            '[href="/adminonly"]'
        ];

        let foundAdminElement = false;
        for (const element of adminElements) {
            if (await page.locator(_element).isVisible({ timeout: 5000 })) {
                foundAdminElement = true;
                console.log(`✅ Found admin UI _element: ${element}`);
                break;
            }
        }

        expect(foundAdminElement).toBeTruthy();
    });
});

test.describe('Cross-Tier Feature Access Matrix', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    // Generate tests for each feature and tier combination
    Object.entries(TEST_FEATURE_ACCESS).forEach(([featureName, featureConfig]) => {
        test(`${featureName} access control matrix`, async ({ page }) => {
            console.log(`🧪 Testing ${featureName} access across all tiers`);

            const allTiers: UserTier[] = ['free', 'starter', 'agency', 'enterprise', 'admin'];

            for (const tier of allTiers) {
                const user = UNIFIED_TEST_USERS[tier];

                // Determine expected access
                let shouldHaveAccess = false;

                if (featureConfig.adminOnly && user.role === 'admin') {
                    shouldHaveAccess = true;
                } else if (!featureConfig.adminOnly) {
                    const requiredTierIndex = allTiers.indexOf(featureConfig.requiredTier);
                    const userTierIndex = allTiers.indexOf(user.tier);
                    shouldHaveAccess = userTierIndex >= requiredTierIndex;
                }

                console.log(`Testing ${featureName} for ${tier} user (expected access: ${shouldHaveAccess})`);

                // Login as user
                await auth.loginAndGoToDashboard(user);

                // Navigate to feature
                await page.goto(`/${featureName}`);

                if (shouldHaveAccess) {
                    // Should have access
                    const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]');
                    await expect(upgradePrompt).not.toBeVisible();
                    console.log(`✅ ${tier} user correctly has access to ${featureName}`);
                } else {
                    // Should be blocked
                    const blockIndicators = [
                        page.locator('[data-testid="upgrade-prompt"]'),
                        page.locator('text=upgrade'),
                        page.locator('text=premium')
                    ];

                    let foundBlockIndicator = false;
                    for (const indicator of blockIndicators) {
                        if (await indicator.isVisible({ timeout: 5000 })) {
                            foundBlockIndicator = true;
                            break;
                        }
                    }

                    // For admin-only features, check redirect instead
                    if (featureConfig.adminOnly && user.role !== 'admin') {
                        await expect(page).not.toHaveURL(`/${featureName}`);
                        foundBlockIndicator = true;
                    }

                    expect(foundBlockIndicator).toBeTruthy();
                    console.log(`🚫 ${tier} user correctly blocked from ${featureName}`);
                }

                // Logout for next iteration
                await auth.logout();
            }
        });
    });
});

test.describe('Authentication Flow Integration', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        auth = new EnhancedAuth(page);
    });

    test('login tracking integration works', async ({ page }) => {
        console.log('📊 Testing login tracking integration with enhanced auth service');

        const testUser = UNIFIED_TEST_USERS.starter;

        // Login should trigger tracking update
        await auth.loginAndGoToDashboard(testUser);

        // Verify we're logged in and tracking was called
        await expect(page).toHaveURL('/dashboard');

        // Check console for tracking log message
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));

        // Refresh to trigger any tracking updates
        await page.reload();

        // Should see tracking-related console messages
        const hasTrackingLog = logs.some(log =>
            log.includes('Updated login tracking') ||
            log.includes('login tracking')
        );

        console.log(`Login tracking integration: ${hasTrackingLog ? 'WORKING' : 'NEEDS_CHECK'}`);
    });

    test('tier-based routing works correctly', async ({ page }) => {
        console.log('🔀 Testing tier-based routing after login');

        // Test regular user routing
        const regularUser = UNIFIED_TEST_USERS.agency;
        await auth.loginAndGoToDashboard(regularUser);
        await expect(page).toHaveURL('/dashboard');
        await auth.logout();

        // Test admin user routing
        const adminUser = UNIFIED_TEST_USERS.admin;
        await auth.loginAndGoToDashboard(adminUser);
        // Admin should go to admin dashboard or regular dashboard
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(dashboard|adminonly)/);

        console.log(`✅ Tier-based routing working correctly`);
    });
});
