/**
 * Global Teardown for RankPilot E2E Tests
 * Cleans up test environment and data
 */

import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';

async function globalTeardown(config: FullConfig) {
    console.log('Starting E2E test global teardown');

    try {
        // Launch browser for cleanup
        const browser = await chromium.launch();
        const page = await browser.newPage();

        // Clean up any test data created during tests
        await cleanupTestArtifacts(page);

        await browser.close();

        // Generate consolidated E2E error report (best-effort)
        try {
            // Prefer tsx to execute TS directly
            const viaTsx = spawnSync('npx', ['-y', 'tsx', 'scripts/generate-e2e-error-report.ts'], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            if (viaTsx.status !== 0) {
                // Fallback to Node ESM dynamic import
                spawnSync(process.execPath, ['-e', "import('./scripts/generate-e2e-error-report.ts').catch(()=>{})"], {
                    cwd: process.cwd(),
                    stdio: 'inherit'
                });
            }
        } catch {
            // ignore
        }

        console.log('E2E test global teardown completed successfully');
    } catch (error) {
        console.error('E2E test global teardown failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

async function cleanupTestArtifacts(page: any) {
    console.log('Cleaning up test artifacts');

    try {
        // Clear any test data from local storage
        await page.evaluate(() => {
            try {
                // Clear test-specific local storage items
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('test-') || key.includes('test-user'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Clear test-specific session storage
                const sessionKeysToRemove = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.startsWith('test-') || key.includes('test-user'))) {
                        sessionKeysToRemove.push(key);
                    }
                }
                sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
            } catch (e) {
                // Ignore security errors in restricted contexts
                console.log('Storage access restricted during cleanup, continuing...');
            }
        });

        console.log('Test artifacts cleanup completed');
    } catch (error) {
        console.error('Test artifacts cleanup failed, but continuing...', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
} export default globalTeardown;
