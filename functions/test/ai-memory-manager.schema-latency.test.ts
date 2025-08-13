import { expect } from 'chai';
import { z } from 'zod';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

describe('AI Memory Manager - schema validation and latency budget', () => {
    const origEnv = { ...process.env } as any;

    beforeEach(() => {
        process.env = { ...origEnv } as any;
        // Ensure no real providers are hit during these tests
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
    });

    it('throws when strictSchema=true and content does not satisfy schema (JSON parse fails)', async () => {
        const stub = (aiMemoryManager as any).makeAIRequest as Function;
        // Temporarily replace makeAIRequest for this test
        const originalImpl = stub.bind(aiMemoryManager);
        (aiMemoryManager as any).makeAIRequest = async () => 'not json';
        let threw = false;
        try {
            await aiMemoryManager.processRequest({
                prompt: 'ignored',
                model: 'gpt-4o',
                options: {
                    schema: z.object({ foo: z.string() }),
                    strictSchema: true,
                    expectJson: true,
                },
            } as any);
        } catch (e) {
            threw = true;
        } finally {
            // restore
            (aiMemoryManager as any).makeAIRequest = originalImpl;
        }
        expect(threw).to.equal(true);
    });

    it('returns response when strictSchema=false even if schema parsing fails', async () => {
        const stub = (aiMemoryManager as any).makeAIRequest as Function;
        const originalImpl = stub.bind(aiMemoryManager);
        (aiMemoryManager as any).makeAIRequest = async () => 'still not json';
        // Ensure a provider is configured on the singleton services map
        const services: Map<string, any> = (aiMemoryManager as any).services;
        const snapshot = new Map(services);
        services.set('openai', { model: 'gpt-4o', apiKey: 'test', baseUrl: 'http://localhost', timeout: 5000, maxTokens: 128, temperature: 0 });
        try {
            const res = await aiMemoryManager.processRequest({
                prompt: 'ignored',
                model: 'gpt-4o',
                options: {
                    schema: z.object({ foo: z.string() }),
                    strictSchema: false,
                    expectJson: true,
                },
            } as any);
            expect(res.content).to.equal('still not json');
            expect((res as any).structured).to.equal(undefined);
        } finally {
            (aiMemoryManager as any).makeAIRequest = originalImpl;
            // restore services
            (aiMemoryManager as any).services = snapshot;
        }
    });

    it('falls back to mock content when latency budget is exceeded (even with mock flag off)', async () => {
        // Ensure mock flag is not driving this behavior
        process.env.AI_MOCK_FALLBACK = 'false';

        const stub = (aiMemoryManager as any).makeAIRequest as Function;
        const originalImpl = stub.bind(aiMemoryManager);
        (aiMemoryManager as any).makeAIRequest = async () => {
            await new Promise(r => setTimeout(r, 50));
            return 'late content';
        };
        // Ensure a provider is configured
        const services: Map<string, any> = (aiMemoryManager as any).services;
        const snapshot = new Map(services);
        services.set('openai', { model: 'gpt-4o', apiKey: 'test', baseUrl: 'http://localhost', timeout: 5000, maxTokens: 128, temperature: 0 });

        try {
            const res = await aiMemoryManager.processRequest({
                prompt: 'Budget test prompt',
                model: 'gpt-4o',
                options: { latencyBudgetMs: 1 },
            } as any);
            expect(res.content).to.match(/\[mock-ai:.*\] Budget test prompt/);
        } finally {
            (aiMemoryManager as any).makeAIRequest = originalImpl;
            (aiMemoryManager as any).services = snapshot;
        }
    });
});
