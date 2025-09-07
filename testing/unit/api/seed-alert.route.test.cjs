const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Enable ts-node + path mapping for TS route under test
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Mock next/server and firebase-admin before importing the route
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    class MockNextResponse {
      static json(body, init) {
        return { status: init?.status ?? 200, json: async () => body };
      }
    }
    class MockNextRequest {}
    return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
  }
  if (
    request === "@/lib/firebase-admin" ||
    request === path.resolve(process.cwd(), "src/lib/firebase-admin.ts")
  ) {
    // Provide minimal adminDb mock with runTransaction and collection().doc()
    const adminDb = {
      collection: () => ({ doc: () => ({}) }),
      runTransaction: async (fn) =>
        await fn({
          get: async () => ({ exists: false, data: () => ({}) }),
          set: () => {},
          update: () => {},
        }),
    };
    return { adminDb };
  }
  return originalLoad(request, parent, isMain);
};

const routePath = path.resolve(
  __dirname,
  "../../../src/app/api/test/observability/seed-alert/route.ts"
);
const { GET, POST } = require(routePath);

describe("API test/observability/seed-alert route (unit)", () => {
  it("GET returns 404 with provenance in production", async () => {
    const prevEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI_PRODUCTION: process.env.CI_PRODUCTION,
    };
    process.env.NODE_ENV = "production";
    process.env.CI_PRODUCTION = "1";
    try {
      const res = await GET({
        url: "http://localhost/api/test/observability/seed-alert?type=provenanceCoverage",
      });
      expect(res.status).to.equal(404);
      const body = await res.json();
      expect(body).to.have.property("__provenance");
      expect(body).to.have.property("ok", false);
      expect(body).to.have.property("reason", "disabled");
    } finally {
      process.env.NODE_ENV = prevEnv.NODE_ENV;
      process.env.CI_PRODUCTION = prevEnv.CI_PRODUCTION;
    }
  });

  it("GET seeds default alert in non-prod and returns ok true with provenance", async () => {
    const prevEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI_PRODUCTION: process.env.CI_PRODUCTION,
    };
    process.env.NODE_ENV = "test";
    delete process.env.CI_PRODUCTION;
    try {
      const res = await GET({
        url: "http://localhost/api/test/observability/seed-alert?type=provenanceCoverage&level=warn",
      });
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body).to.have.property("__provenance");
      expect(body).to.have.property("ok", true);
      expect(body).to.have.property("date");
    } finally {
      process.env.NODE_ENV = prevEnv.NODE_ENV;
      process.env.CI_PRODUCTION = prevEnv.CI_PRODUCTION;
    }
  });

  it("POST seeds batch alerts and returns count with provenance", async () => {
    const prevEnv = {
      NODE_ENV: process.env.NODE_ENV,
      CI_PRODUCTION: process.env.CI_PRODUCTION,
    };
    process.env.NODE_ENV = "test";
    delete process.env.CI_PRODUCTION;
    try {
      const mockReq = {
        json: async () => ({
          alerts: [
            { type: "cacheHitRatio", level: "warn", value: 90, ma7: 88 },
          ],
        }),
      };
      const res = await POST(mockReq);
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body).to.have.property("__provenance");
      expect(body).to.have.property("ok", true);
      expect(body).to.have.property("count");
      expect(body.count).to.be.greaterThan(0);
    } finally {
      process.env.NODE_ENV = prevEnv.NODE_ENV;
      process.env.CI_PRODUCTION = prevEnv.CI_PRODUCTION;
    }
  });
});
