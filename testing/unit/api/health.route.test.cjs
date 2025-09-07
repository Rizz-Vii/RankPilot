const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Mock next/server Response for route under test before requiring it
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    class MockNextResponse {
      static json(body, init) {
        return {
          status: init && typeof init.status === "number" ? init.status : 200,
          json: async () => body,
          headers: { set: () => {} },
        };
      }
    }
    class MockNextRequest {}
    return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
  }
  return originalLoad(request, parent, isMain);
};

// Enable ts-node + path mapping for TS route under test
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Import helpers to manipulate metrics snapshot
const metrics = require(
  path.resolve(__dirname, "../../../src/lib/metrics/unified-metrics.ts")
);

describe("API health route (unit)", () => {
  beforeEach(() => {
    if (typeof metrics.__resetUnifiedMetricsTestOnly === "function")
      metrics.__resetUnifiedMetricsTestOnly();
  });

  it("returns ok payload with zeros when no activity", async () => {
    const { GET: healthGET } = require(
      path.resolve(__dirname, "../../../src/app/api/health/route.ts")
    );
    const res = await healthGET();
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body).to.have.property("ok", true);
    expect(body).to.have.property("crawler");
    expect(body.crawler.success).to.equal(0);
    expect(body.crawler.errors).to.equal(0);
    expect(body.crawler.fallbackRatePct).to.equal(0);
    expect(body).to.have.nested.property("ai.responses");
    expect(body).to.have.nested.property("ai.coveragePct");
  });

  it("reflects crawler KPIs and fallback rate", async () => {
    const { recordCrawlerSuccess, recordCrawlerError } = metrics;
    // 2 successes, 1 error
    recordCrawlerSuccess(120, 80);
    recordCrawlerSuccess(90, 60);
    recordCrawlerError(200);

    const { GET: healthGET } = require(
      path.resolve(__dirname, "../../../src/app/api/health/route.ts")
    );
    const res = await healthGET();
    const body = await res.json();
    expect(body.crawler.success).to.equal(2);
    expect(body.crawler.errors).to.equal(1);
    expect(body.crawler.fallbackRatePct).to.equal(33.33);
    // p95 present or null depending on simple samples
    expect(body.crawler).to.have.property("crawlP95");
  });
});
