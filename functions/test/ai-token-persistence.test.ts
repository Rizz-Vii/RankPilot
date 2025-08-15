import { expect } from 'chai';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

describe('AI Memory Manager - token persistence integration', () => {
    it('fires persistDailyUsage with usage from provider', async () => {
        // Force openai provider available
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
        const mm: any = aiMemoryManager;
        // Ensure a provider exists (inject openai service directly)
        mm.services = new Map([['openai', { model: 'gpt-4o', apiKey: 'test', timeout: 5000, maxTokens: 128, temperature: 0 }]]);
        let captured: any = null;
        mm.persistDailyUsage = async (provider: string, inT: number, outT: number, model: string) => { captured = { provider, inT, outT, model }; };
        mm.invokeOpenAI = async () => ({ ok: true, content: 'TOKENIZED', usage: { in: 33, out: 21 } });
        const res = await mm.processRequest({ prompt: 'Count these tokens please', model: 'gpt-4o' });
        expect(res.content).to.equal('TOKENIZED');
        expect(captured).to.not.equal(null);
        expect(captured.inT).to.equal(33);
        expect(captured.outT).to.equal(21);
    });
});
