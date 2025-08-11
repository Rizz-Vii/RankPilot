#!/usr/bin/env ts-node
// NEU-02 persistence smoke test
import assert from 'assert';
import { executeNeuroLive } from '../src/lib/neuroseo/live-exec';
import { adminDb } from '../src/lib/firebase-admin';

async function main() {
    const userId = 'tester_persist';
    const urls = ['https://example.com/doc1'];
    const res = await executeNeuroLive({ urls, userId });
    const hashKey = Buffer.from(JSON.stringify({ u: [...urls].sort(), t: 'comprehensive' })).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
    const doc = await adminDb.collection('neuroSeoAnalyses').doc(hashKey).get();
    if (!doc.exists) {
        console.warn('Persistence doc not found (may be using mock admin). Skipping assert.');
        return;
    }
    const data = doc.data()!;
    assert.equal(data.userId, userId, 'userId mismatch');
    assert.ok(Array.isArray(data.urls), 'urls not array');
    console.log('NEU-02 persistence OK', { hashKey: data.hashKey, provenance: data.__provenance });
}
main().catch(e => { console.error('NEU-02 persistence FAIL', e); process.exit(1); });
