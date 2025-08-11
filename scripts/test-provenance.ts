#!/usr/bin/env ts-node
// PROV-01 provenance enforcement smoke tests
import assert from 'assert';
import { sanitizeMarketingCampaignDoc } from '../src/lib/firebase/marketing-write-guard';
import { executeNeuroLive } from '../src/lib/neuroseo/live-exec';
import { adminDb } from '../src/lib/firebase-admin';

async function testMarketingPreservesProvenance() {
    const cleaned = sanitizeMarketingCampaignDoc({ name: 'Test', channel: 'email', impressions: 0, clicks: 0, spend: 0, period: '2025-08', __provenance: 'synthetic' });
    assert.equal(cleaned.__provenance, 'synthetic', 'marketing provenance preserved');
}

async function testMarketingDoesNotInventProvenance() {
    const cleaned = sanitizeMarketingCampaignDoc({ name: 'NoProv', channel: 'email', impressions: 0, clicks: 0, spend: 0, period: '2025-08' });
    assert.ok(!('__provenance' in cleaned), 'sanitizer should not add provenance when absent');
}

async function testNeuroAnalysisPersistenceProvenance() {
    const userId = 'prov_user';
    const urls = ['https://example.com/p'];
    const res = await executeNeuroLive({ urls, userId });
    const hashKey = Buffer.from(JSON.stringify({ u: [...urls].sort(), t: 'comprehensive' })).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
    const doc = await adminDb.collection('neuroSeoAnalyses').doc(hashKey).get();
    if (!doc.exists) {
        console.warn('Skipping persistence provenance assertion (mock admin)');
        return;
    }
    const data = doc.data()!;
    assert.ok(['live', 'synthetic'].includes(data.__provenance), 'invalid analysis provenance');
}

async function main() {
    await testMarketingPreservesProvenance();
    await testNeuroAnalysisPersistenceProvenance();
    await testMarketingDoesNotInventProvenance();
    console.log('PROV-01 provenance tests completed');
}
main().catch(e => { console.error('PROV-01 provenance tests FAILED', e); process.exit(1); });
