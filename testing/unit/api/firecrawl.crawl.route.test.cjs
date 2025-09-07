const { expect } = require("chai");
const Module = require("module");
const path = require("path");

require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Mock next/server minimal
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

const { POST } = require(
  path.resolve(__dirname, "../../../src/app/api/mcp/firecrawl/crawl/route.ts")
);

describe("API mcp/firecrawl/crawl route (unit)", () => {
  it("400 on invalid url", async () => {
    const req = { json: async () => ({ url: "not-a-url" }) };
    const res = await POST(req);
    expect(res.status).to.equal(400);
    const body = await res.json();
    expect(body).to.have.property("error");
  });

  it("200 with synthetic provenance when no API key", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    const req = {
      json: async () => ({ url: "https://example.com", limit: 1 }),
    };
    const res = await POST(req);
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body).to.have.property("provenance");
    expect(body.provenance).to.match(/synthetic|live/);
    expect(body).to.have.property("pages");
  });
});
