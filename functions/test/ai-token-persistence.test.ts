import { expect } from 'chai';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

describe('AI Memory Manager - token persistence integration', () => {
    it('fires persistDailyUsage with usage from provider', async () => {
        // Force openai provider available
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
        // Ensure a provider exists (inject openai service directly via test hook)
        (aiMemoryManager as unknown as { __setServiceForTest: (k: string, cfg: { model: string; apiKey: string; timeout?: number; maxTokens?: number; temperature?: number }) => void })
            .__setServiceForTest('openai', { model: 'gpt-4o', apiKey: 'test', timeout: 5000, maxTokens: 128, temperature: 0 });

        type Capture = { provider: string; inT: number; outT: number; model: string };
        let captured: Capture | null = null;
        (aiMemoryManager as unknown as { __overridePersistDailyUsageForTest: (fn: (p: string, i: number, o: number, m: string) => Promise<void>) => void })
            .__overridePersistDailyUsageForTest(async (provider, inT, outT, model) => { captured = { provider, inT, outT, model }; });

        (aiMemoryManager as unknown as { __overrideOpenAIInvokerForTest: (fn: (s: { model: string; apiKey: string }, req: { prompt: string; model: string }, t: number) => Promise<{ ok: boolean; content: string; usage: { in: number; out: number } }>) => void })
            .__overrideOpenAIInvokerForTest(async () => ({ ok: true, content: 'TOKENIZED', usage: { in: 33, out: 21 } }));

        const res = await aiMemoryManager.processRequest({ prompt: 'Count these tokens please', model: 'gpt-4o' });
        expect(res.content).to.equal('TOKENIZED');
        expect(captured).to.not.equal(null);
        if (!captured) throw new Error('usage not captured');
        const cap = captured as unknown as Capture;
        expect(cap.inT).to.equal(33);
        expect(cap.outT).to.equal(21);
    });
});
