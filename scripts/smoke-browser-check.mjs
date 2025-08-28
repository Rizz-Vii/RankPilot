// Simple Playwright smoke to capture console and network errors from key pages
// Usage: node scripts/smoke-browser-check.mjs

import { chromium } from '@playwright/test';

const HOSTING_URL = process.env.SMOKE_URL || 'https://rankpilot-h3jpc.web.app';
const SSR_URL = process.env.SMOKE_SSR_URL || 'https://ssrrankpiloth3jpc-thevwhkpdq-uc.a.run.app';

async function check(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMsgs = [];
    const failedRequests = [];

    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            consoleMsgs.push({ type, text: msg.text() });
        }
    });

    page.on('requestfailed', (req) => {
        failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    const result = { url, ok: true, status: null, console: [], network: [] };

    try {
        const resp = await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });
        result.status = resp?.status() ?? null;

        // Allow client-side scripts to initialize
        await page.waitForTimeout(4000);
    } catch (e) {
        result.ok = false;
        result.error = String(e);
    }

    result.console = consoleMsgs;
    result.network = failedRequests;

    await browser.close();
    return result;
}

async function main() {
    const targets = [HOSTING_URL, SSR_URL];
    const results = [];
    for (const t of targets) {
        results.push(await check(t));
    }

    // Print compact summary
    for (const r of results) {
        console.log('\n=== Smoke summary for', r.url, '===');
        console.log('HTTP status:', r.status, 'OK:', r.ok);
        if (r.error) {
            console.log('Navigation error:', r.error);
        }
        const errors = r.console.filter((m) => m.type === 'error');
        const warns = r.console.filter((m) => m.type === 'warning');
        console.log(`Console: ${errors.length} errors, ${warns.length} warnings`);
        if (errors.length) {
            console.log('First errors:');
            for (const m of errors.slice(0, 5)) console.log('-', m.text);
        }
        if (warns.length) {
            console.log('First warnings:');
            for (const m of warns.slice(0, 5)) console.log('-', m.text);
        }
        console.log('Failed requests:', r.network.length);
        for (const f of r.network.slice(0, 5)) {
            console.log('-', f.failure, f.url);
        }
    }

    // Exit non-zero if any console errors or nav failure
    const anyErrors = results.some((r) => !r.ok || r.console.some((m) => m.type === 'error'));
    process.exit(anyErrors ? 2 : 0);
}

main();
