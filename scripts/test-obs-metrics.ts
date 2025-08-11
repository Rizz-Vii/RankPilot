#!/usr/bin/env ts-node
/** OBS-01 dedicated counters test */
import http from 'http';
import assert from 'assert';

function get(path: string): Promise<any> { return new Promise((resolve, reject) => { http.get({ hostname: 'localhost', port: process.env.PORT || 3000, path }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject); }); }
function postJson(path: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve(JSON.parse(b)); } catch (e) { resolve({}); }
            });
        });
        req.on('error', reject);
        req.write(data); req.end();
    });
}

function postStreamAwait(path: string, body: any, waitMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
            let buf = ''; const deadline = Date.now() + waitMs;
            res.on('data', c => { buf += c; if (buf.includes('\n\nevent: end')) resolve(); });
            res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.write(data); req.end();
        setTimeout(() => resolve(), waitMs + 50);
    });
}

async function main() {
    const before = await get('/api/neuroseo/metrics');
    const base = before.neuro || {};
    // Trigger guard strip (empty urls)
    await postJson('/api/neuroseo/stream', { urls: [], userId: 'obs-test' });
    // Trigger workflow run (valid)
    await postStreamAwait('/api/neuroseo/stream', { urls: ['https://obs.example/a'], userId: 'obs-test' });
    // Inject stripe webhook error counter reliably (test-only endpoint)
    await get('/api/neuroseo/test-stripe-error');
    await new Promise(r => setTimeout(r, 100));
    // Persist snapshot (optional)
    await postJson('/api/neuroseo/metrics-export', {});
    const after = await get('/api/neuroseo/metrics');
    const neuro = after.neuro;
    assert(neuro.workflowRuns >= (base.workflowRuns || 0) + 1, 'workflowRuns did not increment');
    assert(neuro.guardStrips >= (base.guardStrips || 0) + 1, 'guardStrips did not increment');
    assert(neuro.stripeWebhookErrors >= (base.stripeWebhookErrors || 0) + 1, 'stripeWebhookErrors did not increment');
    console.log('OBS METRICS TEST PASS', {
        delta: {
            workflowRuns: neuro.workflowRuns - (base.workflowRuns || 0),
            guardStrips: neuro.guardStrips - (base.guardStrips || 0),
            stripeWebhookErrors: neuro.stripeWebhookErrors - (base.stripeWebhookErrors || 0)
        }
    });
}
main().catch(e => { console.error('OBS METRICS TEST FAIL', e); process.exit(1); });
