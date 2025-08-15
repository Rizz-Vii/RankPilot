const { expect } = require('chai');
// Register ts-node first
require('ts-node/register');
const path = require('path');
const Module = require('module');
const origResolve = Module._resolveFilename;
// Intercept resolution BEFORE load so ESM path 'next/server' never attempted from node_modules
Module._resolveFilename = function(request, parent, isMain, options){
  if (request === 'next/server') {
    // Return an in-memory virtual module id
    return path.join(process.cwd(), '__virtual_next_server_mock__.js');
  }
  return origResolve.call(this, request, parent, isMain, options);
};
// Provide the virtual module in require cache
const virtualId = path.join(process.cwd(), '__virtual_next_server_mock__.js');
require.cache[virtualId] = { id: virtualId, filename: virtualId, loaded: true, exports: (() => { class MockNextResponse { static json(body, init){ return { status: init?.status || 200, json: async () => body }; } } class MockNextRequest {} return { NextResponse: MockNextResponse, NextRequest: MockNextRequest }; })() };

// Patch _load for other aliases
const originalLoad = Module._load;
Module._load = function(request, parent, isMain){
  if (request === '@/lib/metrics/unified-metrics') { return { recordRouteLatency: () => {}, recordError: () => {}, recordFallback: () => {} }; }
  if (request === '@/lib/middleware/provenance') { return { withProvenance: (fn) => fn, enforceProvenance: (o) => o }; }
  return originalLoad(request, parent, isMain);
};

delete process.env.FIRECRAWL_API_KEY; // ensure fallback

const { GET: firecrawlGET } = require(path.resolve(__dirname, '../../../src/app/api/seo-audit/firecrawl/route.ts'));

describe('API seo-audit/firecrawl route (unit)', () => {
  it('400 when url missing', async () => {
    const req = { url: 'http://localhost/api/seo-audit/firecrawl' };
    const res = await firecrawlGET(req);
    expect(res.status).to.equal(400);
  });
  it('returns synthetic crawl when no api key', async () => {
    const req = { url: 'http://localhost/api/seo-audit/firecrawl?url=https://example.com&limit=2' };
    const res = await firecrawlGET(req);
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body.success).to.equal(true);
    expect(body.provenance).to.equal('synthetic');
    expect(body.data.pages.length).to.equal(1);
  });
});
