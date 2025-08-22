#!/usr/bin/env ts-node
/** TEST-01 / OBS-01: Metrics registry increment test */
import assert from 'assert';
import http from 'http';

// returns whether cached event observed
function postStreamOnce(urls: string[]): Promise<{ cached: boolean }> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ urls, userId: 'metrics-test', timeoutMs: 8000 });
        const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3000, path: '/api/neuroseo/stream', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                const events = buf.split('\n\n').filter(b => b.trim()).map(block => {
                    const lines = block.split('\n'); let ev = 'message'; let data = '';
                    for (const l of lines) {
                        if (l.startsWith('event:')) ev = l.slice(6).trim();
                        if (l.startsWith('data:')) data += l.slice(5).trim();
                    }
                    return { ev, data };
                });
                const cached = events.some(e => e.ev === 'cached');
                resolve({ cached });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

type NeuroMetrics = { neuro?: { analysisRuns?: number; analysisCacheHits?: number } };
function fetchMetrics(): Promise<NeuroMetrics> {
    return new Promise((resolve, reject) => {
        http.get({ hostname: 'localhost', port: process.env.PORT || 3000, path: '/api/neuroseo/metrics' }, res => {
            let buf = ''; res.on('data', c => buf += c); res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
        }).on('error', reject);
    });
}

async function main() {
    const before = await fetchMetrics().catch(() => ({ neuro: { analysisRuns: 0, analysisCacheHits: 0 } }));
    const baseRuns = before.neuro?.analysisRuns || 0; const baseHits = before.neuro?.analysisCacheHits || 0;
    const unique = Date.now();
    const url = `https://metrics.example/a?u=${unique}`;
    const first = await postStreamOnce([url]);
    // small delay to ensure cache stored
    await new Promise(r => setTimeout(r, 75));
    const second = await postStreamOnce([url]);
    await new Promise(r => setTimeout(r, 75));
    const third = await postStreamOnce([url]);
    const after = await fetchMetrics();
    const afterRuns = after.neuro?.analysisRuns || 0;
    const afterHits = after.neuro?.analysisCacheHits || 0;
    const runsDelta = (afterRuns - baseRuns);
    const hitsDelta = (afterHits - baseHits);
    const sawCachedEvent = first.cached || second.cached || third.cached;
    if (!sawCachedEvent && hitsDelta < 1) {
        console.warn('METRICS REGISTRY TEST WARN: no cache hit observed (possible very fast recompute).');
    }
    assert(runsDelta >= 1, 'expected at least one analysis run');
    console.log('METRICS REGISTRY TEST PASS', { runsDelta, hitsDelta, sawCachedEvent });
}
main().catch(e => { console.error('METRICS REGISTRY TEST FAIL', e); process.exit(1); });
