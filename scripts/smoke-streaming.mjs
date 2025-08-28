// Focused Playwright smoke for streaming endpoints on Hosting URL only
import { chromium } from '@playwright/test';

const HOSTING_URL = process.env.SMOKE_URL || 'https://rankpilot-h3jpc.web.app';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMsgs = [];
    const failed = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            consoleMsgs.push(msg.text());
        }
    });
    page.on('requestfailed', (req) => {
        failed.push({ url: req.url(), err: req.failure()?.errorText });
    });

    const url = HOSTING_URL;
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const status = res?.status();

    // Trigger SSE endpoints silently
    try {
        await page.evaluate(async () => {
            try {
                // Fire and forget SSE probes
                const s1 = new EventSource('/api/streaming/real-time?action=sse&clientId=smoke');
                setTimeout(() => s1.close(), 2000);
                const s2 = fetch('/api/streaming?action=metrics').then(() => { }).catch(() => { });
                void s2;
            } catch { }
        });
    } catch { }

    // Let the page settle
    await page.waitForTimeout(4000);
    await browser.close();

    // Report
    console.log('HTTP status', status);
    const connClosed = consoleMsgs.filter((t) => /Connection closed\.|The operation was aborted|NetworkError/i.test(t));
    console.log('Console errors/warnings:', consoleMsgs.length);
    if (connClosed.length) {
        console.log('First network abort-like messages:', connClosed.slice(0, 5));
    }
    console.log('Failed requests:', failed.length);
    if (failed.length) {
        for (const f of failed.slice(0, 10)) {
            console.log('-', f.err || 'unknown', f.url);
        }
    }

    if (status !== 200 || connClosed.length > 0) process.exit(2);
    process.exit(0);
}

run();
