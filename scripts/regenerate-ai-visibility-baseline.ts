#!/usr/bin/env ts-node
/*
 * Regenerates AI visibility drift baseline fixture.
 * Usage: npm run ai:baseline:regen
 */
import fetch from 'node-fetch';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    const target = `${baseURL.replace(/\/$/, '')}/api/neuroseo/ai-visibility`;
    const body = { url: 'https://example.com', query: 'seo optimization', analysisType: 'quick' };
    const resp = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) {
        console.error('Request failed', resp.status, await resp.text());
        process.exit(1);
    }
    const json = await resp.json();
    const dir = path.resolve(process.cwd(), 'test-results', 'fixtures');
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, 'ai-visibility-baseline.json');
    fs.writeFileSync(out, JSON.stringify(json, null, 2));
    console.log('Baseline regenerated:', out);
}

main().catch(e => { console.error(e); process.exit(1); });
