import { expect } from 'chai';
import { z } from 'zod';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

type ProviderConfig = {
    model: string;
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxTokens?: number;
    temperature?: number;
};

type AIMemoryManagerPrivate = {
    makeAIRequest: (...args: unknown[]) => Promise<unknown> | unknown;
    services: Map<string, ProviderConfig>;
    processRequest: (arg: { prompt: string; model: string; options?: Record<string, unknown> }) => Promise<{ content: string } & Record<string, unknown>>;
};

describe('AI Memory Manager - schema validation and latency budget', () => {
    const origEnv: NodeJS.ProcessEnv = { ...process.env };
    const mm = aiMemoryManager as unknown as AIMemoryManagerPrivate;

    beforeEach(() => {
        process.env = { ...origEnv } as NodeJS.ProcessEnv;
        // Ensure no real providers are hit during these tests
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
    });

    it('throws when strictSchema=true and content does not satisfy schema (JSON parse fails)', async () => {
        // Temporarily replace makeAIRequest for this test
        const originalImpl = mm.makeAIRequest;
        (mm as unknown as { makeAIRequest: (...args: unknown[]) => Promise<string> | string }).makeAIRequest = async () => 'not json';
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
            });
        } catch {
            threw = true;
        } finally {
            // restore
            (mm as unknown as { makeAIRequest: AIMemoryManagerPrivate['makeAIRequest'] }).makeAIRequest = originalImpl;
        }
        expect(threw).to.equal(true);
    });

    it('returns response when strictSchema=false even if schema parsing fails', async () => {
        const originalImpl = mm.makeAIRequest;
        (mm as unknown as { makeAIRequest: (...args: unknown[]) => Promise<string> | string }).makeAIRequest = async () => 'still not json';
        // Ensure a provider is configured on the singleton services map
        const services: AIMemoryManagerPrivate['services'] = mm.services;
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
            });
            expect(res.content).to.equal('still not json');
            const structured = (res && typeof res === 'object' && 'structured' in res)
                ? (res as { structured: unknown }).structured
                : undefined;
            expect(structured).to.equal(undefined);
        } finally {
            (mm as unknown as { makeAIRequest: AIMemoryManagerPrivate['makeAIRequest'] }).makeAIRequest = originalImpl;
            // restore services
            (mm as unknown as { services: AIMemoryManagerPrivate['services'] }).services = snapshot as AIMemoryManagerPrivate['services'];
        }
    });

    it('falls back to mock content when latency budget is exceeded (even with mock flag off)', async () => {
        // Ensure mock flag is not driving this behavior
        process.env.AI_MOCK_FALLBACK = 'false';

        const originalImpl = mm.makeAIRequest;
        (mm as unknown as { makeAIRequest: (...args: unknown[]) => Promise<string> | string }).makeAIRequest = async () => {
            await new Promise(r => setTimeout(r, 50));
            return 'late content';
        };
        // Ensure a provider is configured
        const services: AIMemoryManagerPrivate['services'] = mm.services;
        const snapshot = new Map(services);
        services.set('openai', { model: 'gpt-4o', apiKey: 'test', baseUrl: 'http://localhost', timeout: 5000, maxTokens: 128, temperature: 0 });

        try {
            const res = await aiMemoryManager.processRequest({
                prompt: 'Budget test prompt',
                model: 'gpt-4o',
                options: { latencyBudgetMs: 1 } as Record<string, unknown>,
            });
            expect(res.content).to.match(/\[mock-ai:.*\] Budget test prompt/);
        } finally {
            (mm as unknown as { makeAIRequest: AIMemoryManagerPrivate['makeAIRequest'] }).makeAIRequest = originalImpl;
            (mm as unknown as { services: AIMemoryManagerPrivate['services'] }).services = snapshot as AIMemoryManagerPrivate['services'];
        }
    });
});
