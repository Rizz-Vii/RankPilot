/**
 * Test Script: Team Rate Limit (TEAM-01 / PERF-01)
 * Minimal smoke: invokes seo-audit/run twice with low override header expecting second 429.
 * Assumes dev server running locally on default port (http://localhost:3000).
 */
async function main() {
    const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
    // Use unique team id per run to avoid stale rate-limit state
    const teamId = 'test-team-limit-' + Date.now();
    const url = base + '/api/seo-audit/run';
    const headers: any = { 'Content-Type': 'application/json', 'x-test-team-limit': '1' };
    const body = { url: 'https://example.com', teamId };
    const first = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const firstJson = await first.json();
    if (first.status === 429) {
        console.error('First request unexpectedly rate limited');
        process.exit(1);
    }
    const second = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const secondJson = await second.json();
    if (second.status !== 429) {
        console.error('Expected second request to be rate limited. Status:', second.status, secondJson);
        process.exit(1);
    }
    if (!second.headers.get('Retry-After')) {
        console.error('Missing Retry-After header on 429 response');
        process.exit(1);
    }
    console.log('[team-rate-limit] PASS', { retryAfter: second.headers.get('Retry-After') });
}

main().catch(e => { console.error('Test failed', e); process.exit(1); });
