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

// Helper to temporarily mock environment variable
function withEnv(key, value, fn) {
  const prev = process.env[key];
  process.env[key] = value;
  return Promise.resolve(fn()).finally(() => {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  });
}

// Import route under test
// Enable ts-node + path mapping for TS route under test
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const { POST: verifyCaptchaPOST } = require(
  path.resolve(__dirname, "../../../src/app/api/verify-captcha/route.ts")
);

describe("API verify-captcha route (unit)", () => {
  it("returns 400 when token missing", async () => {
    const req = { json: async () => ({}) };
    const res = await verifyCaptchaPOST(req);
    expect(res.status).to.equal(400);
    const body = await res.json();
    expect(body).to.have.property("error", "token_required");
  });

  it("returns 500 when server misconfigured (no secret)", async () => {
    const req = { json: async () => ({ token: "abc" }) };
    const res = await withEnv("RECAPTCHA_SECRET_KEY", "", () =>
      verifyCaptchaPOST(req)
    );
    expect(res.status).to.equal(500);
    const body = await res.json();
    expect(body).to.have.property("error", "server_misconfigured");
  });

  it("returns provider error status passthrough when upstream fails", async () => {
    return withEnv("RECAPTCHA_SECRET_KEY", "test-secret", async () => {
      const req = { json: async () => ({ token: "abc" }) };
      const origFetch = global.fetch;
      global.fetch = async () => ({ ok: false, status: 502 });
      try {
        const res = await verifyCaptchaPOST(req);
        expect(res.status).to.equal(502);
        const body = await res.json();
        expect(body).to.have.property("error", "captcha_provider_error");
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  it("returns 400 when verification fails (success=false)", async () => {
    return withEnv("RECAPTCHA_SECRET_KEY", "test-secret", async () => {
      const req = { json: async () => ({ token: "bad" }) };
      const origFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
      });
      try {
        const res = await verifyCaptchaPOST(req);
        expect(res.status).to.equal(400);
        const body = await res.json();
        expect(body).to.have.property("error", "captcha_verification_failed");
        expect(body).to.have.property("details");
      } finally {
        global.fetch = origFetch;
      }
    });
  });

  it("returns 200 and success true when verification passes", async () => {
    return withEnv("RECAPTCHA_SECRET_KEY", "test-secret", async () => {
      const req = { json: async () => ({ token: "good" }) };
      const origFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      try {
        const res = await verifyCaptchaPOST(req);
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.deep.equal({ success: true });
      } finally {
        global.fetch = origFetch;
      }
    });
  });
});
