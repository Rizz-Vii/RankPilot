/**
 * Playwright Configuration with Enhanced Caching & High Memory
 * Optimized for AI-heavy Content Analyzer with state preservation
 */

import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
const storageStatePath = process.env.PLAYWRIGHT_STORAGE || 'test-results/.auth/admin.json';
const hasStorage = fs.existsSync(storageStatePath);
import path from 'path';

export default defineConfig({
    testDir: './testing/specs/main',
    globalSetup: path.resolve(__dirname, './testing/specs/main/global-setup-warming-cached.ts'),
    globalTeardown: path.resolve(__dirname, './testing/specs/main/global-teardown.ts'),

    // Enhanced for state preservation
    fullyParallel: false, // Sequential to maintain cache benefits
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0, // Reduced retries since cache should prevent failures
    workers: 1, // Single worker to preserve warming state

    // Enhanced reporting for cache analysis
    reporter: [
        ['html', { open: 'never', outputFolder: 'testing/results/high-memory-reports' }],
        ['list'],
        ['json', { outputFile: 'testing/results/high-memory-test-results.json' }]
    ],

    use: {
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Enhanced timeouts for AI-heavy pages
        navigationTimeout: 45000, // Increased for AI compilation
        actionTimeout: 30000, // Increased for heavy components

        storageState: hasStorage ? storageStatePath : undefined,
    }, projects: [
        {
            name: 'high-memory-desktop',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--memory-pressure-off',
                        '--max_old_space_size=6144', // High memory for AI components
                        '--js-flags="--max-old-space-size=6144"',
                        // Enhanced caching options
                        '--aggressive-cache-discard',
                        '--enable-precise-memory-info',
                        '--enable-memory-info',
                        // Performance optimizations
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-background-timer-throttling',
                        '--disable-features=TranslateUI',
                        '--disable-ipc-flooding-protection',
                    ],
                    // Enhanced browser cache
                    env: {
                        NODE_OPTIONS: '--max-old-space-size=6144 --max-semi-space-size=512',
                    }
                },
            },
        },
        {
            name: 'high-memory-mobile',
            use: {
                ...devices['Pixel 5'],
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--memory-pressure-off',
                        '--max_old_space_size=4096', // Mobile with high memory
                        '--js-flags="--max-old-space-size=4096"',
                        '--aggressive-cache-discard',
                        '--enable-precise-memory-info',
                    ],
                    env: {
                        NODE_OPTIONS: '--max-old-space-size=4096 --max-semi-space-size=256',
                    }
                },
            },
        },
    ],

    // Enhanced output configuration with cache directory
    outputDir: 'testing/results/high-memory/',
});
