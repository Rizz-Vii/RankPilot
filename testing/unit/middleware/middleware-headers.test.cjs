// Install require hooks before loading ts-node so they apply to ts compiled modules
const Module = require('module');
const path = require('path');
const fs = require('fs');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'next/server') return path.join(process.cwd(), 'testing/stubs/next/server.js');
    if (request.startsWith('@/')) {
        const base = path.join(process.cwd(), 'src', request.slice(2));
        const candidates = [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx'];
        for (const c of candidates) { if (fs.existsSync(c)) return c; }
    }
    return origResolve.call(this, request, parent, isMain, options);
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request.endsWith('/middleware/rate-limit')) {
        return { rateLimit: async () => require('../../stubs/next/server').NextResponse.next() };
    }
    return origLoad.call(this, request, parent, isMain);
};
// Register ts-node programmatically with explicit CommonJS to ensure CJS resolution hooks apply
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', moduleResolution: 'node' } });
require('tsconfig-paths/register');
const assert = require('assert');

describe('middleware (headers/CSP)', () => {
    const modPath = '../../../src/middleware.ts';

    function makeReq(path = '/', headers = {}) {
        const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [String(k).toLowerCase(), v]));
        return {
            nextUrl: { pathname: path },
            headers: {
                get: (k) => lower[String(k).toLowerCase()] || null,
                has: (k) => Object.prototype.hasOwnProperty.call(lower, String(k).toLowerCase())
            }
        };
    }

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        try { delete require.cache[require.resolve(modPath)]; } catch { }
    });

    it('adds nonce headers for standard HTML doc requests', async () => {
        const { middleware } = require(modPath);
        const req = makeReq('/', { accept: 'text/html' });
        const res = await middleware(req);
        assert.ok(res.headers.get('x-nextjs-csp-nonce'));
        assert.ok(res.headers.get('x-nonce'));
    });

    it('does not attach CSP to API responses (handled in rate-limit)', async () => {
        const { middleware } = require(modPath);
        const req = makeReq('/api/ping', { accept: 'application/json' });
        const res = await middleware(req);
        // Early return path from src/middleware.ts yields NextResponse with no CSP header
        assert.strictEqual(res.headers.get('Content-Security-Policy'), null);
    });
});
