// Performance & reliability test for real firecrawl Next.js route (T13 goals)
// Focus: 20-parallel runs, p95 latency assertion, <5% error rate, memory leak guard.
require('ts-node/register/transpile-only');
const { expect } = require('chai');
const Module = require('module');
const path = require('path');

// Simple helper: compute p95
function p95(values){
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[idx];
}

// (Route already loaded by contract test in combined script; only need @/ alias for direct imports if any)
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options){
  if (request.startsWith('@/')) {
    const p = path.join(process.cwd(), 'src', request.slice(2));
    return origResolve.call(this, p, parent, isMain, options);
  }
  if (request === 'next/server') {
    return 'virtual:next-server-stub';
  }
  return origResolve.call(this, request, parent, isMain, options);
};

// Lightweight mocks (reuse strategy from contract test but with latency variability)
const originalLoad = Module._load;
try {
  const stubPath = path.join(process.cwd(), 'testing/shims/next-server-stub.js');
  const fakeId = 'next/server';
  require.cache[fakeId] = { id: fakeId, filename: fakeId, loaded: true, exports: require(stubPath) };
} catch {}
class HeadersMap { constructor(init){ this._m = new Map(); if (init) Object.entries(init).forEach(([k,v])=>this._m.set(k.toLowerCase(), v)); } get(k){ return this._m.get(k.toLowerCase())||null; } set(k,v){ this._m.set(k.toLowerCase(), String(v)); } }
class NextResponseMock { constructor(body, init){ this._body = body; this.status = init?.status||200; this.headers = new HeadersMap(init?.headers); } static json(body, init){ return new NextResponseMock(body, init); } async json(){ return this._body; } }
class NextRequestMock { constructor(url, headers){ this.url = url; this.headers = new HeadersMap(headers); } }

Module._load = function(request, parent, isMain){
  if (request === 'next/server' || request === 'virtual:next-server-stub') { return { NextResponse: NextResponseMock, NextRequest: NextRequestMock }; }
  if (request === '@/lib/middleware/provenance') { return { withProvenance: (fn)=>fn, enforceProvenance: (o)=>o }; }
  if (request === '@/lib/metrics/unified-metrics') { return { recordRouteLatency:()=>{}, recordRateLimitRejection:()=>{}, recordTeamRateLimitAllowed:()=>{}, recordCrawlerQuota:()=>{}, recordCrawlerSuccess:()=>{}, recordCrawlerError:()=>{} }; }
  if (request === '@/lib/firebase-admin') {
    // In-memory quota store – allow generous limit for performance run
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
  if (request === '@/lib/crawler/firecrawl-client') {
    // Simulate variable latency & occasional (<=5%) errors
    return { runFirecrawl: async (url)=> {
      const start = Date.now();
      // random 0-20ms artificial crawl latency
      const extra = Math.floor(Math.random()*20);
      await new Promise(r=>setTimeout(r, extra));
      // 3% error injection
      if (Math.random() < 0.03) {
        const err = new Error('synthetic_crawl_error');
        err.code = 'crawl_failed';
        throw err;
      }
      return { pages: [{ url, content: 'M', status:200, title:'T', links:[], canonicalUrl: url, metaDescription:'d'}], elapsedMs: Date.now()-start, fallback: false };
    } };
  }
  return originalLoad(request, parent, isMain);
};

// Import route after mocks
const routeMod = require(path.join(process.cwd(), 'src/app/api/seo-audit/firecrawl/route.ts'));
const realGET = routeMod.GET;

describe('firecrawl real route performance (T13)', () => {
  beforeEach(() => {
    process.env.FIRECRAWL_HOURLY_LIMIT = '100'; // high to avoid 429 in perf path
    // robots allow
    global.fetch = async ()=> ({ ok: true, text: async ()=> 'User-agent: *' });
    global.gc && global.gc();
  });

  it('20 parallel runs meet p95 latency & error-rate thresholds and no significant memory leak', async function(){
    this.timeout(10000);
    const runs = 20;
    const latencies = [];
    let errors = 0;
    const before = process.memoryUsage().heapUsed;
    // parallel batch
    await Promise.all(Array.from({ length: runs }, async (_, i) => {
      const url = `https://perf${i}.example.com`;
      const req = new NextRequestMock(`http://localhost/api/seo-audit/firecrawl?url=${encodeURIComponent(url)}&depth=1&limit=1`);
      const t0 = performance.now();
      try {
        const res = await realGET(req);
        const body = await res.json();
        if (res.status !== 200) { errors++; return; }
        expect(body.data).to.have.property('pages');
      } catch (e) {
        errors++;
      } finally {
        latencies.push(performance.now() - t0);
      }
    }));
    global.gc && global.gc();
    const after = process.memoryUsage().heapUsed;

    // Assertions
    const p95Latency = p95(latencies);
    const errorRate = errors / runs;
    // Thresholds (tunable): p95 < 150ms, error rate < 0.05, memory growth < 5MB
    expect(p95Latency).to.be.below(150, `p95 latency too high: ${p95Latency}ms`);
    expect(errorRate).to.be.below(0.05, `error rate too high: ${(errorRate*100).toFixed(1)}%`);
    const memDiff = after - before;
    expect(memDiff).to.be.below(5 * 1024 * 1024, `heap grew by ${(memDiff/1024/1024).toFixed(2)}MB`);
  });
});
