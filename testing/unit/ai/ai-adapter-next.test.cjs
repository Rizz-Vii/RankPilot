// Next-app-level AI adapter tests mirroring Functions AIMemoryManager behaviors
require('ts-node/register/transpile-only');
const { expect } = require('chai');

// Target: src/lib/ai/aiClient.ts (env-driven provider selection, latency-ish budget via timeout race not present here)
const path = require('path');
const modPath = path.resolve(__dirname, '../../..', 'src/lib/ai/aiClient.ts');

function purge(modulePath){ try { delete require.cache[require.resolve(modulePath)]; } catch {} }

// Simple fetch mock to avoid real network calls to Gemini
const originalFetch = global.fetch;

describe('AI Adapter (Next app) - provider routing and fallbacks', () => {
  beforeEach(() => {
    purge(modPath);
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    global.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini-ok' }] } }] }) });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('routes to OpenAI when OPENAI_API_KEY is set and returns text', async () => {
    process.env.OPENAI_API_KEY = 'test-openai';
    // Prepare shim BEFORE loading aiClient.ts
    class MockOpenAI {
      constructor(){ }
      chat = { completions: { create: async () => ({ choices: [{ message: { content: 'openai-ok' } }] }) } };
      embeddings = { create: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) };
    }
    global.__OPENAI_SHIM__ = MockOpenAI;
    try {
      purge(modPath);
      const { chatComplete } = require(modPath);
      const text = await chatComplete({ messages: [{ role: 'user', content: 'hi' }] });
      expect(text).to.equal('openai-ok');
    } finally {
      delete global.__OPENAI_SHIM__;
    }
  });

  it('falls back to Gemini when OpenAI key missing and GEMINI key present', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini';
    const { chatComplete } = require(modPath);
    const text = await chatComplete({ messages: [{ role: 'user', content: 'hello' }] });
    expect(text).to.equal('gemini-ok');
  });

  it('returns static failure when no providers configured', async () => {
    const { chatComplete } = require(modPath);
    const text = await chatComplete({ messages: [{ role: 'user', content: 'nope' }] });
    expect(text).to.match(/Unable to generate/);
  });
});
