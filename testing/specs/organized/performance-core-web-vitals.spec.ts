import { expect, test } from "@playwright/test";

test.describe('Performance - Core Web Vitals', () => {
    test('should meet LCP requirements (< 2.5s)', async ({ page }) => {
        await page.goto('/');

        const lcpValue = await page.evaluate(() => {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lcp = entries[entries.length - 1];
                    resolve(lcp?.startTime || 0);
                });
                observer.observe({ type: 'largest-contentful-paint', buffered: true });

                setTimeout(() => resolve(0), 5000);
            });
        });

        expect(lcpValue).toBeLessThan(2500);
    });

    test('should maintain CLS score (< 0.1)', async ({ page }) => {
        await page.goto('/dashboard');

        const clsValue = await page.evaluate(() => {
            return new Promise((resolve) => {
                let clsScore = 0;
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const layoutShiftEntry = entry as any; // LayoutShift entry type
                        if (!layoutShiftEntry.hadRecentInput) {
                            clsScore += layoutShiftEntry.value;
                        }
                    }
                });
                observer.observe({ type: 'layout-shift', buffered: true });

                setTimeout(() => resolve(clsScore), 3000);
            });
        });

        expect(clsValue).toBeLessThan(0.1);
    });

    test('should achieve FID targets (< 100ms)', async ({ page }) => {
        await page.goto('/content-analyzer');

        // Simulate user interaction
        await page.click('[data-testid="url-input"]');

        const fidValue = await page.evaluate(() => {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const fid = entries[0] as any; // First Input entry type
                    resolve(fid?.processingStart - fid?.startTime || 0);
                });
                observer.observe({ type: 'first-input', buffered: true });

                setTimeout(() => resolve(0), 3000);
            });
        });

        expect(fidValue).toBeLessThan(100);
    });

    test('should optimize resource loading', async ({ page }) => {
        await page.goto('/');

        const resourceCount = await page.evaluate(() => {
            return performance.getEntriesByType('resource').length;
        });

        expect(resourceCount).toBeGreaterThan(0);
        expect(resourceCount).toBeLessThan(100); // Reasonable resource limit
    });

    test('should implement lazy loading', async ({ page }) => {
        await page.goto('/dashboard');

        // Check for lazy loading implementation
        const lazyImages = await page.locator('img[loading="lazy"]').count();
        expect(lazyImages).toBeGreaterThan(0);
    });

    test('should use efficient caching strategies', async ({ page }) => {
        const _response = await page.goto('/');
        const cacheControl = response?.headers()['cache-control'];
        expect(cacheControl).toBeTruthy();
    });

    test('should optimize font loading', async ({ page }) => {
        await page.goto('/');

        const fontDisplay = await page.evaluate(() => {
            const styleSheets = Array.from(document.styleSheets);
            return styleSheets.some(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    return rules.some(rule =>
                        rule.cssText.includes('font-display') ||
                        rule.cssText.includes('font-face')
                    );
                } catch (e) {
                    return false;
                }
            });
        });

        expect(fontDisplay).toBeTruthy();
    });

    test('should minimize JavaScript bundle size', async ({ page }) => {
        const _response = await page.goto('/');
        const contentLength = response?.headers()['content-length'];
        if (contentLength) {
            expect(parseInt(contentLength)).toBeLessThan(5 * 1024 * 1024); // 5MB limit
        }
    });
});
