import { expect, test } from "@playwright/test";

test.describe('Mobile - Responsive Design', () => {
    test('should adapt to mobile viewport (375px)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        
        await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });

    test('should have proper touch targets (48px minimum)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard');
        
        const buttons = page.locator('button, a, [role="button"]');
        const count = await buttons.count();
        
        for (let i = 0; i < Math.min(count, 10); i++) {
            const button = buttons.nth(_i);
            const box = await button.boundingBox();
            if (box) {
                expect(box.height).toBeGreaterThanOrEqual(48);
                expect(box.width).toBeGreaterThanOrEqual(48);
            }
        }
    });

    test('should handle tablet viewport (768px)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/dashboard');
        
        await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    });

    test('should optimize images for mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        
        const images = page.locator('img');
        const count = await images.count();
        
        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(_i);
            const src = await img.getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('should handle orientation changes', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard');
        
        // Change to landscape
        await page.setViewportSize({ width: 667, height: 375 });
        await expect(page.locator('[data-testid="content"]')).toBeVisible();
    });

    test('should have mobile-friendly forms', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');
        
        await expect(page.locator('input[type="email"]')).toHaveAttribute('inputmode', 'email');
    });

    test('should optimize scroll performance', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard');
        
        // Test smooth scrolling
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(1000);
        
        const scrollY = await page.evaluate(() => window.scrollY);
        expect(scrollY).toBeGreaterThan(0);
    });

    test('should display mobile navigation correctly', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard');
        
        await page.click('[data-testid="mobile-menu-toggle"]');
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });
});
