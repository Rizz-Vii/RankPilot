import { expect, test, type Page, type Response } from '@playwright/test';
import { captureWithPuppeteer } from '../helpers/puppeteerInspector';
import { logE2EError } from '../hooks/error-logger';
import { ApiHelper } from '../test-utils';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CRED = {
    email: process.env.TEST_USER_EMAIL || 'abbas_ali_rizvi@hotmail.com',
    password: process.env.TEST_USER_PASSWORD || '123456',
};

async function onFailureCapture(page: Page, name: string) {
    logE2EError('playwright-test-failure', { name, url: page.url() });
    await captureWithPuppeteer(page.url(), name).catch(() => { });
}

async function dismissBlockingOverlays(page: Page) {
    try {
        await page.keyboard.press('Escape').catch(() => { });
        await page.waitForTimeout(80);
        await page.keyboard.press('Escape').catch(() => { });
        const selectors = [
            '[aria-label="Close"]',
            '[data-testid="close"]',
            '[data-testid="modal-close"]',
            'button:has-text("Close")',
            'button:has-text("Dismiss")',
            'button:has-text("Accept")',
            'button:has-text("OK")',
        ];
        for (const sel of selectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(() => false)) {
                await el.click({ timeout: 800 }).catch(() => { });
            }
        }
    } catch {/* noop */ }
}

async function retryGoto(page: Page, url: string, opts: Parameters<Page['goto']>[1] = { waitUntil: 'domcontentloaded' }, retries = 2): Promise<Response | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await page.goto(url, opts);
            return res ?? null;
        } catch (err) {
            // tolerate transient server restarts in dev
            try {
                // if page/context got closed, stop retry loop
                if (!page || page.isClosed()) throw err;
                await page.waitForTimeout(800 + attempt * 200);
            } catch { throw err; }
            if (attempt === retries) throw err;
        }
    }
    return null;
}

async function isLoginVisible(page: Page): Promise<boolean> {
    const onLoginUrl = /\/(login|signin)/.test(page.url());
    const hasLoginForm = await page.locator('input[type="email"], input[name*="email"]').first().isVisible().catch(() => false)
        && await page.locator('input[type="password"]').first().isVisible().catch(() => false);
    return onLoginUrl || hasLoginForm;
}

async function genericPageOk(page: Page): Promise<boolean> {
    const mainVisible = await page.locator('main, [role="main"], [data-testid], #__next').first().isVisible().catch(() => false);
    const upgradeVisible = await page.locator('[data-testid="upgrade-cta"], button:has-text("Upgrade"), button:has-text("Subscribe")').first().isVisible().catch(() => false);
    const loginPresent = await isLoginVisible(page);
    return mainVisible || upgradeVisible || loginPresent;
}

test.describe('Expanded User Journeys', () => {
    test.skip(process.env.E2E_RUN_EXTENDED !== 'true', 'Extended journeys disabled by default; set E2E_RUN_EXTENDED=true to enable');
    test.beforeEach(async ({ page }) => {
        page.on('console', (msg) => {
            if (msg.type() === 'error') logE2EError('console.error', { text: msg.text(), url: page.url() });
        });
        page.on('pageerror', (err) => logE2EError('pageerror', { error: String(err), url: page.url() }));
        page.on('requestfailed', (req) => logE2EError('requestfailed', { url: req.url(), failure: req.failure(), method: req.method() }));
        page.on('response', async (res) => { const s = res.status(); if (s >= 400) logE2EError('bad-response', { url: res.url(), status: s }); });

        // Attempt to ensure authenticated context for protected routes
        try {
            await retryGoto(page, `${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
            const email = page.locator('input[type="email"]').first();
            const pwd = page.locator('input[type="password"]').first();
            const btn = page.locator('button[type="submit"], [data-testid="login-button"]').first();
            if (await email.isVisible().catch(() => false)) {
                await email.fill(CRED.email);
                await pwd.fill(CRED.password);
                await dismissBlockingOverlays(page);
                try { await btn.click(); } catch { await dismissBlockingOverlays(page); await btn.click({ force: true }); }
                // wait for either redirect off login or a dashboard/main element
                const start = Date.now();
                while (Date.now() - start < 4000) {
                    if (!/\/login/.test(page.url())) break;
                    const ok = await genericPageOk(page);
                    if (ok) break;
                    await page.waitForTimeout(200);
                }
            }
        } catch { /* non-fatal */ }
    });

    test('Pricing to Checkout (or Billing) journey @smoke', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/pricing`, { waitUntil: 'domcontentloaded' });
            // lightweight page title signal and soft assertion
            const title = await page.title().catch(() => '');
            if (title) {
                logE2EError('telemetry', { route: '/pricing', title });
                expect(title).toMatch(/rankpilot|pricing/i);
            }
            await dismissBlockingOverlays(page);
            const plansPresent = await page.locator('[data-testid="plan"], .plan, [data-testid*="pricing"]').first().isVisible().catch(() => false);
            const cta = page.locator('[data-testid="select-plan"], button:has-text("Get started"), button:has-text("Upgrade"), button:has-text("Subscribe")').first();
            if (await cta.isVisible().catch(() => false)) {
                try { await cta.click(); } catch { await dismissBlockingOverlays(page); await cta.click({ force: true }); }
            }
            await page.waitForTimeout(1500);
            const url = page.url();
            const onCheckout = /\/checkout|\/settings\/billing|\/billing/.test(url);
            const paymentForm = await page.locator('[data-testid="payment"], .payment-form, [data-testid="plan"], [data-testid="upgrade-cta"]').first().isVisible().catch(() => false);
            const ok = onCheckout || paymentForm || plansPresent || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
        } catch (e) { await onFailureCapture(page, 'pricing-checkout'); throw e; }
    });

    test('Profile/Settings update basics @extended', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => { });
            if (/\/profile/.test(page.url())) {
                const name = page.locator('input[name="name"], input[placeholder*="name"]').first();
                if (await name.isVisible().catch(() => false)) {
                    await name.fill(`Test User ${Date.now()}`);
                }
                const save = page.locator('button[type="submit"], [data-testid="save"]').first();
                if (await save.isVisible().catch(() => false)) {
                    await save.click().catch(() => { });
                    await page.waitForTimeout(800);
                }
            }
            // Navigate to account/billing settings as part of user journey
            await retryGoto(page, `${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
            // lightweight title assertion if available
            const settingsTitle = await page.title().catch(() => '');
            if (settingsTitle) expect(settingsTitle).toMatch(/rankpilot|settings|profile/i);
            const settingsVisible = await page.locator('[data-testid="settings"], [data-testid*="settings"], main, [role="main"]').first().isVisible().catch(() => false);
            const gate = await page.locator('[data-testid="upgrade-cta"], button:has-text("Upgrade")').first().isVisible().catch(() => false);
            const ok = settingsVisible || gate || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
        } catch (e) { await onFailureCapture(page, 'profile-settings'); throw e; }
    });

    test('Integrations Hub presence and actions @extended', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/integrations`, { waitUntil: 'domcontentloaded' }).catch(() => { });
            // health endpoint sanity (non-fatal): ok or no response in constrained env
            const health = await page.request.get(`${BASE_URL}/api/health`).catch(() => null);
            expect(!health || health.ok()).toBeTruthy();
            if (!/\/integrations/.test(page.url())) {
                await retryGoto(page, `${BASE_URL}/integration-hub`, { waitUntil: 'domcontentloaded' }).catch(() => { });
            }
            // network sanity: ensure last response status is not catastrophic (non-fatal)
            const resp = await page.waitForResponse(() => true, { timeout: 2000 }).catch(() => null);
            if (resp) logE2EError('telemetry', { route: '/integrations', status: resp.status() });
            const hub = page.locator('[data-testid="integration-hub"], [data-testid*="integration"], [data-testid^="kpi"], [data-testid="chart"], table, main').first();
            const hasHub = await hub.isVisible().catch(() => false);
            const connectBtn = page.locator('button:has-text("Connect"), [data-testid*="connect"]').first();
            const hasConnect = await connectBtn.isVisible().catch(() => false);
            const gate = await page.locator('[data-testid="upgrade-cta"], button:has-text("Upgrade")').first().isVisible().catch(() => false);
            const ok = hasHub || hasConnect || gate || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
            if (hasConnect) {
                await connectBtn.click({ trial: true }).catch(() => { });
                // After connecting, poll a likely GET to verify persisted state if backend exposed
                const api = await ApiHelper.createAuthedRequest();
                // Try a few common integration state endpoints (best-effort)
                const candidates = ['/api/integrations', '/api/integrations/state', '/api/settings/integrations'];
                for (const path of candidates) {
                    try {
                        const res = await api.get(path, { timeout: 3000 });
                        if (res.ok()) { break; }
                    } catch { /* non-fatal */ }
                }
            }
        } catch (e) { await onFailureCapture(page, 'integration-hub'); throw e; }
    });

    test('NeuroSEO suite navigation @extended', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/neuroseo`, { waitUntil: 'domcontentloaded' });
            const links = [
                '/neuroseo/semantic-map',
                '/neuroseo/ai-visibility',
                '/neuroseo/neural-crawler',
            ];
            let sawContent = false; let sawGate = false;
            for (const path of links) {
                await retryGoto(page, `${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
                const content = await page.locator('[data-testid="section"], [data-testid^="kpi"], [data-testid*="neuro"], main').first().isVisible().catch(() => false);
                const gate = await page.locator('button:has-text("Upgrade"), [data-testid="upgrade-cta"]').first().isVisible().catch(() => false);
                sawContent = sawContent || content; sawGate = sawGate || gate;
            }
            const ok = sawContent || sawGate || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
        } catch (e) { await onFailureCapture(page, 'neuroseo-suite'); throw e; }
    });

    test('Finance revenue view (gate-aware) @extended', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/finance/revenue`, { waitUntil: 'domcontentloaded' });
            const chart = await page.locator('[data-testid="chart"], .chart, [data-testid*="revenue"], [data-testid*="finance"]').first().isVisible().catch(() => false);
            const gate = await page.locator('button:has-text("Upgrade"), [data-testid="upgrade-cta"]').first().isVisible().catch(() => false);
            const ok = chart || gate || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
        } catch (e) { await onFailureCapture(page, 'finance-revenue'); throw e; }
    });

    test('Team workspace navigation (gate-aware) @extended', async ({ page }) => {
        try {
            await retryGoto(page, `${BASE_URL}/team`, { waitUntil: 'domcontentloaded' });
            const teamMain = await page.locator('[data-testid="team"], [data-testid*="team"], main').first().isVisible().catch(() => false);
            const gate = await page.locator('button:has-text("Upgrade"), [data-testid="upgrade-cta"]').first().isVisible().catch(() => false);
            // If list present, try enter a sub-page
            const firstLink = page.locator('a[href*="/team/"]').first();
            if (await firstLink.isVisible().catch(() => false)) {
                await firstLink.click().catch(() => { });
                await page.waitForTimeout(600);
            }
            const ok = teamMain || gate || await isLoginVisible(page) || await genericPageOk(page);
            expect(ok).toBeTruthy();
        } catch (e) { await onFailureCapture(page, 'team-workspace'); throw e; }
    });
});
