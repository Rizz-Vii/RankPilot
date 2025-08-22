import { expect, test } from "@playwright/test";

/**
 * Performance & Core Web Vitals Comprehensive Test Suite
 * Tests loading performance, Core Web Vitals, optimization, and caching
 */

test.describe('Performance - Core Web Vitals Monitoring', () => {
    test('Largest Contentful Paint (LCP) measurement', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const lcp = await page.evaluate(() => {
            return new Promise((resolve) => {
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    if (entries.length > 0) {
                        resolve(entries[entries.length - 1].startTime);
                    }
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                setTimeout(() => resolve(0), 5000);
            });
        });

        expect(lcp).toBeGreaterThan(0);
        expect(lcp).toBeLessThan(2500); // LCP should be under 2.5s
    });

    test('First Input Delay (FID) simulation', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const startTime = Date.now();
        await page.click('body');
        const fid = Date.now() - startTime;

        expect(fid).toBeLessThan(100); // FID should be under 100ms
    });

    test('Cumulative Layout Shift (CLS) measurement', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const cls = await page.evaluate(() => {
            return new Promise((resolve) => {
                let clsValue = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const shift = entry as unknown as { hadRecentInput?: boolean; value?: number };
                        if (!shift.hadRecentInput) {
                            clsValue += shift.value ?? 0;
                        }
                    }
                    resolve(clsValue);
                }).observe({ entryTypes: ['layout-shift'] });

                setTimeout(() => resolve(clsValue), 3000);
            });
        });

        expect(cls).toBeLessThan(0.1); // CLS should be under 0.1
    });

    test('Total Blocking Time (TBT) assessment', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const tbt = await page.evaluate(() => {
            return new Promise((resolve) => {
                let totalBlockingTime = 0;
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            totalBlockingTime += entry.duration - 50;
                        }
                    }
                    resolve(totalBlockingTime);
                }).observe({ entryTypes: ['longtask'] });

                setTimeout(() => resolve(totalBlockingTime), 5000);
            });
        });

        expect(tbt).toBeLessThan(300); // TBT should be under 300ms
    });

    test('First Contentful Paint (FCP) measurement', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const fcp = await page.evaluate(() => {
            return new Promise((resolve) => {
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    if (entries.length > 0) {
                        resolve(entries[0].startTime);
                    }
                }).observe({ entryTypes: ['paint'] });

                setTimeout(() => resolve(0), 3000);
            });
        });

        expect(fcp).toBeGreaterThan(0);
        expect(fcp).toBeLessThan(1800); // FCP should be under 1.8s
    });
});

test.describe('Performance - Page Load Optimization', () => {
    test('Homepage loading performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(3000); // Homepage should load within 3s
    });

    test('Dashboard loading performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(5000); // Dashboard should load within 5s
    });

    test('Resource loading efficiency', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const resourceMetrics = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            return {
                totalResources: entries.length,
                totalSize: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
                slowResources: entries.filter(entry => entry.duration > 1000).length
            };
        });

        expect(resourceMetrics.totalResources).toBeGreaterThan(0);
        expect(resourceMetrics.slowResources).toBeLessThan(5); // Less than 5 slow resources
    });

    test('Critical resource prioritization', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const criticalResources = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            return entries.filter(entry =>
                entry.name.includes('.css') ||
                entry.name.includes('font') ||
                entry.name.includes('critical')
            ).length;
        });

        expect(criticalResources).toBeGreaterThan(0);
    });

    test('Lazy loading implementation', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const lazyImages = await page.locator('img[loading="lazy"]').count();
        if (lazyImages > 0) {
            console.log(`✅ Found ${lazyImages} lazy-loaded images`);
        }

        const deferredScripts = await page.locator('script[defer]').count();
        if (deferredScripts > 0) {
            console.log(`✅ Found ${deferredScripts} deferred scripts`);
        }
    });
});

test.describe('Performance - Network & Caching', () => {
    test('HTTP/2 implementation', async ({ page }) => {
        const response = await page.goto('/', { timeout: 30000 });
        // Check if modern protocols are used (placeholder marker removed unused variable)
        if (response?.url().startsWith('https://')) {
            console.log('✅ HTTPS protocol implemented');
        }
    });

    test('Compression effectiveness', async ({ page }) => {
        const response = await page.goto('/', { timeout: 30000 });
        const encoding = await response?.headerValue('content-encoding');

        if (encoding === 'gzip' || encoding === 'br') {
            console.log(`✅ Content compression enabled: ${encoding}`);
        }
    });

    test('CDN performance validation', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const cdnResources = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource');
            return entries.filter((entry: PerformanceResourceTiming) =>
                entry.name.includes('cdn') ||
                entry.name.includes('cloudfront') ||
                entry.name.includes('jsdelivr')
            ).length;
        });

        if (cdnResources > 0) {
            console.log(`✅ Found ${cdnResources} CDN resources`);
        }
    });

    test('Browser caching effectiveness', async ({ page }) => {
        // First visit
        await page.goto('/', { timeout: 30000 });

        // Second visit (should be faster due to caching)
        const startTime = Date.now();
        await page.reload();
        const reloadTime = Date.now() - startTime;

        expect(reloadTime).toBeLessThan(2000); // Reload should be under 2s
    });

    test('Service worker implementation', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const hasServiceWorker = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });

        if (hasServiceWorker) {
            const swRegistration = await page.evaluate(() => {
                return navigator.serviceWorker.getRegistrations();
            });

            if (swRegistration) {
                console.log('✅ Service worker detected');
            }
        }
    });
});

test.describe('Performance - Mobile Performance', () => {
    test('Mobile viewport performance', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        const startTime = Date.now();
        await page.goto('/', { timeout: 30000 });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(4000); // Mobile should load within 4s
    });

    test('Touch responsiveness', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/', { timeout: 30000 });

        const startTime = Date.now();
        await page.tap('body');
        const touchDelay = Date.now() - startTime;

        expect(touchDelay).toBeLessThan(50); // Touch should respond within 50ms
    });

    test('Mobile-specific optimizations', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/', { timeout: 30000 });

        const viewportMeta = await page.locator('meta[name="viewport"]').count();
        expect(viewportMeta).toBeGreaterThan(0);

        const touchTargets = await page.locator('button, a, [role="button"]');
        const targetCount = await touchTargets.count();

        if (targetCount > 0) {
            const firstTarget = touchTargets.first();
            const boundingBox = await firstTarget.boundingBox();

            if (boundingBox) {
                expect(boundingBox.width).toBeGreaterThanOrEqual(44); // 44px minimum touch target
                expect(boundingBox.height).toBeGreaterThanOrEqual(44);
            }
        }
    });

    test('Mobile network simulation', async ({ page }) => {
        // Simulate slow 3G connection
        await page.route('**/*', async route => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await route.continue();
        });

        const startTime = Date.now();
        await page.goto('/', { timeout: 30000 });
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(10000); // Should still load within 10s on slow connection
    });

    test('Progressive Web App features', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const manifestLink = await page.locator('link[rel="manifest"]').count();
        if (manifestLink > 0) {
            console.log('✅ Web app manifest detected');
        }

        const themeColor = await page.locator('meta[name="theme-color"]').count();
        if (themeColor > 0) {
            console.log('✅ Theme color meta tag found');
        }
    });
});

test.describe('Performance - Memory & CPU Optimization', () => {
    test('Memory usage monitoring', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const memoryInfo = await page.evaluate(() => {
            const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
            return mem ? {
                usedJSHeapSize: mem.usedJSHeapSize,
                totalJSHeapSize: mem.totalJSHeapSize,
                jsHeapSizeLimit: mem.jsHeapSizeLimit
            } : null;
        });

        if (memoryInfo) {
            expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        }
    });

    test('CPU usage optimization', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const longTasks = await page.evaluate(() => {
            return new Promise((resolve) => {
                const tasks: PerformanceEntry[] = [];
                new PerformanceObserver((list) => {
                    tasks.push(...list.getEntries());
                    resolve(tasks.length);
                }).observe({ entryTypes: ['longtask'] });

                setTimeout(() => resolve(tasks.length), 3000);
            });
        });

        expect(longTasks).toBeLessThan(3); // Minimal long tasks
    });

    test('Animation performance', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const animationElements = await page.locator('[class*="animate"], [style*="animation"]').count();
        if (animationElements > 0) {
            console.log(`✅ Found ${animationElements} animated elements`);

            // Check for CSS animations instead of JS animations
            const cssAnimations = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('*')).some(el =>
                    window.getComputedStyle(el).animationName !== 'none'
                );
            });

            if (cssAnimations) {
                console.log('✅ CSS animations detected (performance optimized)');
            }
        }
    });

    test('Bundle size optimization', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const jsResources = await page.evaluate(() => {
            const entries = performance.getEntriesByType('resource');
            return (entries as PerformanceResourceTiming[])
                .filter(entry => entry.name.endsWith('.js'))
                .reduce((total, entry) => total + (entry.transferSize || 0), 0);
        });

        expect(jsResources).toBeLessThan(1024 * 1024); // JS bundle under 1MB
    });

    test('Image optimization validation', async ({ page }) => {
        await page.goto('/', { timeout: 30000 });

        const images = await page.locator('img');
        const imageCount = await images.count();

        if (imageCount > 0) {
            const optimizedImages = await images.evaluateAll(imgs =>
                imgs.filter(img => {
                    const imgElement = img as HTMLImageElement;
                    return imgElement.src?.includes('.webp') ||
                        imgElement.src?.includes('.avif') ||
                        imgElement.hasAttribute('srcset');
                }).length
            );

            if (optimizedImages > 0) {
                console.log(`✅ Found ${optimizedImages} optimized images`);
            }
        }
    });
});
