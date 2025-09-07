const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Enable ts-node + path mapping for TS route under test
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Force mock admin to avoid real Firebase in tests
process.env.FIREBASE_ADMIN_FORCE_MOCK = "1";

// Mock next/server minimal API used by the route
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
  return originalLoad(request, parent, isMain);
};

const customerRoute = require(
  path.resolve(__dirname, "../../../../src/app/api/chat/customer/route.ts")
);

describe("API chat/customer route (unit)", () => {
  it("GET returns 401 when missing Authorization header", async () => {
    const req = {
      headers: new Map(),
      url: "http://localhost/api/chat/customer",
    };
    req.headers.get = (k) => undefined;
    const res = await customerRoute.GET(req);
    expect(res.status).to.equal(401);
    const body = await res.json();
    expect(body).to.have.property("error");
  });

  it("GET returns empty messages when authorized and no data", async () => {
    const token = "stub-token";
    const req = {
      headers: new Map(),
      url: "http://localhost/api/chat/customer?limit=10",
    };
    req.headers.get = (k) =>
      k.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined;
    const res = await customerRoute.GET(req);
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body).to.have.property("messages");
    expect(body.messages).to.be.an("array");
    expect(body).to.have.property("hasMore");
  });
});
