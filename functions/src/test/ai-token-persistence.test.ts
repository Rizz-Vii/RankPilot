import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";

type OpenAIResult = {
  ok: boolean;
  content?: string;
  usage?: { in: number; out: number };
};
interface AIModule {
  aiMemoryManager: {
    persistDailyUsage?: (
      provider: string,
      inT: number,
      outT: number,
      model: string
    ) => Promise<void>;
    invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
  };
  getAI: (prompt: string, model: string) => Promise<string>;
}

const managerPath = "../lib/ai-memory-manager.ts";

describe("AI Memory Manager - token persistence", () => {
  let aiModule: AIModule;
  beforeEach(async () => {
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
    delete require.cache[require.resolve(managerPath)];
    aiModule = (await import(managerPath)) as unknown as AIModule;
  });

  it("invokes persistDailyUsage with provider token counts", async () => {
    const mm = aiModule.aiMemoryManager as {
      persistDailyUsage?: (
        provider: string,
        inT: number,
        outT: number,
        model: string
      ) => Promise<void>;
      invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
    };
    let called: unknown = null;
    mm.persistDailyUsage = async (
      provider: string,
      inT: number,
      outT: number,
      model: string
    ) => {
      called = { provider, inT, outT, model };
    };
    mm.invokeOpenAI = async () => ({
      ok: true,
      content: "TOKENIZED",
      usage: { in: 50, out: 75 },
    });
    const out = await aiModule.getAI(
      "Hello world prompt for counting tokens",
      "gpt-4o"
    );
    expect(out).to.equal("TOKENIZED");
    expect(called).to.not.equal(null);
    const c = called as {
      provider?: unknown;
      inT?: unknown;
      outT?: unknown;
    } | null;
    expect(c).to.not.equal(null);
    expect(c && c.provider).to.equal("openai");
    expect(c && c.inT).to.equal(50);
    expect(c && c.outT).to.equal(75);
  });
});
