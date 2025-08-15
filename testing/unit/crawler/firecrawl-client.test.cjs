require('ts-node/register/transpile-only');
const { expect } = require('chai');
const path = require('path');
const Module = require('module');

// Minimal metrics + logger shims
const __origLoad = Module._load;
Module._load = function(request, parent, isMain){
  if (request === '@/lib/metrics/unified-metrics') {
    return {
      recordRouteLatency: () => {},
      recordError: () => {},
      recordFallback: () => {},
    };
  }
  if (request === '@/lib/logging/app-logger') {
    return { getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }) };
  }
  return __origLoad(request, parent, isMain);
};

const clientPath = path.resolve(__dirname, '../../../src/lib/crawler/firecrawl-client.ts');

function purge(p){ try { delete require.cache[require.resolve(p)]; } catch {} }

describe('firecrawl-client', () => {
  beforeEach(() => {
    purge(clientPath);
    delete process.env.FIRECRAWL_API_KEY; // ensure fallback path
  });

  it('returns synthetic fallback when no API key present', async () => {
    const { runFirecrawl } = require(clientPath);
    const res = await runFirecrawl('https://example.com');
    expect(res.fallback).to.equal(true);
    expect(res.degradedReason).to.equal('no_api_key');
    expect(res.pages).to.have.length(1);
    expect(res.pages[0].content).to.match(/SYNTHETIC_CRAWL_CONTENT/);
  });
});
