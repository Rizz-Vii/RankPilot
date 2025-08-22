#!/usr/bin/env ts-node
/** PROV-01: Enumerate AI endpoints and verify provenance tagging coverage.
 * Strategy:
 * 1. Static scan of src/app/api for directories likely AI (heuristic keywords or presence of 'provenance' import)
 * 2. Hit each endpoint with a lightweight GET or POST (where safe) and inspect JSON/top-level stream first chunk for __provenance
 * 3. Emit JSON summary and non-zero exit if any missing
 */
import fs from 'fs';
import http from 'http';
import path from 'path';

interface EndpointResult { path: string; method: string; ok: boolean; provenance?: string; status?: number; error?: string; }

const apiRoot = path.join(process.cwd(), 'src', 'app', 'api');
const aiIndicators = ['neuroseo', 'chat', 'ai', 'seo', 'multi-model', 'conversational'];

function discover(): string[] {
    const found: string[] = [];
    function walk(dir: string, rel: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isDirectory()) {
                const next = path.join(dir, e.name);
                const relNext = path.join(rel, e.name);
                // Next.js route folder contains route.ts or route.js
                const routeFile = fs.existsSync(path.join(next, 'route.ts')) || fs.existsSync(path.join(next, 'route.js'));
                const indicator = aiIndicators.some(k => relNext.includes(k));
                if (routeFile && indicator) found.push('/api/' + relNext.replace(/\\/g, '/'));
                walk(next, relNext);
            }
        }
    }
    walk(apiRoot, '');
    return Array.from(new Set(found)).sort();
}

function fetchJson(ep: string, method: string): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
        const data = method === 'POST' ? JSON.stringify({ ping: true }) : undefined;
        const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3000, path: ep, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : undefined }, res => {
            let buf = ''; res.on('data', c => buf += c); res.on('end', () => { try { resolve({ status: res.statusCode || 0, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode || 0, body: buf }); } });
        });
        req.on('error', reject);
        if (data) { req.write(data); }
        req.end();
    });
}

async function main() {
    const endpoints = discover();
    const results: EndpointResult[] = [];
    for (const ep of endpoints) {
        const method = ep.includes('/stream') ? 'GET' : 'GET'; // default to GET to avoid side effects; enhance per endpoint as needed
        try {
            const { status, body } = await fetchJson(ep, method);
            let provenance: string | undefined;
            if (body && typeof body === 'object' && body !== null && '__provenance' in body) {
                const p = (body as Record<string, unknown>).__provenance;
                provenance = typeof p === 'string' ? p : undefined;
            }
            results.push({ path: ep, method, ok: provenance !== undefined, provenance, status });
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
            results.push({ path: ep, method, ok: false, error: msg });
        }
    }
    const missing = results.filter(r => !r.ok);
    if (missing.length) {
        console.error('PROVENANCE ENUMERATION FAIL');
        missing.forEach(m => console.error(` - ${m.path} status=${m.status} error=${m.error || 'no __provenance'}`));
        fs.writeFileSync('provenance-enumeration.json', JSON.stringify({ results }, null, 2));
        process.exit(1);
    } else {
        console.log('Provenance enumeration passed for endpoints:', results.map(r => r.path).join(', '));
        fs.writeFileSync('provenance-enumeration.json', JSON.stringify({ results }, null, 2));
    }
}
main().catch(e => { console.error('Enumerator error', e); process.exit(1); });
