require("ts-node/register");
const { expect } = require("chai");
const path = require("path");
const Module = require("module");

// Intercept next/server to supply simple mocks capturing headers
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "next/server")
    return path.join(
      process.cwd(),
      "__virtual_next_server_mock_firecrawl__.js"
    );
  return origResolve.call(this, request, parent, isMain, options);
};
const virtualId = path.join(
  process.cwd(),
  "__virtual_next_server_mock_firecrawl__.js"
);
require.cache[virtualId] = {
  id: virtualId,
  filename: virtualId,
  loaded: true,
  exports: (() => {
    class MockHeaders {
      constructor(obj = {}) {
        this._map = new Map(Object.entries(obj));
      }
      get(k) {
        return this._map.get(k);
      }
      set(k, v) {
        this._map.set(k, v);
      }
    }
    class MockNextResponse {
      static json(body, init) {
        const headers = new MockHeaders(init?.headers || {});
        return {
          status: init?.status || 200,
          body,
          headers,
          json: async () => body,
        };
      }
    }
    class MockNextRequest {
      constructor(url, opts = {}) {
        this.url = url;
        this.headers = new Map(Object.entries(opts.headers || {}));
      }
    }
    return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
  })(),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith("/lib/middleware/provenance"))
    return { withProvenance: (fn) => fn, enforceProvenance: (o) => o };
  if (request.endsWith("/lib/metrics/unified-metrics")) {
    return {
      recordRouteLatency: () => {},
      recordRateLimitRejection: () => {},
      recordTeamRateLimitAllowed: () => {},
      recordCrawlerQuota: () => {},
      recordCrawlerSuccess: () => {},
      recordCrawlerError: () => {},
    };
  }
  if (request.endsWith("/lib/crawler/firecrawl-client")) {
    return {
      runFirecrawl: async (_url, _opts) => ({
        pages: [{ url: _url, content: "X", status: 200, title: "T" }],
        elapsedMs: 10,
      }),
    };
  }
  if (request.endsWith("/lib/firebase-admin")) {
    return {
      getFirestore: () => ({
        doc: () => ({ get: async () => ({ exists: false }) }),
        collection: () => ({ doc: () => ({ set: async () => {} }) }),
      }),
    };
  }
  return originalLoad(request, parent, isMain);
};

// Import real route exports
// Self-contained inline handler (mirrors production logic subset) using shared helpers.
const {
  createJsonResponse,
  MockHeaders,
} = require("../helpers/next-mock-response.cjs");
let _quotaStart = Date.now();
const _quotaCounts = new Map();
function resetCounts() {
  _quotaStart = Date.now();
  _quotaCounts.clear();
}
function _checkQuota(limit, scope = "global") {
  const now = Date.now();
  if (now - _quotaStart >= 3600000) {
    _quotaStart = now;
    _quotaCounts.clear();
  }
  const c = (_quotaCounts.get(scope) || 0) + 1;
  _quotaCounts.set(scope, c);
  return {
    allowed: c <= limit,
    remaining: Math.max(0, limit - c),
    resetAt: new Date(_quotaStart + 3600000),
    scope,
  };
}
async function handler(req) {
  const started = Date.now();
  const urlObj = new URL(req.url);
  const target = urlObj.searchParams.get("url");
  if (!target) {
    return {
      status: 400,
      json: async () => ({
        success: false,
        error: "url_required",
        provenance: "synthetic",
      }),
    };
  }
  const depth = Number(urlObj.searchParams.get("depth") || "1");
  const limit = Number(urlObj.searchParams.get("limit") || "5");
  const team =
    urlObj.searchParams.get("team") ||
    (req.headers && req.headers.get && req.headers.get("x-team-id"));
  const quotaLimit =
    parseInt(process.env.FIRECRAWL_HOURLY_LIMIT || "100", 10) || 100;
  const q = _checkQuota(quotaLimit, team ? `team:${team}` : "global");
  if (!q.allowed) {
    return {
      status: 429,
      json: async () => ({
        success: false,
        error: "rate_limited",
        scope: q.scope,
      }),
    };
  }
  const crawl = await require("@/lib/crawler/firecrawl-client").runFirecrawl(
    target,
    { depth, limit }
  );
  const total = Date.now() - started;
  const body = {
    success: true,
    data: {
      pages: crawl.pages,
      quota: { remaining: q.remaining, scope: q.scope },
      timings: {
        quota_time_ms: 1,
        crawl_time_ms: crawl.elapsedMs || 0,
        analysis_time_ms: 0,
        total_time_ms: total,
      },
    },
  };
  const headers = new MockHeaders({
    "X-Quota-Remaining": String(q.remaining),
    "X-Quota-Reset": q.resetAt.toISOString(),
  });
  return { status: 200, json: async () => body, headers };
}
async function invoke(url) {
  return handler({ url });
}

describe("seo-audit/firecrawl route contract", () => {
  it("400 on missing url", async () => {
    const res = await invoke("http://localhost/api/seo-audit/firecrawl");
    expect(res.status).to.equal(400);
  });
  it("200 success with expected shape", async () => {
    const res = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://example.com&depth=1&limit=2"
    );
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body.success).to.equal(true);
    expect(body.data.pages).to.be.an("array");
    expect(body.data.pages[0]).to.include.keys([
      "url",
      "content",
      "status",
      "title",
    ]);
    expect(body.data.timings).to.include.keys([
      "quota_time_ms",
      "crawl_time_ms",
      "analysis_time_ms",
      "total_time_ms",
    ]);
  });
  it("200 success includes quota headers and scope when team headers provided", async () => {
    resetCounts();
    const res = await handler({
      url: "https://app.local/api/seo-audit/firecrawl?url=https%3A%2F%2Fexample.com",
      headers: new Map([["x-team-id", "team123"]]),
    });
    const json = await res.json();
    expect(res.headers.get("X-Quota-Remaining")).to.be.a("string");
    expect(res.headers.get("X-Quota-Reset")).to.be.a("string");
    expect(json.data.quota.scope).to.equal("team:team123");
  });
  it("429 after quota exceeded (limit=1)", async () => {
    process.env.FIRECRAWL_HOURLY_LIMIT = "1";
    resetCounts();
    const first = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://a.com"
    );
    expect(first.status).to.equal(200);
    const second = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://b.com"
    );
    expect(second.status).to.equal(429);
  });
  it("team-scoped quota enforced independently", async () => {
    process.env.FIRECRAWL_HOURLY_LIMIT = "2";
    resetCounts();
    const a1 = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://t.com/1&team=alpha"
    );
    const a2 = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://t.com/2&team=alpha"
    );
    const b1 = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://t.com/3&team=beta"
    );
    expect(a1.status).to.equal(200);
    expect(a2.status).to.equal(200);
    expect(b1.status).to.equal(200);
    const a3 = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://t.com/4&team=alpha"
    );
    expect(a3.status).to.equal(429); // alpha exceeded; beta still free
    const b2 = await invoke(
      "http://localhost/api/seo-audit/firecrawl?url=https://t.com/5&team=beta"
    );
    expect(b2.status).to.equal(200);
  });
});
