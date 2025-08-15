import { expect } from 'chai';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

describe('AI Memory Manager - fallback behavior', () => {
    const orig = { ...process.env } as any;
    beforeEach(() => {
        process.env = { ...orig } as any;
    });

    it('throws when no providers configured and mock fallback disabled', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.AI_MOCK_FALLBACK;
        // Clear configured services forcibly (test isolation)
        (aiMemoryManager as any).services = new Map();
        let threw = false;
        try {
            await aiMemoryManager.processRequest({ prompt: 'Hello', model: 'gpt-4o' });
        } catch {
            threw = true;
        }
        expect(threw).to.equal(true);
    });

    it('returns mock content when AI_MOCK_FALLBACK=true and no providers configured', async () => {
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        process.env.AI_MOCK_FALLBACK = 'true';
        (aiMemoryManager as any).services = new Map();
        const res = await aiMemoryManager.processRequest({ prompt: 'Hello world', model: 'gpt-4o' });
        expect(res.content).to.match(/\[mock-ai:.*\] Hello world/);
    });
});
