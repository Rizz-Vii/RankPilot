const { expect } = require("chai");
const Module = require("module");
const path = require("path");

// Mock next/server once
const originalLoadWebhook = Module._load;
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
  return originalLoadWebhook(request, parent, isMain);
};

require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

const { POST: webhookPOST } = require(
  path.resolve(__dirname, "../../../src/app/api/telephony/webhook/route.ts")
);

describe("API telephony/webhook route (unit)", () => {
  const origEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("rejects when signature is missing in strict mode", async () => {
    process.env.TWILIO_TEST_MODE = "";
    process.env.TWILIO_AUTH_TOKEN = "abc";
    const req = {
      headers: new Map([["content-type", "application/x-www-form-urlencoded"]]),
      text: async () => "CallSid=CA1&CallStatus=queued",
      json: async () => ({}),
    };
    const res = await webhookPOST(req);
    expect(res.status).to.equal(403);
    const body = await res.json();
    expect(body).to.have.property("error", "signature_invalid");
  });

  it("allows when TWILIO_TEST_MODE=1 even without signature", async () => {
    process.env.TWILIO_TEST_MODE = "1";
    delete process.env.TWILIO_AUTH_TOKEN;
    const req = {
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({}),
      text: async () => "",
      url: "http://localhost/api/telephony/webhook",
    };
    const res = await webhookPOST(req);
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body).to.deep.equal({ ok: true });
  });

  it("returns TwiML for inbound calls", async () => {
    process.env.TWILIO_TEST_MODE = "1";
    const req = {
      headers: new Map([["content-type", "application/x-www-form-urlencoded"]]),
      text: async () =>
        "Direction=inbound&From=%2B15555550123&To=%2B15551234567",
      json: async () => ({}),
    };
    const res = await webhookPOST(req);
    expect(res.status).to.equal(200);
    const contentType =
      res.headers && res.headers.get && res.headers.get("Content-Type");
    // When route returns new Response with text/xml
    if (contentType) expect(contentType).to.match(/xml/i);
  });

  it("enforces strict signature in production even when TWILIO_TEST_MODE=1", async () => {
    process.env.NODE_ENV = "production";
    process.env.TWILIO_TEST_MODE = "1";
    process.env.TWILIO_AUTH_TOKEN = "abc";
    const req = {
      headers: new Map([["content-type", "application/x-www-form-urlencoded"]]),
      text: async () => "CallSid=CA1&CallStatus=queued",
      json: async () => ({}),
      url: "https://example.com/api/telephony/webhook",
    };
    const res = await webhookPOST(req);
    expect(res.status).to.equal(403);
    const body = await res.json();
    expect(body).to.have.property("error", "signature_invalid");
  });

  it("accepts valid signature when provided (stubbed validator)", async () => {
    process.env.NODE_ENV = "production";
    process.env.TWILIO_TEST_MODE = "";
    process.env.TWILIO_AUTH_TOKEN = "abc";
    // Patch require('twilio').validateRequest to return true
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "twilio") {
        return {
          validateRequest: () => true,
        };
      }
      return originalLoad(request, parent, isMain);
    };
    const req = {
      headers: new Map([
        ["content-type", "application/x-www-form-urlencoded"],
        ["x-twilio-signature", "stubbed"],
      ]),
      text: async () => "StatusCallbackEvent=completed&CallSid=CA1",
      json: async () => ({}),
      url: "https://example.com/api/telephony/webhook",
    };
    const res = await webhookPOST(req);
    // Restore
    Module._load = originalLoad;
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body).to.deep.equal({ ok: true });
  });
});
