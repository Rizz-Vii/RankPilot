require("ts-node/register/transpile-only");
const { expect } = require("chai");
const path = require("path");

const modPath = path.resolve(__dirname, "../../..", "src/lib/ai/aiClient.ts");
function purge(p) {
  try {
    delete require.cache[require.resolve(p)];
  } catch {}
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("AI Adapter (Next app) - latency budget", () => {
  beforeEach(() => {
    purge(modPath);
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_CLIENT_LATENCY_BUDGET_MS;
  });

  it("returns fallback when budget is exceeded", async () => {
    process.env.OPENAI_API_KEY = "test";
    process.env.AI_CLIENT_LATENCY_BUDGET_MS = "5";
    // Slow OpenAI shim (50ms)
    class SlowOpenAI {
      constructor() {}
      chat = {
        completions: {
          create: async () => {
            await delay(50);
            return { choices: [{ message: { content: "slow-openai" } }] };
          },
        },
      };
      embeddings = { create: async () => ({ data: [{ embedding: [0.1] }] }) };
    }
    global.__OPENAI_SHIM__ = SlowOpenAI;
    const { chatComplete } = require(modPath);
    const t0 = Date.now();
    const text = await chatComplete({
      messages: [{ role: "user", content: "hi" }],
    });
    const dt = Date.now() - t0;
    expect(text).to.match(/Unable to generate/);
    expect(dt).to.be.lessThan(40);
    delete global.__OPENAI_SHIM__;
  });
});
