/*
  Test: canAccessFeature emits entitlement misuse warning only once per key.
  Rationale: After adding Set-based suppression we must prevent log spam.
*/
require("ts-node/register");
const assert = require("assert");

describe("access-control entitlement warning de-noise", () => {
  let access;
  let warned = [];
  const originalWarn = console.warn;
  before(() => {
    console.warn = (msg, ...rest) => {
      warned.push(String(msg));
    }; // capture
    access = require("../../../src/lib/access-control.ts");
  });
  after(() => {
    console.warn = originalWarn;
  });
  it("warns only once per entitlement key", () => {
    const ua = { role: "user", tier: "agency", status: "active" };
    // Call multiple times with entitlement key (priority_support)
    access.canAccessFeature(ua, "priority_support");
    access.canAccessFeature(ua, "priority_support");
    access.canAccessFeature(ua, "priority_support");
    const matches = warned.filter((w) =>
      w.includes("Entitlement key 'priority_support'")
    );
    assert.strictEqual(
      matches.length,
      1,
      "should warn exactly once for priority_support"
    );
  });
  it("distinct entitlement keys each warn once", () => {
    const ua = { role: "user", tier: "enterprise", status: "active" };
    access.canAccessFeature(ua, "dedicated_support");
    access.canAccessFeature(ua, "dedicated_support");
    access.canAccessFeature(ua, "enterprise_sla");
    access.canAccessFeature(ua, "enterprise_sla");
    const ded = warned.filter((w) => w.includes("'dedicated_support'"));
    const sla = warned.filter((w) => w.includes("'enterprise_sla'"));
    assert.strictEqual(ded.length, 1, "dedicated_support should warn once");
    assert.strictEqual(sla.length, 1, "enterprise_sla should warn once");
  });
});
