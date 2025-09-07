require("ts-node/register/transpile-only");
const { expect } = require("chai");
const path = require("path");
const Module = require("module");
const __origLoad = Module._load;
const __origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request && request.startsWith("@/")) {
    const path = require("path");
    const full = path.join(process.cwd(), "src", request.slice(2));
    return __origResolve.call(this, full, parent, isMain, options);
  }
  return __origResolve.call(this, request, parent, isMain, options);
};
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/metrics/unified-metrics") {
    return {
      recordRouteLatency: () => {},
      recordError: () => {},
      recordFallback: () => {},
    };
  }
  if (request.endsWith("/metrics/unified-metrics")) {
    return {
      recordRouteLatency: () => {},
      recordError: () => {},
      recordFallback: () => {},
    };
  }
  return __origLoad(request, parent, isMain);
};
const clientPath = path.resolve(
  __dirname,
  "../../../src/lib/crawler/firecrawl-client.ts"
);

/**
 * Concurrency stress (T13 scaffold): run 20 parallel crawls with stubbed fetch.
 * Objective: ensure no thrown errors and each response has at least one page.
 */

function p95(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.ceil(0.95 * s.length) - 1];
}

describe("firecrawl-client concurrency + perf (T13)", () => {
  it("20 parallel calls under p95 latency threshold, <5% errors, no significant mem leak", async () => {
    process.env.FIRECRAWL_API_KEY = "test";
    const originalFetch = global.fetch;
    // Inject variability + 3% synthetic errors
    global.fetch = async (url) => {
      const delay = Math.floor(Math.random() * 15);
      await new Promise((r) => setTimeout(r, delay));
      if (Math.random() < 0.03)
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "synthetic" }),
        };
      return {
        ok: true,
        json: async () => ({
          pages: [
            {
              url,
              markdown: "# Title\nContent",
              status: 200,
              title: "Title",
              links: [],
            },
          ],
        }),
      };
    };
    const { runFirecrawl } = require(clientPath);
    const N = 20;
    const latencies = [];
    let errors = 0;
    global.gc && global.gc();
    const before = process.memoryUsage().heapUsed;
    await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const t0 = performance.now();
        try {
          const r = await runFirecrawl(`https://example.com/page${i + 1}`, {
            limit: 1,
          });
          expect(r.pages[0]).to.have.property("url");
        } catch {
          errors++;
        } finally {
          latencies.push(performance.now() - t0);
        }
      })
    );
    global.gc && global.gc();
    const after = process.memoryUsage().heapUsed;
    global.fetch = originalFetch;
    const p95Latency = p95(latencies);
    const errorRate = errors / N;
    const memDiff = after - before;
    expect(p95Latency).to.be.below(150, `p95 latency high: ${p95Latency}ms`);
    expect(errorRate).to.be.below(
      0.05,
      `error rate high: ${(errorRate * 100).toFixed(1)}%`
    );
    expect(memDiff).to.be.below(
      5 * 1024 * 1024,
      `heap grew ${(memDiff / 1024 / 1024).toFixed(2)}MB`
    );
  });
});
