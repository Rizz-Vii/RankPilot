require("ts-node/register/transpile-only");
const { expect } = require("chai");
const path = require("path");

const modPath = path.resolve(__dirname, "../../..", "src/lib/ai/aiClient.ts");
function purge(p) {
  try {
    delete require.cache[require.resolve(p)];
  } catch {}
}

describe("AI Adapter (Next app) - openAIEmbeddingOrNull", () => {
  beforeEach(() => {
    purge(modPath);
    delete process.env.OPENAI_API_KEY;
  });

  it("returns null when no OPENAI key", async () => {
    const { openAIEmbeddingOrNull } = require(modPath);
    const v = await openAIEmbeddingOrNull("hello");
    expect(v).to.equal(null);
  });

  it("uses shim and returns a vector when key is present", async () => {
    process.env.OPENAI_API_KEY = "test";
    class MockOpenAI {
      embeddings = {
        create: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      };
    }
    global.__OPENAI_SHIM__ = MockOpenAI;
    const { openAIEmbeddingOrNull } = require(modPath);
    const v = await openAIEmbeddingOrNull("hello world");
    expect(v).to.deep.equal([0.1, 0.2, 0.3]);
    delete global.__OPENAI_SHIM__;
  });
});
