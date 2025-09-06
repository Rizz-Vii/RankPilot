#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { DEV_USER, UNIFIED_TEST_USERS, type UnifiedTestUser } from '../testing/config/unified-test-users';
// Use require to access playwright binary packaging when @playwright/test types are present
const { chromium } = require('playwright');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(process.cwd(), 'test-results', '.auth');

async function ensureOutDir() {
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
}

function resolveUser(tierOrName: string): UnifiedTestUser | null {
    if (!tierOrName) return DEV_USER;
    const key = tierOrName.toLowerCase();
    if (key === 'dev' || key === 'developer') return DEV_USER;
    return (UNIFIED_TEST_USERS as Record<string, UnifiedTestUser>)[key] ?? null;
}

async function generateForUser(tier: string) {
    const user = resolveUser(tier);
    if (!user) {
        console.error(`Unknown test user tier: ${tier}`);
        return false;
    }

    console.log(`\n🔐 Generating storageState for: ${user.email} (${tier})`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Wait for common login inputs
        await page.waitForSelector('#email', { timeout: 20000 });
        await page.waitForSelector('#password', { timeout: 20000 });

        await page.fill('#email', user.email);
        await page.fill('#password', user.password ?? '');

        // Try to click a login button if present, otherwise submit the form
        const loginBtn = page.locator('[data-testid="login-button"], button:has-text("Log in"), button:has-text("Login"), button:has-text("Sign In")').first();
        if (await loginBtn.isVisible().catch(() => false)) {
            await loginBtn.click();
        } else {
            await page.locator('form').first().evaluate((f: HTMLFormElement) => (f.requestSubmit ? f.requestSubmit() : f.submit()));
        }

        // Wait for a representative authenticated indicator
        try {
            await page.waitForSelector('[data-testid="dashboard-content"], main, .main-content, [data-testid="user-menu"]', { timeout: 45000 });
            console.log('✅ Authentication appeared successful (dashboard indicator found)');
        } catch {
            // Give a last-chance wait for URL change
            const url = page.url();
            if (url.includes('/dashboard') || url.includes('/app') || url.includes('/home')) {
                console.log(`✅ Navigation indicates success: ${url}`);
            } else {
                console.warn('⚠️ Authentication may have failed or not fully propagated; storageState will still be saved for debugging');
            }
        }

        const outPath = path.join(OUT_DIR, `${tier}.json`);
        await context.storageState({ path: outPath });
        console.log(`💾 Saved storageState to ${outPath}`);
        await context.close();
        await browser.close();
        return true;
    } catch (err) {
        console.error(`❌ Failed to generate storageState for ${user.email}:`, (err as Error).message || err);
        try { await context.close(); } catch { }
        try { await browser.close(); } catch { }
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const tiers = args.length ? args : ['admin', 'starter', 'agency', 'enterprise'];
    await ensureOutDir();
    for (const t of tiers) {
        // sanitize tier to filename-friendly key
        const key = t.toLowerCase();
        // generate
        const ok = await generateForUser(key);
        if (!ok) console.warn(`Generation for ${key} failed — check the app auth state or credentials`);
    }
}

main().catch((e) => {
    console.error('Unhandled error generating storage states:', e);
    process.exit(1);
});
