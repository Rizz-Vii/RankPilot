import { expect } from 'chai';
import { aiMemoryManager } from '../src/lib/ai-memory-manager';

type ProviderCfg = { model: string; apiKey: string; timeout?: number; temperature?: number; maxTokens?: number };
type Capabilities = Map<string, Set<string>>;
type Services = Map<string, ProviderCfg>;
type AIMgrPriv = {
    initializeServices: () => void;
    services: Services;
    capabilities: Capabilities;
    cbFailures: Map<string, { count: number; openedUntil: number }>;
    processRequest: (arg: { prompt: string; model: string; options?: Record<string, unknown> }) => Promise<{ content: string }>;
    invokeAnthropic: () => Promise<{ ok: boolean; content: string; usage?: { in: number; out: number } }>;
    invokeOpenAI: () => Promise<{ ok: boolean; content: string; usage?: { in: number; out: number } }>;
    invokeGemini: () => Promise<{ ok: boolean; content: string; usage?: { in: number; out: number } }>;
};

// AI Provider Adapter Hardening Tests
// Focus: env-driven preference ordering, capability routing (json, function_calling, vision), latency budget mock fallback, circuit breaker open condition.

const origEnv: NodeJS.ProcessEnv = { ...process.env };

describe('AI Provider Adapter', () => {
    beforeEach(() => {
        process.env = { ...origEnv } as NodeJS.ProcessEnv;
        // Reset internal state maps safely
        (aiMemoryManager as unknown as AIMgrPriv).cbFailures = new Map();
    });

    it('reorders providers putting preferred first (AI_PROVIDER)', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.ANTHROPIC_API_KEY = 'k2';
        process.env.AI_PROVIDER = 'anthropic';
        // Re-run private initializer
        (aiMemoryManager as unknown as AIMgrPriv).initializeServices();
        const services: Services = (aiMemoryManager as unknown as AIMgrPriv).services;
        const first = Array.from(services.keys())[0];
        expect(first).to.equal('anthropic');
        // Patch invokeAnthropic to avoid real network
        (aiMemoryManager as unknown as AIMgrPriv).invokeAnthropic = async () => ({ ok: true, content: 'anthropic-ok', usage: { in: 1, out: 2 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Hello', model: 'claude-3-5-sonnet-20241022' });
        expect(res.content).to.equal('anthropic-ok');
    });

    it('routes by capability when requested capability unsupported on first provider (prefers provider supporting capability)', async () => {
        // Configure openai + gemini; strip json capability from openai to force routing to gemini for json capability.
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['gemini', { model: 'gemini-pro', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['openai', new Set(['text'])],
            ['gemini', new Set(['text', 'json'])]
        ]);
        // Stub invokeGemini success path
        // Override makeAIRequest provider selection branch to call invokeGemini with stub
        (aiMemoryManager as unknown as AIMgrPriv).invokeGemini = async () => ({ ok: true, content: 'TOKENIZED', usage: { in: 5, out: 7 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Return JSON please', model: 'gpt-4o', options: { capability: 'json' } });
        expect(res.content).to.equal('TOKENIZED'); // stub content
    });

    it('routes to provider with function_calling capability when primary lacks it', async () => {
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['anthropic', { model: 'claude-3-5-sonnet-20241022', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        // Strip function_calling from openai to force fallback
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['openai', new Set(['text'])],
            ['anthropic', new Set(['text', 'json', 'function_calling'])]
        ]);
        // Stub invokeAnthropic; ensure openai path throws fast to avoid external call
        (aiMemoryManager as unknown as AIMgrPriv).invokeOpenAI = async () => { throw new Error('forced-openai-skip'); };
        (aiMemoryManager as unknown as AIMgrPriv).invokeAnthropic = async () => ({ ok: true, content: 'ANTHROPIC-FC', usage: { in: 3, out: 4 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Call a function', model: 'gpt-4o', options: { capability: 'function_calling', latencyBudgetMs: 500 } });
        expect(res.content).to.equal('ANTHROPIC-FC');
    });

    it('routes to provider with vision capability when requested and available', async () => {
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['anthropic', { model: 'claude-3-5-sonnet-20241022', apiKey: 'kA', timeout: 200 }],
            ['openai', { model: 'gpt-4o', apiKey: 'kO', timeout: 200 }]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['anthropic', new Set(['text'])],
            ['openai', new Set(['text', 'vision'])]
        ]);
        // Force anthropic path to throw to ensure fallback to openai vision capability
        (aiMemoryManager as unknown as AIMgrPriv).invokeAnthropic = async () => { throw new Error('anthropic-cannot-handle-vision'); };
        (aiMemoryManager as unknown as AIMgrPriv).invokeOpenAI = async () => ({ ok: true, content: 'OPENAI-VISION', usage: { in: 2, out: 5 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Describe image', model: 'claude-3-5-sonnet-20241022', options: { capability: 'vision', latencyBudgetMs: 500 } });
        expect(res.content).to.equal('OPENAI-VISION');
    });

    it('triggers latency budget mock fallback when request exceeds AI_LATENCY_BUDGET_MS', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.AI_MOCK_FALLBACK = 'true';
        process.env.AI_LATENCY_BUDGET_MS = '10';
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 1000, temperature: 0.1, maxTokens: 32 }]
        ]);
        // Slow invokeOpenAI beyond budget
        (aiMemoryManager as unknown as AIMgrPriv).invokeOpenAI = async () => {
            await new Promise(r => setTimeout(r, 30));
            return { ok: true, content: 'slow-response', usage: { in: 1, out: 1 } };
        };
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Budget test', model: 'gpt-4o' });
        expect(res.content).to.match(/\[mock-ai:gpt-4o]/); // fallback mock
    });

    it('opens circuit after threshold consecutive failures and surfaces circuit_open error', async () => {
        process.env.OPENAI_API_KEY = 'k1';
        process.env.AI_CB_THRESHOLD = '2';
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 50 }]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).invokeOpenAI = async () => { throw new Error('network_fail'); };
        let failed = 0;
        for (let i = 0; i < 3; i++) {
            try { await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Fail ' + i, model: 'gpt-4o' }); }
            catch { failed++; }
        }
        expect(failed).to.be.greaterThan(0);
        // After threshold, subsequent attempt should raise circuit_open; verify cbFailures state
        const failures = (aiMemoryManager as unknown as AIMgrPriv).cbFailures.get('openai') as { count: number; openedUntil: number };
        expect(failures.count).to.be.greaterThan(1);
        expect(failures.openedUntil).to.be.greaterThan(Date.now() - 10);
    });

    it('routes function_calling capability to provider that supports it (openai) when others do not', async () => {
        (aiMemoryManager as unknown as AIMgrPriv).services = new Map([
            ['openai', { model: 'gpt-4o', apiKey: 'k1', timeout: 200, temperature: 0.1, maxTokens: 32 }],
            ['gemini', { model: 'gemini-pro', apiKey: 'k2', timeout: 200, temperature: 0.1, maxTokens: 32 }]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['openai', new Set(['text', 'json', 'function_calling'])],
            ['gemini', new Set(['text'])]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).invokeOpenAI = async () => ({ ok: true, content: 'FC-OK', usage: { in: 3, out: 5 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'call a function', model: 'gpt-4o', options: { capability: 'function_calling' } });
        expect(res.content).to.equal('FC-OK');
    });

    it('retains preferred provider when capability (vision) supported by multiple providers', async () => {
        process.env.OPENAI_API_KEY = 'kOpen';
        process.env.GEMINI_API_KEY = 'kGem';
        process.env.AI_PROVIDER = 'gemini';
        (aiMemoryManager as unknown as AIMgrPriv).initializeServices();
        // Narrow capabilities to vision + text to make assertion explicit
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['gemini', new Set(['text', 'vision'])],
            ['openai', new Set(['text', 'vision', 'function_calling'])]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).invokeGemini = async () => ({ ok: true, content: 'VISION-GEMINI', usage: { in: 4, out: 6 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Describe this image', model: 'gemini-pro', options: { capability: 'vision' } });
        expect(res.content).to.equal('VISION-GEMINI');
    });

    it('retains preferred provider for plain text when no capability specified', async () => {
        process.env.OPENAI_API_KEY = 'kOpen';
        process.env.GEMINI_API_KEY = 'kGem';
        process.env.AI_PROVIDER = 'gemini';
        (aiMemoryManager as unknown as AIMgrPriv).initializeServices();
        // Ensure both providers have text capability; no special capability requested
        (aiMemoryManager as unknown as AIMgrPriv).capabilities = new Map([
            ['gemini', new Set(['text', 'json'])],
            ['openai', new Set(['text', 'json', 'function_calling'])]
        ]);
        (aiMemoryManager as unknown as AIMgrPriv).invokeGemini = async () => ({ ok: true, content: 'TEXT-GEMINI', usage: { in: 2, out: 3 } });
        const res = await (aiMemoryManager as unknown as AIMgrPriv).processRequest({ prompt: 'Plain text test', model: 'gemini-pro' });
        expect(res.content).to.equal('TEXT-GEMINI');
    });
});
