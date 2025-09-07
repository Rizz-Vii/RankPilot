// Force ts-node to transpile as CommonJS for test environment to avoid NodeNext ESM resolution issues
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
});
require("ts-node/register/transpile-only");
const { expect } = require("chai");
// Load TS module using ts-node registered transpilation
const { normalizeUserAccess } = require("../../../src/lib/access-control.ts");

describe("normalizeUserAccess", () => {
  it("maps legacy subscriptionTier=admin to role=admin and tier=enterprise", () => {
    const ua = normalizeUserAccess({
      subscriptionTier: "admin",
      role: "user",
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("admin");
    expect(ua.tier).to.equal("enterprise");
  });

  it("elevates admin role to enterprise tier even if stored lower", () => {
    const ua = normalizeUserAccess({
      role: "admin",
      subscriptionTier: "starter",
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("admin");
    expect(ua.tier).to.equal("enterprise");
  });

  it("coerces invalid role values to 'user' and defaults unknown tier to 'free'", () => {
    const ua = normalizeUserAccess({
      role: "enterprise",
      subscriptionTier: "unknown",
      subscriptionStatus: "active",
    });
    expect(ua.role).to.equal("user");
    expect(ua.tier).to.equal("free");
  });
});
