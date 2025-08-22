import { expect } from 'chai';
import type { AppOptions } from 'firebase-admin/app';
import { getApps, initializeApp } from 'firebase-admin/app';
import { __testPerformWebCrawl } from '../src/api/audit';

describe('audit crawler modernization (T10)', () => {
    before(() => { if (!getApps().length) initializeApp({ projectId: 'demo-test' } as AppOptions); });

    it('falls back deterministically when fetch fails and Firecrawl disabled', async () => {
        const originalFetch = global.fetch;
        (global as unknown as { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }).fetch = async () => { throw new Error('network blocked'); };
        try {
            const res = await __testPerformWebCrawl('https://example.com', 1, true) as unknown as { raw: { synthetic?: boolean }; loadTime: number; headings: { h1: string[] } };
            expect(res.raw.synthetic).to.equal(true);
            expect(res.loadTime).to.equal(1800); // deterministic synthetic load time
            expect(res.headings.h1[0]).to.equal('Synthetic H1');
        } finally {
            (global as unknown as { fetch: typeof global.fetch }).fetch = originalFetch;
        }
    });

    it('respects robots disallow (blocked link not fetched) in BFS fallback', async () => {
        const calls: string[] = [];
        const htmlRoot = '<html><head><title>Root</title><meta name="description" content="desc"/></head><body><a href="/blocked/page">b</a><a href="/allowed/page">a</a><h1>Main</h1></body></html>';
        const htmlAllowed = '<html><head><title>Allowed</title></head><body><h1>Allowed</h1></body></html>';
        const robots = 'User-agent: *\nDisallow: /blocked';
        const originalFetch = global.fetch;
        (global as unknown as { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }).fetch = async (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();
            calls.push(url);
            if (url.endsWith('/robots.txt')) return new Response(robots, { status: 200 });
            if (url.endsWith('/allowed/page')) return new Response(htmlAllowed, { status: 200 });
            if (url === 'https://example.org/') return new Response(htmlRoot, { status: 200 });
            return new Response('NF', { status: 404 });
        };
        try {
            const res = await __testPerformWebCrawl('https://example.org/', 2, false) as unknown as { raw: { directFetch?: boolean } };
            expect(res.raw.directFetch).to.equal(true);
            const blockedCalled = calls.some(c => c.includes('/blocked/page'));
            expect(blockedCalled).to.equal(false);
        } finally {
            (global as unknown as { fetch: typeof global.fetch }).fetch = originalFetch;
        }
    });
});
