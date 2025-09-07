const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Enable ts-node + path mapping for TS route under test
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Mock next/server and firebase-admin/auth before importing the route
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
  if (request === "firebase-admin/auth") {
    // Force getAuth to throw so route takes the stub token path
    return {
      getAuth: () => {
        throw new Error("no-admin");
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

const { GET } = require(
  path.resolve(
    __dirname,
    "../../../src/app/api/test/auth/custom-token/route.ts"
  )
);

describe("API test/auth/custom-token route (unit)", () => {
  it("returns 403 in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = await GET({});
      expect(res.status).to.equal(403);
      const body = await res.json();
      expect(body).to.have.property("__provenance");
      expect(body).to.have.property("error", "forbidden");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("returns stub token with provenance in non-prod if admin SDK unavailable", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    try {
      const res = await GET({});
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body).to.have.property("__provenance");
      expect(body).to.have.property("token");
      expect(body).to.have.property("uid");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
