import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';

const managerPath = '../lib/ai-memory-manager.ts';

describe('AI Memory Manager - token persistence', () => {
    let aiModule: any;
    beforeEach(async () => {
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
        delete require.cache[require.resolve(managerPath)];
        aiModule = await import(managerPath);
    });

    it('invokes persistDailyUsage with provider token counts', async () => {
        const mm = aiModule.aiMemoryManager as any;
        let called: any = null;
        mm.persistDailyUsage = async (provider: string, inT: number, outT: number, model: string) => {
            called = { provider, inT, outT, model };
        };
        mm.invokeOpenAI = async () => ({ ok: true, content: 'TOKENIZED', usage: { in: 50, out: 75 } });
        const out = await aiModule.getAI('Hello world prompt for counting tokens', 'gpt-4o');
        expect(out).to.equal('TOKENIZED');
        expect(called).to.not.equal(null);
        expect(called.provider).to.equal('openai');
        expect(called.inT).to.equal(50);
        expect(called.outT).to.equal(75);
    });
});
