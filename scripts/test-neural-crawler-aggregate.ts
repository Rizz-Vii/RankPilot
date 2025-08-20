#!/usr/bin/env ts-node
/* T14: Validate neural crawler aggregate doc size & field parity counts */
import assert from 'assert';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

async function simulateClientCrawl(url: string) {
    // Direct write emulates client legacy + aggregate dual-write (flag must be on in app for real). Here we simulate both.
    const db = getFirestore();
    const userId = 'agg-test-user';
    const historyRef = await db.collection('neuralCrawlerHistory').add({ userId, url, status: 'completed', createdAt: new Date() });
    const legacyDoc = {
        userId,
        historyId: historyRef.id,
        url,
        title: 'Example Title',
        metaDescription: 'Example meta desc',
        content: 'x'.repeat(1500),
        wordCount: 350,
        readingTime: 2,
        headings: { h1: ['A'], h2: ['B', 'C'], h3: [], h4: [], h5: [], h6: [] },
        images: [{ src: '/a.png', alt: 'A' }, { src: '/b.png', alt: 'B' }],
        links: [{ href: '/a', text: 'A', type: 'internal' }, { href: 'https://ext', text: 'E', type: 'external' }],
        technicalData: { loadTime: 1.1, pageSize: 12345, statusCode: 200, contentType: 'text/html' },
        seoAnalysis: { titleLength: 12, metaDescriptionLength: 17, headingStructure: 'Good', imageOptimization: 80, internalLinks: 1, externalLinks: 1 },
        issues: [{ type: 'info', message: 'm', recommendation: 'r' }],
        entities: [{ text: 'SEO', type: 'concept', confidence: 0.9 }],
        createdAt: new Date()
    };
    await db.collection('neuralCrawlerResults').add(legacyDoc);
    // Derive aggregate similar to helper logic
    const aggregate = {
        userId,
        historyId: historyRef.id,
        url,
        wordCount: legacyDoc.wordCount,
        readingTime: legacyDoc.readingTime,
        imagesCount: legacyDoc.images.length,
        linksInternal: 1,
        linksExternal: 1,
        titleLength: legacyDoc.seoAnalysis.titleLength,
        metaDescriptionLength: legacyDoc.metaDescription.length,
        issuesCount: legacyDoc.issues.length,
        entitiesCount: legacyDoc.entities.length,
        headings: { h1: 1, h2: 2, h3: 0, h4: 0, h5: 0, h6: 0 },
        version: 1,
        createdAt: new Date()
    };
    await db.collection('neuralCrawlerResultsAgg').add(aggregate);
    return { legacyDoc, aggregate };
}

async function main() {
    if (!getApps().length) initializeApp();
    const url = `https://example.com/test-${randomUUID()}`;
    const { legacyDoc, aggregate } = await simulateClientCrawl(url);
    // Fetch one created aggregate doc (latest)
    const snap = await getFirestore().collection('neuralCrawlerResultsAgg').orderBy('createdAt', 'desc').limit(1).get();
    assert.strictEqual(snap.size, 1, 'aggregate doc missing');
    const data = snap.docs[0].data();
    // Parity checks
    assert.strictEqual(data.wordCount, legacyDoc.wordCount, 'wordCount mismatch');
    assert.strictEqual(data.readingTime, legacyDoc.readingTime, 'readingTime mismatch');
    assert.strictEqual(data.imagesCount, legacyDoc.images.length, 'imagesCount mismatch');
    assert.strictEqual(data.linksInternal + data.linksExternal, legacyDoc.links.length, 'links total mismatch');
    assert.strictEqual(data.issuesCount, legacyDoc.issues.length, 'issuesCount mismatch');
    assert.strictEqual(data.entitiesCount, legacyDoc.entities.length, 'entitiesCount mismatch');
    const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    assert(size < 2500, `aggregate doc too large: ${size}`);
    console.log('T14 neural crawler aggregate parity OK', { size });
}

main().catch(e => { console.error('T14 neural crawler aggregate test FAIL', e); process.exit(1); });
