/**
 * Load Testing Validation
 * RankPilot - Performance Load Testing
 */

import { expect, test } from '@playwright/test';
import { runProductionTests } from './production-test-suite';

test.describe('Load Testing', () => {
    test.setTimeout(120000); // 2 minutes for load tests

    test('concurrent user load test', async ({ page }) => {
        const report = await runProductionTests(page, 'http://localhost:3000');

        // Validate load test results
        expect(report.load.errorRate).toBeLessThan(0.1); // Less than 10% error rate
        expect(report.load.averageResponseTime).toBeLessThan(3000); // Less than 3 seconds average
        expect(report.load.maxResponseTime).toBeLessThan(10000); // Less than 10 seconds max
        expect(report.load.throughput).toBeGreaterThan(0.5); // At least 0.5 requests per second
    });

    test('API endpoint performance', async ({ request }) => {
        const endpoints = [
            '/api/health',
            '/',
            '/api/auth/session',
        ];

        for (const endpoint of endpoints) {
            const startTime = Date.now();
            const _response = await request.get(endpoint);
            const responseTime = Date.now() - startTime;

            // API should respond quickly
            expect(responseTime).toBeLessThan(2000);

            // Health endpoint should always be healthy
            if (endpoint === '/api/health') {
                expect(response.status()).toBe(200);
            }
        }
    });

    test('memory usage under load', async ({ page }) => {
        await page.goto('/');

        // Monitor memory usage during navigation
        const initialMemory = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Navigate through pages to simulate usage
        const pages = ['/', '/dashboard', '/neuroseo', '/'];
        for (const pagePath of pages) {
            await page.goto(pagePath);
            await page.waitForTimeout(1000);
        }

        const finalMemory = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Memory should not increase dramatically (allowing for reasonable growth)
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercentage = (memoryIncrease / initialMemory) * 100;

        expect(memoryIncreasePercentage).toBeLessThan(200); // Less than 200% increase
    });

    test('Core Web Vitals under load', async ({ page }) => {
        await page.goto('/');

        // Simulate multiple interactions
        const interactions = [
            () => page.click('button:visible').catch(() => { }),
            () => page.keyboard.press('Tab'),
            () => page.mouse.move(100, 100),
            () => page.evaluate(() => window.scrollTo(0, 100)),
        ];

        for (let _i = 0; i < 10; i++) {
            const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
            await randomInteraction();
            await page.waitForTimeout(100);
        }

        // Check that page remains responsive
        const isResponsive = await page.evaluate(() => {
            return document.readyState === 'complete' &&
                !document.querySelector('[data-loading="true"]');
        });

        expect(isResponsive).toBe(true);
    });

    test('database connection resilience', async ({ request }) => {
        // Test multiple concurrent requests to database-dependent endpoints
        const promises = [];

        for (let _i = 0; i < 5; i++) {
            promises.push(request.get('/api/user/profile'));
            promises.push(request.get('/api/projects'));
        }

        const results = await Promise.allSettled(promises);
        const failures = results.filter(r => r.status === 'rejected');

        // Should handle concurrent database requests gracefully
        expect(failures.length).toBeLessThan(results.length * 0.2); // Less than 20% failure rate
    });
});
