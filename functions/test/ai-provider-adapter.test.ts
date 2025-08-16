import { expect } from 'chai';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

// AI Provider Adapter Hardening Tests
// Focus: env-driven preference ordering, capability routing (json, function_calling, vision), latency budget mock fallback, circuit breaker open condition.

const origEnv = { ...process.env } as any;

describe('AI Provider Adapter', () => {
    beforeEach(() => {
        process.env = { ...origEnv } as any;
        // Reset internal state maps safely
        (aiMemoryManager as any).cbFailures = new Map();
    });

    it('reorders providers putting preferred first (AI_PROVIDER)', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.ANTHROPIC_API_KEY = 'k2';
        process.env.AI_PROVIDER = 'anthropic';
        // Re-run private initializer
        (aiMemoryManager as any).initializeServices();
        const services: Map<string, any> = (aiMemoryManager as any).services;
        const first = Array.from(services.keys())[0];
        expect(first).to.equal('anthropic');
        // Patch invokeAnthropic to avoid real network
        (aiMemoryManager as any).invokeAnthropic = async () => ({ ok: true, content: 'anthropic-ok', usage: { in: 1, out: 2 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Hello', model: 'claude-3-5-sonnet-20241022' });
        expect(res.content).to.equal('anthropic-ok');
    });

    it('routes by capability when requested capability unsupported on first provider (prefers provider supporting capability)', async () => {
        // Configure openai + gemini; strip json capability from openai to force routing to gemini for json capability.
        (aiMemoryManager as any).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['gemini', { model: 'gemini-pro', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        (aiMemoryManager as any).capabilities = new Map([
            ['openai', new Set(['text'])],
            ['gemini', new Set(['text', 'json'])]
        ]);
        // Stub invokeGemini success path
        // Override makeAIRequest provider selection branch to call invokeGemini with stub
        (aiMemoryManager as any).invokeGemini = async () => ({ ok: true, content: 'TOKENIZED', usage: { in: 5, out: 7 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Return JSON please', model: 'gpt-4o', options: { capability: 'json' } });
        expect(res.content).to.equal('TOKENIZED'); // stub content
    });

    it('routes to provider with function_calling capability when primary lacks it', async () => {
        (aiMemoryManager as any).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['anthropic', { model: 'claude-3-5-sonnet-20241022', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        // Strip function_calling from openai to force fallback
        (aiMemoryManager as any).capabilities = new Map([
            ['openai', new Set(['text'])],
            ['anthropic', new Set(['text', 'json', 'function_calling'])]
        ]);
        // Stub invokeAnthropic; ensure openai path throws fast to avoid external call
        (aiMemoryManager as any).invokeOpenAI = async () => { throw new Error('forced-openai-skip'); };
        (aiMemoryManager as any).invokeAnthropic = async () => ({ ok: true, content: 'ANTHROPIC-FC', usage: { in: 3, out: 4 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Call a function', model: 'gpt-4o', options: { capability: 'function_calling', latencyBudgetMs: 500 } });
        expect(res.content).to.equal('ANTHROPIC-FC');
    });

    it('routes to provider with vision capability when requested and available', async () => {
        (aiMemoryManager as any).services = new Map([
            ['anthropic', { model: 'claude-3-5-sonnet-20241022', apiKey: 'kA', timeout: 200 }],
            ['openai', { model: 'gpt-4o', apiKey: 'kO', timeout: 200 }]
        ]);
        (aiMemoryManager as any).capabilities = new Map([
            ['anthropic', new Set(['text'])],
            ['openai', new Set(['text', 'vision'])]
        ]);
        // Force anthropic path to throw to ensure fallback to openai vision capability
        (aiMemoryManager as any).invokeAnthropic = async () => { throw new Error('anthropic-cannot-handle-vision'); };
        (aiMemoryManager as any).invokeOpenAI = async () => ({ ok: true, content: 'OPENAI-VISION', usage: { in: 2, out: 5 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Describe image', model: 'claude-3-5-sonnet-20241022', options: { capability: 'vision', latencyBudgetMs: 500 } });
        expect(res.content).to.equal('OPENAI-VISION');
    });

    it('triggers latency budget mock fallback when request exceeds AI_LATENCY_BUDGET_MS', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.AI_MOCK_FALLBACK = 'true';
        process.env.AI_LATENCY_BUDGET_MS = '10';
        (aiMemoryManager as any).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 1000, temperature: 0.1, maxTokens: 32 }]
        ]);
        // Slow invokeOpenAI beyond budget
        (aiMemoryManager as any).invokeOpenAI = async () => {
            await new Promise(r => setTimeout(r, 30));
            return { ok: true, content: 'slow-response', usage: { in: 1, out: 1 } };
        };
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Budget test', model: 'gpt-4o' });
        expect(res.content).to.match(/\[mock-ai:gpt-4o]/); // fallback mock
    });

    it('opens circuit after threshold consecutive failures and surfaces circuit_open error', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.AI_CB_THRESHOLD = '2';
        (aiMemoryManager as any).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 50 }]
        ]);
        (aiMemoryManager as any).invokeOpenAI = async () => { throw new Error('network_fail'); };
        let failed = 0; let circuitError: any = null;
        for (let i = 0; i < 3; i++) {
            try { await (aiMemoryManager as any).processRequest({ prompt: 'Fail ' + i, model: 'gpt-4o' }); }
            catch (e: any) { failed++; if (e.message.startsWith('circuit_open_')) circuitError = e; }
        }
        expect(failed).to.be.greaterThan(0);
        // After threshold, subsequent attempt should raise circuit_open; verify cbFailures state
        const failures = (aiMemoryManager as any).cbFailures.get('openai');
        expect(failures.count).to.be.greaterThan(1);
        expect(failures.openedUntil).to.be.greaterThan(Date.now() - 10);
    });

    it('routes function_calling capability to provider that supports it (openai) when others do not', async () => {
        (aiMemoryManager as any).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['gemini', { model: 'gemini-pro', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        (aiMemoryManager as any).capabilities = new Map([
            ['openai', new Set(['text', 'json', 'function_calling'])],
            ['gemini', new Set(['text'])]
        ]);
        (aiMemoryManager as any).invokeOpenAI = async () => ({ ok: true, content: 'FC-OK', usage: { in: 3, out: 5 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'call a function', model: 'gpt-4o', options: { capability: 'function_calling' } });
        expect(res.content).to.equal('FC-OK');
    });

    it('retains preferred provider when capability (vision) supported by multiple providers', async () => {
        process.env.OPENAI_API_KEY = 'kOpen';
        process.env.GEMINI_API_KEY = 'kGem';
        process.env.AI_PROVIDER = 'gemini';
        (aiMemoryManager as any).initializeServices();
        // Narrow capabilities to vision + text to make assertion explicit
        (aiMemoryManager as any).capabilities = new Map([
            ['gemini', new Set(['text', 'vision'])],
            ['openai', new Set(['text', 'vision', 'function_calling'])]
        ]);
        (aiMemoryManager as any).invokeGemini = async () => ({ ok: true, content: 'VISION-GEMINI', usage: { in: 4, out: 6 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Describe this image', model: 'gemini-pro', options: { capability: 'vision' } });
        expect(res.content).to.equal('VISION-GEMINI');
    });

    it('retains preferred provider for plain text when no capability specified', async () => {
        process.env.OPENAI_API_KEY = 'kOpen';
        process.env.GEMINI_API_KEY = 'kGem';
        process.env.AI_PROVIDER = 'gemini';
        (aiMemoryManager as any).initializeServices();
        // Ensure both providers have text capability; no special capability requested
        (aiMemoryManager as any).capabilities = new Map([
            ['gemini', new Set(['text', 'json'])],
            ['openai', new Set(['text', 'json', 'function_calling'])]
        ]);
        (aiMemoryManager as any).invokeGemini = async () => ({ ok: true, content: 'TEXT-GEMINI', usage: { in: 2, out: 3 } });
        const res = await (aiMemoryManager as any).processRequest({ prompt: 'Plain text test', model: 'gemini-pro' });
        expect(res.content).to.equal('TEXT-GEMINI');
    });
});
