#!/usr/bin/env ts-node
/* NEU-02: Ensure compact persisted doc <5KB and stable hash key matches signature */
import assert from 'assert';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import http from 'http';

async function postStream(body: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: process.env.PORT || 3000, path: '/api/neuroseo/stream', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
            res.on('data', () => { /* drain */ });
            res.on('end', resolve);
        });
        req.on('error', reject);
        req.write(data); req.end();
    });
}

function stableHash(urls: string[], type: string) {
    return Buffer.from(JSON.stringify({ u: [...urls].sort(), t: type })).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
}

async function main() {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const urls = ['https://example.com/x', 'https://example.com/y', 'https://example.com/z'];
    const analysisType = 'comprehensive';
    const hashKey = stableHash(urls, analysisType);
    await postStream({ urls, analysisType, userId: 'persist-tester', timeoutMs: 15000 });
    const snap = await db.collection('neuroSeoAnalyses').doc(hashKey).get();
    assert(snap.exists, 'persisted doc missing');
    const data = snap.data()!;
    const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    assert(size < 5000, `doc size exceeded: ${size}`);
    assert.equal(data.hashKey, hashKey, 'hashKey mismatch');
    console.log('NEU-02 persistence size/hash OK', { size, hashKey });
}

main().catch(e => { console.error('NEU-02 persistence test FAIL', e); process.exit(1); });
