/**
 * Mobile Device Compatibility Tests
 * RankPilot - Mobile Performance Validation
 */

import { expect, test } from '@playwright/test';
import { runProductionTests } from './production-test-suite';

test.describe('Mobile Compatibility', () => {
    test('mobile responsiveness validation', async ({ page }) => {
        const report = await runProductionTests(page, 'http://localhost:3000');

        // Validate mobile test results
        const mobileScore = (report.summary.mobilePassed / report.summary.mobileTotal) * 100;
        expect(mobileScore).toBeGreaterThanOrEqual(80);

        // Check Core Web Vitals on mobile
        const mobileResults = report.mobile;
        for (const result of mobileResults) {
            expect(result.coreWebVitals.lcp).toBeLessThan(2500);
            expect(result.coreWebVitals.fid).toBeLessThan(100);
            expect(result.coreWebVitals.cls).toBeLessThan(0.1);
        }
    });

    test('touch target accessibility', async ({ page }) => {
        await page.goto('/');

        // Get all interactive elements
        const touchTargets = await page.locator('button, a, input[type="button"], input[type="submit"], [role="button"]').all();

        let validTouchTargets = 0;
        for (const target of touchTargets) {
            const box = await target.boundingBox();
            if (box && box.width >= 44 && box.height >= 44) {
                validTouchTargets++;
            }
        }

        // At least 90% of touch targets should meet WCAG guidelines (44x44px)
        const touchTargetScore = touchTargets.length > 0 ? (validTouchTargets / touchTargets.length) * 100 : 100;
        expect(touchTargetScore).toBeGreaterThanOrEqual(90);
    });

    test('mobile navigation usability', async ({ page }) => {
        await page.goto('/');

        // Test mobile menu functionality
        const mobileMenuButton = page.locator('[data-testid="mobile-menu"], [aria-label*="menu" i], .hamburger').first();

        if (await mobileMenuButton.isVisible()) {
            await mobileMenuButton.click();

            // Menu should be accessible
            const mobileMenu = page.locator('[data-testid="mobile-menu-content"], .mobile-menu, [role="menu"]').first();
            await expect(mobileMenu).toBeVisible();

            // Should have main navigation links
            const navLinks = await mobileMenu.locator('a').count();
            expect(navLinks).toBeGreaterThan(3);
        }
    });

    test('mobile form interactions', async ({ page }) => {
        await page.goto('/');

        // Test form elements on mobile
        const formInputs = await page.locator('input, select, textarea').all();

        for (const input of formInputs.slice(0, 5)) { // Test first 5 inputs
            const box = await input.boundingBox();
            if (box) {
                // Input should be large enough for mobile interaction
                expect(box.height).toBeGreaterThanOrEqual(44);

                // Test focus and input
                await input.focus();
                const isFocused = await input.evaluate(el => el === document.activeElement);
                expect(isFocused).toBe(true);
            }
        }
    });

    test('mobile viewport meta tag', async ({ page }) => {
        await page.goto('/');

        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(viewportMeta).toContain('width=device-width');
        expect(viewportMeta).toContain('initial-scale=1');
    });

    test('mobile performance metrics', async ({ page }) => {
        await page.goto('/');

        // Measure page load performance on mobile
        const performanceMetrics = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return {
                domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
                loadComplete: nav.loadEventEnd - nav.loadEventStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
            };
        });

        // Mobile performance thresholds
        expect(performanceMetrics.domContentLoaded).toBeLessThan(1500);
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2000);
    });

    test('mobile image optimization', async ({ page }) => {
        await page.goto('/');

        // Check that images are properly optimized for mobile
        const images = await page.locator('img').all();

        for (const img of images.slice(0, 10)) { // Test first 10 images
            const src = await img.getAttribute('src');
            // const loading = await img.getAttribute('loading'); // intentionally unused (potential future assertion)
            const alt = await img.getAttribute('alt');

            // Images should have proper attributes
            if (src && !src.startsWith('data:')) {
                expect(alt).toBeTruthy(); // Alt text for accessibility
                // Loading should be lazy for non-critical images
                // expect(loading).toBe('lazy'); // Commented out as not all images need lazy loading
            }
        }
    });

    test('mobile text readability', async ({ page }) => {
        await page.goto('/');

        // Check font sizes for mobile readability
        const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6').all();

        let readableTextCount = 0;
        for (const element of textElements.slice(0, 20)) { // Test first 20 text elements
            const fontSize = await element.evaluate(el => {
                const style = window.getComputedStyle(el);
                return parseFloat(style.fontSize);
            });

            // Text should be at least 16px for mobile readability
            if (fontSize >= 16) {
                readableTextCount++;
            }
        }

        const readabilityScore = (readableTextCount / Math.min(textElements.length, 20)) * 100;
        expect(readabilityScore).toBeGreaterThanOrEqual(70);
    });

    test('mobile scroll performance', async ({ page }) => {
        await page.goto('/');

        // Test smooth scrolling on mobile
        const initialScrollY = await page.evaluate(() => window.scrollY);

        // Scroll down
        await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
        await page.waitForTimeout(500);

        const midScrollY = await page.evaluate(() => window.scrollY);
        expect(midScrollY).toBeGreaterThan(initialScrollY);

        // Scroll back to top
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(500);

        const finalScrollY = await page.evaluate(() => window.scrollY);
        expect(finalScrollY).toBeLessThan(midScrollY);
    });
});
