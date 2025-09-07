require("ts-node/register/transpile-only");
const { expect } = require("chai");
const path = require("path");

const adapterPath = path.resolve(
  __dirname,
  "../../../src/lib/ai/agents/agentAdapter.ts"
);

function purge(p) {
  try {
    delete require.cache[require.resolve(p)];
  } catch {}
}

describe("Agent Adapter smoke", () => {
  beforeEach(() => {
    delete process.env.RANKPILOT_AGENTS_ENABLED;
    purge(adapterPath);
  });

  it("returns disabled status when agents flag off", async () => {
    const { runAdHocSimpleAgent } = require(adapterPath);
    const res = await runAdHocSimpleAgent("hello", "Respond politely");
    expect(res.ok).to.equal(false);
    expect(res.error).to.equal("agents_disabled");
  });
});
