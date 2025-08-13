import { expect } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import sinon from "sinon";

const managerPath = "../lib/ai-memory-manager.js";

describe("AI Memory Manager", () => {
    let sandbox: sinon.SinonSandbox;
    let aiModule: any;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        // Ensure a provider is registered (OpenAI)
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
        delete require.cache[require.resolve(managerPath)];
        aiModule = await import(managerPath);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("returns content on happy path (cache miss -> provider -> cache set)", async () => {
        const mm = aiModule.aiMemoryManager;
        const stub = sandbox.stub(mm as any, "invokeOpenAI").callsFake(async () => ({ ok: true, content: "hello world" }));
        const result = await aiModule.getAI("Say hi", "gpt-4o");
        expect(result).to.equal("hello world");
        expect(stub.called).to.be.true;
        stub.restore();
        const stub2 = sandbox.stub(mm as any, "invokeOpenAI").callsFake(async () => ({ ok: true, content: "nope" }));
        const result2 = await aiModule.getAI("Say hi", "gpt-4o");
        expect(result2).to.equal("hello world");
        expect(stub2.called).to.be.false;
    });

    it("retries on retriable error and eventually succeeds", async () => {
        const mm = aiModule.aiMemoryManager;
        const stub = sandbox.stub(mm as any, "invokeOpenAI");
        stub.onFirstCall().resolves({ ok: false, retriable: true, status: 429, error: new Error("429") });
        stub.onSecondCall().resolves({ ok: true, content: "recovered" });
        const start = Date.now();
        const out = await aiModule.getAI("Retry test", "gpt-4o");
        const duration = Date.now() - start;
        expect(out).to.equal("recovered");
        expect(stub.callCount).to.equal(2);
        expect(duration).to.be.greaterThan(100);
    });

    it("throws after retries exhausted", async () => {
        const mm = aiModule.aiMemoryManager;
        const stub = sandbox.stub(mm as any, "invokeOpenAI").resolves({ ok: false, retriable: true, status: 500, error: new Error("boom") });
        try {
            await aiModule.getAI("Fail fully", "gpt-4o");
            expect.fail("should have thrown");
        } catch (e: any) {
            expect(e).to.be.instanceOf(Error);
        }
        expect(stub.callCount).to.be.greaterThan(1);
    });
});
