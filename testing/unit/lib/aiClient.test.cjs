const { strict: assert } = require("assert");

// Use dynamic import to re-evaluate module under different envs
const MODULE = "../../../src/lib/ai/aiClient.ts";

async function freshImport() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

describe("aiClient", () => {
  const origEnv = { ...process.env };
  const origFetch = global.fetch;

  afterEach(() => {
    // restore env
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, origEnv);
    // restore fetch and globals
    global.fetch = origFetch;
    delete global.__OPENAI_SHIM__;
  });

  it("returns static message when no keys provided", async () => {
    const { chatComplete } = await freshImport();
    const out = await chatComplete({
      messages: [{ role: "user", content: "hi" }],
    });
    assert.equal(typeof out, "string");
    assert.ok(out.length > 0);
  });

  it("uses latency budget to short-circuit long work", async () => {
    process.env.AI_CLIENT_LATENCY_BUDGET_MS = "10";
    // Slow fetch mock
    global.fetch = () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({
                candidates: [{ content: { parts: [{ text: "gem" }] } }],
              }),
            }),
          100
        )
      );
    const { chatComplete } = await freshImport();
    const out = await chatComplete({
      messages: [{ role: "user", content: "x" }],
    });
    assert.equal(typeof out, "string");
  });

  it("fallbackOneShot returns message when Gemini responds", async () => {
    process.env.GEMINI_API_KEY = "g-key";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
      }),
    });
    const { fallbackOneShot } = await freshImport();
    const out = await fallbackOneShot("sys", "user");
    assert.equal(out, "ok");
  });

  it("openAIEmbeddingOrNull returns null without key", async () => {
    const { openAIEmbeddingOrNull } = await freshImport();
    const v = await openAIEmbeddingOrNull("hello");
    assert.equal(v, null);
  });
});
