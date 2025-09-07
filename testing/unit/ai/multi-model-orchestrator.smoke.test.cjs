require("ts-node/register/transpile-only");
const { expect } = require("chai");

const {
  multiModelOrchestrator,
} = require("../../../src/lib/ai/multi-model-orchestrator");

// Temporarily skipped due to ESM resolution issue in test runner; enable after module import fix.
describe.skip("MultiModelOrchestrator smoke", () => {
  after(() => {
    if (multiModelOrchestrator?.dispose) multiModelOrchestrator.dispose();
  });

  it("processes a basic text-generation request and caches the result", async () => {
    const req = {
      task: "text-generation",
      input: "Hello world",
      userTier: "admin",
      userId: "smoke-user",
      options: { maxTokens: 64 },
    };
    const first = await multiModelOrchestrator.processRequest(req);
    expect(first.success).to.equal(true);
    expect(first.results).to.be.an("array").that.is.not.empty;
    expect(first.cacheHits).to.equal(0);
    const second = await multiModelOrchestrator.processRequest(req);
    expect(second.success).to.equal(true);
    expect(second.cacheHits).to.be.greaterThan(0);
    expect(second.results[0]).to.have.property("model");
  });
});
