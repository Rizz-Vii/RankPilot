// Enable requiring TypeScript modules
require("ts-node/register/transpile-only");
const assert = require("assert");

describe("demo flags", () => {
  const modPath = "../../../src/lib/flags/demo.ts";

  function resetEnv() {
    delete process.env.NEXT_PUBLIC_DEMO_CONTENT;
    delete process.env.DEMO_CONTENT;
    process.env.NODE_ENV = "test";
    // Clear any simulated window
    global.window = undefined;
  }

  beforeEach(() => {
    resetEnv();
    // Purge module cache
    try {
      delete require.cache[require.resolve(modPath)];
    } catch {}
  });

  it("defaults to false when no env and no localStorage", () => {
    const mod = require(modPath);
    assert.strictEqual(mod.allowDemoContent(), false);
    assert.strictEqual(mod.allowIntegrationsMocks(), false);
    assert.strictEqual(mod.allowEnterpriseMocks(), false);
  });

  it("localStorage override: true enables demo features", () => {
    global.window = {
      localStorage: { getItem: (k) => (k === "demoContent" ? "true" : null) },
    };
    const mod = require(modPath);
    assert.strictEqual(mod.allowDemoContent(), true);
  });

  it("localStorage override: false disables even if env true", () => {
    global.window = { localStorage: { getItem: () => "false" } };
    process.env.NEXT_PUBLIC_DEMO_CONTENT = "true";
    const mod = require(modPath);
    assert.strictEqual(mod.allowDemoContent(), false);
  });

  it("env toggles respected when no localStorage present", () => {
    const mod1 = require(modPath);
    assert.strictEqual(mod1.allowDemoContent(), false);
    delete require.cache[require.resolve(modPath)];
    process.env.NEXT_PUBLIC_DEMO_CONTENT = "true";
    const mod2 = require(modPath);
    assert.strictEqual(mod2.allowDemoContent(), true);
  });

  it("allowStreamingMockUser is gated in production unless DEMO_CONTENT=true", () => {
    process.env.NODE_ENV = "production";
    const mod1 = require(modPath);
    assert.strictEqual(mod1.allowStreamingMockUser(), false);
    delete require.cache[require.resolve(modPath)];
    process.env.DEMO_CONTENT = "true";
    const mod2 = require(modPath);
    assert.strictEqual(mod2.allowStreamingMockUser(), true);
  });
});
