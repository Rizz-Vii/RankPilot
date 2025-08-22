import { expect } from 'chai';
import type { AppOptions } from 'firebase-admin/app';
import { getApps, initializeApp } from 'firebase-admin/app';
import { __testPerformWebCrawl } from '../src/api/audit';

// This test ensures performWebCrawl returns a structure that passes CrawlResultSchema (indirectly via runSeoAudit validation path).
// We invoke the helper directly for speed and validate critical fields; schema enforcement in runSeoAudit will fallback if invalid.

describe('crawl result schema (T11)', () => {
    before(() => { if (!getApps().length) initializeApp({ projectId: 'demo-test' } as AppOptions); });

    it('returns crawl result with required fields for synthetic fallback path', async () => {
        const res = await __testPerformWebCrawl('https://example.com/', 1, true) as unknown as Record<string, unknown>;
        expect(res).to.have.property('url');
        expect(res).to.have.property('title');
        expect(res).to.have.nested.property('headings.h1');
        expect(res).to.have.property('loadTime');
        expect(res).to.have.property('mobileOptimized');
    });
});
