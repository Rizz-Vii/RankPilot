// Install resolve/load hooks before ts-node so they capture TS module loads
const Module = require("module");
const path = require("path");
const fs = require("fs");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "next/server")
    return path.join(process.cwd(), "testing/stubs/next/server.js");
  if (request.startsWith("@/")) {
    const base = path.join(process.cwd(), "src", request.slice(2));
    const candidates = [
      base,
      base + ".ts",
      base + ".tsx",
      base + "/index.ts",
      base + "/index.tsx",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return origResolve.call(this, request, parent, isMain, options);
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next-auth/jwt") {
    return { getToken: async () => null };
  }
  if (request.endsWith("/lib/metrics/unified-metrics")) {
    return {
      recordRateLimitRejection: () => {},
      recordTeamRateLimitAllowed: () => {},
    };
  }
  if (request.endsWith("/lib/logging/app-logger")) {
    return {
      getLogger: () => ({
        info: () => {},
        warn: () => {},
        error: () => {},
        degraded: () => {},
      }),
    };
  }
  if (request.endsWith("/lib/rate-limit/team-rate-limit")) {
    return {
      applyTeamRateLimit: async () => ({
        allowed: true,
        headers: { "X-Team-RateLimit-Limit": "100" },
      }),
    };
  }
  return origLoad.call(this, request, parent, isMain);
};
// Register ts-node programmatically with explicit CommonJS to ensure CJS resolution hooks apply
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", moduleResolution: "node" },
});
require("tsconfig-paths/register");
const assert = require("assert");

describe("middleware: rate-limit", () => {
  const modPath = "../../../src/middleware/rate-limit.ts";
  const { NextResponse } = require("../../stubs/next/server");

  function makeReq(p = "/", headers = {}) {
    return {
      method: "GET",
      nextUrl: { pathname: p },
      headers: {
        get: (k) => headers[k] || headers[(k || "").toLowerCase()] || null,
      },
    };
  }

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.API_RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.CRAWL_PROBE_TOKEN;
    try {
      delete require.cache[require.resolve(modPath)];
    } catch {}
  });

  it("bypasses when x-probe-token matches env", async () => {
    process.env.CRAWL_PROBE_TOKEN = "probe-123";
    const { rateLimit } = require(modPath);
    const req = makeReq("/api/health", { "x-probe-token": "probe-123" });
    const res = await rateLimit(req);
    assert.strictEqual(res.status || 200, 200);
  });

  it("allows health endpoints without limiting", async () => {
    const { rateLimit } = require(modPath);
    const req = {
      method: "GET",
      nextUrl: { pathname: "/api/health" },
      headers: { get: () => null },
    };
    const res = await rateLimit(req);
    assert.strictEqual(res.status || 200, 200);
  });

  it("applies default API limits and returns headers", async () => {
    const { rateLimit } = require(modPath);
    const req = {
      method: "GET",
      nextUrl: { pathname: "/api/foo" },
      headers: { get: () => null },
    };
    const res = await rateLimit(req);
    // Expect X-RateLimit headers present
    assert.ok(res.headers.get("X-RateLimit-Limit"));
    assert.ok(res.headers.get("X-RateLimit-Remaining"));
  });
});
