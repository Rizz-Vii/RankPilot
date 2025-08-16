// Plain JS jsdom setup for mocha
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };
// minimal localStorage
global.localStorage = {
  _s: {},
  getItem(k){ return this._s[k]||null; },
  setItem(k,v){ this._s[k]=v; },
  removeItem(k){ delete this._s[k]; }
};
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false
});

// Minimal canvas mock for libraries that probe canvas
try {
  const proto = dom.window.HTMLCanvasElement && dom.window.HTMLCanvasElement.prototype;
  if (proto) {
    proto.getContext = function(){
      return {
        // Draw ops – no-ops sufficient for tests
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => ([]),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {}
      };
    };
  }
} catch {}

// Optional network fetch mock to stabilize unit tests relying on /api/health endpoints.
// Activate with TEST_MOCK_FETCH=1 environment variable.
if (process.env.TEST_MOCK_FETCH === '1') {
  const mockHealth = {
    kpis: {
      provenanceCoveragePct: 97,
      p90LatencyOverall: 180,
      p95LatencyOverall: 220,
      p99LatencyOverall: 480,
      crawlerAggregateAdoptionPct: 91,
      semanticMapAggregateAdoptionPct: 89,
      aiDailyCostEstimate: 1.2345,
      aiDailyTokensIn: 12345,
      aiDailyTokensOut: 23456,
      teamRateLimitUtilizationPct: 42,
      fallbackRatePct: 3.2,
      cacheHitRatio: 78.5,
      rateLimitRejectionRate: 1.1
    },
    crawler: { crawlP95: 140, analysisP95: 260 },
    p95: { '/api/health': 120, '/api/finance/metrics': 210 },
    alerts: [ { type: 'provenanceCoverage', level: 'warn', message: 'coverage dip', value: 97, threshold: 0 } ],
    timestamp: new Date().toISOString()
  };
  const mockAlerts = {
    rows: [
      { date: new Date().toISOString().slice(0,10), alerts: mockHealth.alerts, ma7Provenance: 96.5 }
    ]
  };
  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url || '';
    if (url.includes('/api/health/alerts')) {
      return new Response(JSON.stringify(mockAlerts), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/health')) {
      return new Response(JSON.stringify(mockHealth), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}
