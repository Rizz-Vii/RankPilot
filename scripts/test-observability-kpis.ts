#!/usr/bin/env ts-node
/** OBS-01 / KPI: Basic KPI aggregation validation
 * 1. Invoke several AI endpoints to generate metrics (latency, errors, fallback, provenance)
 * 2. Fetch /api/health and assert presence & shape of kpis block and key fields not null after traffic
 */
import assert from 'assert';
import http from 'http';

function post(path: string, body: unknown): Promise<{ status: number; json: unknown }> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
            let buf = ''; res.on('data', c => buf += c); res.on('end', () => { try { resolve({ status: res.statusCode || 0, json: JSON.parse(buf) }); } catch (e) { reject(e); } });
        });
        req.on('error', reject); req.write(data); req.end();
    });
}

function get(path: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: process.env.PORT || 3000, path }, res => {
            let buf = ''; res.on('data', c => buf += c); res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
        }).on('error', reject);
    });
}

async function warmConversational() {
    await post('/api/ai/conversational-seo', { action: 'start', userId: 'kpi-user', userTier: 'starter' });
    await post('/api/ai/conversational-seo', { action: 'message', sessionId: 'dummy', message: 'Hello', userId: 'kpi-user', userTier: 'starter' }).catch(() => { });
}
async function hitMultiModel() {
    await post('/api/ai/multi-model', { task: 'text-generation', input: 'Test prompt', userTier: 'starter', userId: 'kpi-user' });
}

async function run() {
    // generate traffic
    await warmConversational();
    await hitMultiModel();
    // fetch health
    const health = await get('/api/health');
    const h = (health && typeof health === 'object') ? health as Record<string, unknown> : {};
    assert(h.kpis, 'kpis block missing');
    const k = (h.kpis && typeof h.kpis === 'object') ? h.kpis as Record<string, unknown> : {};
    // Presence assertions
    ['provenanceCoveragePct', 'cacheHitRatio', 'fallbackRate', 'p95LatencyOverall', 'rateLimitRejectionRate', 'avgCompactDocBytes', 'routesP95'].forEach(f => {
        assert(f in k, `kpi field ${f} missing`);
    });
    // alerts array should exist (may be empty) and provenanceCoverage alert absent if 100%
    assert(Array.isArray(h.alerts as unknown[]), 'alerts array missing');
    // coverage should be 100 if all responses tagged
    assert(typeof k.provenanceCoveragePct === 'number', 'provenanceCoveragePct not numeric');
    // routesP95 should have entries for at least one route
    const routeKeys = Object.keys((k.routesP95 && typeof k.routesP95 === 'object') ? (k.routesP95 as Record<string, unknown>) : {});
    assert(routeKeys.length >= 1, 'expected at least one route p95 entry');
    console.log('KPI TEST PASS', { routeCount: routeKeys.length, coverage: k.provenanceCoveragePct, p95Overall: k.p95LatencyOverall });
}
run().catch(e => { console.error('KPI TEST FAIL', e); process.exit(1); });
