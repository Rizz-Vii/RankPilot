const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Enable ts-node + path mapping
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

// Ensure no external AI providers are used during the test
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;
process.env.FIREBASE_ADMIN_FORCE_MOCK = "1";

// Mock next/server minimal API used in route
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

const streamRoute = require(
  path.resolve(
    __dirname,
    "../../../../src/app/api/chat/customer/stream/route.ts"
  )
);

function makeHeaders(map) {
  return { get: (k) => map[k.toLowerCase()] };
}

describe("API chat/customer/stream route (unit)", () => {
  it("POST returns 401 when missing Authorization", async () => {
    const req = {
      headers: makeHeaders({}),
      json: async () => ({}),
      url: "http://localhost/api/chat/customer/stream",
      signal: new AbortController().signal,
    };
    const res = await streamRoute.POST(req);
    expect(res.status).to.equal(401);
  });

  it("POST streams fallback content and terminates with [DONE]", async () => {
    const req = {
      headers: makeHeaders({ authorization: "Bearer stub" }),
      json: async () => ({ message: "Hello AI", url: "http://example.com" }),
      url: "http://localhost/api/chat/customer/stream",
      signal: new AbortController().signal,
    };
    const res = await streamRoute.POST(req);
    expect(res.status).to.equal(200);
    expect(res.headers.get("Content-Type")).to.match(/text\/event-stream/);
    // Read the SSE body to a string and assert key markers
    const reader = res.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value).toString("utf8"));
      // optimization: break if we already saw [DONE]
      if (chunks.some((c) => c.includes("[DONE]"))) break;
    }
    const output = chunks.join("");
    expect(output).to.include("provider_selected");
    expect(output).to.include("[DONE]");
  });
});
