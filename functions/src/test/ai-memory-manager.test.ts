import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";

type OpenAIResult = {
  ok: boolean;
  content?: string;
  usage?: { in: number; out: number };
  retriable?: boolean;
  status?: number;
  error?: Error;
};
interface AIModule {
  aiMemoryManager: {
    invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
    persistDailyUsage?: (
      provider: string,
      inT: number,
      outT: number,
      model: string
    ) => Promise<void>;
  };
  getAI: (prompt: string, model: string) => Promise<string>;
}

const managerPath = "../lib/ai-memory-manager.js";

describe("AI Memory Manager", () => {
  let sandbox: sinon.SinonSandbox;
  let aiModule: AIModule;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    // Ensure a provider is registered (OpenAI)
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
    delete require.cache[require.resolve(managerPath)];
    aiModule = (await import(managerPath)) as unknown as AIModule;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("returns content on happy path (cache miss -> provider -> cache set)", async () => {
    const mm = aiModule.aiMemoryManager as {
      invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
    };
    const stub = sandbox
      .stub(mm as unknown as Record<string, unknown>, "invokeOpenAI")
      .callsFake(async () => ({ ok: true, content: "hello world" }));
    const result = await aiModule.getAI("Say hi", "gpt-4o");
    expect(result).to.equal("hello world");
    expect(stub.called).to.be.true;
    stub.restore();
    const stub2 = sandbox
      .stub(mm as unknown as Record<string, unknown>, "invokeOpenAI")
      .callsFake(async () => ({ ok: true, content: "nope" }));
    const result2 = await aiModule.getAI("Say hi", "gpt-4o");
    expect(result2).to.equal("hello world");
    expect(stub2.called).to.be.false;
  });

  it("retries on retriable error and eventually succeeds", async () => {
    const mm = aiModule.aiMemoryManager as {
      invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
    };
    const stub = sandbox.stub(
      mm as unknown as Record<string, unknown>,
      "invokeOpenAI"
    );
    stub.onFirstCall().resolves({
      ok: false,
      retriable: true,
      status: 429,
      error: new Error("429"),
    });
    stub.onSecondCall().resolves({ ok: true, content: "recovered" });
    const start = Date.now();
    const out = await aiModule.getAI("Retry test", "gpt-4o");
    const duration = Date.now() - start;
    expect(out).to.equal("recovered");
    expect(stub.callCount).to.equal(2);
    expect(duration).to.be.greaterThan(100);
  });

  it("throws after retries exhausted", async () => {
    const mm = aiModule.aiMemoryManager as {
      invokeOpenAI?: (...args: unknown[]) => Promise<OpenAIResult>;
    };
    const stub = sandbox
      .stub(mm as unknown as Record<string, unknown>, "invokeOpenAI")
      .resolves({
        ok: false,
        retriable: true,
        status: 500,
        error: new Error("boom"),
      });
    try {
      await aiModule.getAI("Fail fully", "gpt-4o");
      expect.fail("should have thrown");
    } catch (e: unknown) {
      expect(e instanceof Error).to.be.true;
    }
    expect(stub.callCount).to.be.greaterThan(1);
  });
});
