// Real route import test for /api/seo-audit/firecrawl (reduces drift from inline stub)
// Focus: timings object, quota headers, rate limit, robots.txt block.
require('ts-node/register/transpile-only');
const { expect } = require('chai');
const Module = require('module');
const path = require('path');

// Minimal patching: intercept next/server only
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options){
  if (request === 'next/server') return 'virtual:next-server-stub';
  return origResolve.call(this, request, parent, isMain, options);
};

// Minimal Next.js server mocks (preload stub for ESM resolver)
const originalLoad = Module._load;
try {
  const stubPath = path.join(process.cwd(), 'testing/shims/next-server-stub.js');
  const fakeId = 'next/server';
  require.cache[fakeId] = { id: fakeId, filename: fakeId, loaded: true, exports: require(stubPath) };
} catch {}
class HeadersMap {
  constructor(init){ this._m = new Map(); if (init) Object.entries(init).forEach(([k,v])=>this._m.set(k.toLowerCase(), v)); }
  get(k){ return this._m.get(k.toLowerCase()) || null; }
  set(k,v){ this._m.set(k.toLowerCase(), String(v)); }
}
class NextResponseMock {
  constructor(body, init){ this._body = body; this.status = init?.status || 200; this.headers = new HeadersMap(init?.headers); }
  static json(body, init){ return new NextResponseMock(body, init); }
  async json(){ return this._body; }
}
class NextRequestMock { constructor(url, headers){ this.url = url; this.headers = new HeadersMap(headers); } }

Module._load = function(request, parent, isMain){
  if (request === 'next/server' || request === 'virtual:next-server-stub') { return { NextResponse: NextResponseMock, NextRequest: NextRequestMock }; }
  if (request.endsWith('/lib/middleware/provenance')) { return { withProvenance: (fn)=>fn, enforceProvenance: (o)=>o }; }
  if (request.endsWith('/lib/metrics/unified-metrics')) { return { recordRouteLatency:()=>{}, recordRateLimitRejection:()=>{}, recordTeamRateLimitAllowed:()=>{}, recordCrawlerQuota:()=>{}, recordCrawlerSuccess:()=>{}, recordCrawlerError:()=>{} }; }
  if (request.endsWith('/lib/firebase-admin')) {
    const quotaStore = new Map();
    const adminDb = {
      collection: (name)=>({ doc: (id)=>({
        _key: `${name}/${id}`,
        get: async function(){ const data = quotaStore.get(this._key); return { exists: !!data, data: () => data }; }
      }) }),
      runTransaction: async (fn)=> fn({ get: async (ref)=>{ return ref.get(); }, set: (ref, data)=> quotaStore.set(ref._key, { ...(quotaStore.get(ref._key)||{}), ...data }) })
    };
    const Timestamp = { fromMillis: (ms)=>({ toMillis: ()=>ms }) };
    return { adminDb, Timestamp };
  }
  if (request.endsWith('/lib/crawler/firecrawl-client')) {
    return { runFirecrawl: async (url, opts)=> ({ pages: [{ url, content: 'X', status:200, title:'T', links:[], canonicalUrl: url, metaDescription: 'desc'}], elapsedMs: 12, fallback: false }) };
  }
  return originalLoad(request, parent, isMain);
};

// Import real route now that mocks are in place
const routeMod = require(path.join(process.cwd(), 'src/app/api/seo-audit/firecrawl/route.ts'));
const realGET = routeMod.GET; // provenance wrapped

describe('REAL firecrawl route (Next.js) contract', () => {
  beforeEach(() => {
    process.env.FIRECRAWL_HOURLY_LIMIT = '5';
  });

  it('returns timings + quota headers on success', async () => {
    global.fetch = async ()=> ({ ok: true, text: async ()=> 'User-agent: *', json: async ()=>({}) });
    const req = new NextRequestMock('http://localhost/api/seo-audit/firecrawl?url=https://example.com&depth=1&limit=2');
    const res = await realGET(req);
    const body = await res.json();
    expect(res.status).to.equal(200);
    expect(res.headers.get('x-quota-remaining')).to.not.equal(null);
    expect(res.headers.get('x-quota-reset')).to.not.equal(null);
    expect(body.data.timings).to.include.keys(['quota_time_ms','crawl_time_ms','analysis_time_ms','total_time_ms']);
    expect(body.data.quota.scope).to.equal('global');
  });

  it('enforces rate limit (second call over limit=1)', async () => {
    process.env.FIRECRAWL_HOURLY_LIMIT = '1';
    global.fetch = async ()=> ({ ok: true, text: async ()=> 'User-agent: *' });
    const first = await realGET(new NextRequestMock('http://localhost/api/seo-audit/firecrawl?url=https://ratelimit.com'));
    expect(first.status).to.equal(200);
    const second = await realGET(new NextRequestMock('http://localhost/api/seo-audit/firecrawl?url=https://ratelimit.com/2'));
    expect(second.status).to.equal(429);
  });

  it('robots.txt block returns 403 robots_blocked', async () => {
    global.fetch = async ()=> ({ ok: true, text: async ()=> 'User-agent: *\nDisallow: /' });
    const res = await realGET(new NextRequestMock('http://localhost/api/seo-audit/firecrawl?url=https://robotsblock.com/path&depth=2'));
    const body = await res.json();
    expect(res.status).to.equal(403);
    expect(body.error).to.equal('robots_blocked');
  });
});
