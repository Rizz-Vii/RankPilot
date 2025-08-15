import fetch from 'node-fetch';

type Success = { path: string; status: number; limit: string | null; remaining: string | null; retry: string | null };
type Failure = { path: string; status: number; error: string };
type Result = Success | Failure;

async function check(path: string): Promise<Result> {
    const url = `http://localhost:3000${path}`;
    const res = await fetch(url);
    const h = res.headers;
    const limit = h.get('x-ratelimit-limit');
    const remaining = h.get('x-ratelimit-remaining');
    const retry = h.get('retry-after');
    return { path, status: res.status, limit, remaining, retry };
}

(async () => {
    const targets = ['/api/visualizations', '/api/ai/multi-model', '/api/finance/metrics', '/api/billing/invoices'];
    const results: Result[] = [];
    for (const t of targets) {
        try { results.push(await check(t)); } catch (e) { results.push({ path: t, status: -1, error: String(e) }); }
    }
    const ok = results.every(r => r.status !== -1 && ('limit' in r ? (r.limit || r.retry) : true));
    if (!ok) {
        console.error('[rate-limit-smoke] FAIL', results);
        process.exit(1);
    }
    console.log('[rate-limit-smoke] PASS', results);
})();
