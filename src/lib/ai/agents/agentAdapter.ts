/**
 * Agent Adapter: Thin integration layer wrapping the OpenAI Agents SDK so the rest
 * of the codebase can experiment with agentic workflows behind a feature flag.
 *
 * Design goals:
 * - Lazy import (@openai/agents) to avoid adding cost to cold paths when disabled.
 * - Provide a stable minimal surface (createSimpleAgent, runAgentOnce).
 * - Honor env flag RANKPILOT_AGENTS_ENABLED (default false) to guard usage.
 * - Reuse existing OPENAI_API_KEY environment variable (the SDK reads process.env automatically).
 */
import type { Agent } from '@openai/agents';

// Narrow helper types for usage metadata

// Narrow runtime helpers to avoid pervasive `any` while preserving SDK flexibility.
function errToString(e: unknown): string {
    if (e === null || e === undefined) return String(e);
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    try {
        const maybeMsg = (e as Record<string, unknown>).message;
        return typeof maybeMsg === 'string' ? maybeMsg : String(e);
    } catch {
        return String(e);
    }
}
/** Cast a lazily-imported SDK value into a local typed shape. Keeps import flexible while limiting `any` spread. */
function asSdk<T>(v: unknown): T {
    return v as T;
}
interface UsageMeta {
    turns?: number;
    runId?: string;
    toolCalls?: Array<{ name: string; args: unknown; result?: unknown; durationMs?: number; error?: string }>;
    durationMs?: number;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    [k: string]: unknown;
}

export interface SimpleAgentDefinition {
    name: string;
    instructions: string | ((context: Record<string, unknown>) => string | Promise<string>);
    model?: string; // allow override; fallback handled by SDK default
    tools?: AgentToolDefinition[]; // optional tools
    handoffs?: Agent[]; // optional handoff agents
    inputGuardrails?: InputGuardrailDefinition[];
    outputGuardrails?: OutputGuardrailDefinition[];
}

export interface AgentToolDefinition {
    name: string;
    description: string;
    // zod schema provided as a lazy function to avoid hard dependency at import time
    schema: () => unknown; // lazy/opaque to avoid cross-version pin friction
    execute: (input: Record<string, unknown>, ctx: { startTs: number; runId: string }) => Promise<unknown> | unknown;
}

export interface AgentRunOptions<TContext extends Record<string, unknown> = Record<string, unknown>> {
    input: string;
    context?: TContext;
    maxTurns?: number;
}

export interface AgentRunResult<TOutput = unknown> {
    ok: boolean;
    output?: TOutput | string;
    error?: string;
    meta?: UsageMeta;
}

export interface InputGuardrailDefinition {
    name: string;
    /** Returns tripwire boolean; any extra info for debugging. */
    execute: (args: { input: string; context?: unknown }) => Promise<{ tripwire: boolean; info?: unknown }> | { tripwire: boolean; info?: unknown };
}

export interface OutputGuardrailDefinition {
    name: string;
    /** Returns tripwire boolean given agent output. */
    execute: (args: { agentOutput: unknown; context?: unknown }) => Promise<{ tripwire: boolean; info?: unknown }> | { tripwire: boolean; info?: unknown };
}

function agentsEnabled(): boolean {
    if (process.env.RANKPILOT_AGENTS_ENABLED === 'true' || process.env.RANKPILOT_AGENTS_ENABLED === '1') return true;
    // client-side cookie override (dev only) - lightweight parse
    if (typeof document !== 'undefined') {
        try {
            const m = document.cookie.match(/(?:^|; )rp_agents=(?<v>1)/);
            if (m && (m.groups?.v === '1')) return true;
        } catch { }
    }
    return false;
}

/** Dynamically import SDK only when needed to keep baseline load minimal. */
async function loadAgentsSdk(): Promise<unknown> { // keep as opaque runtime import
    return import('@openai/agents');
}

/** Create an agent instance with optional tools + handoffs */
export async function createSimpleAgent(def: SimpleAgentDefinition): Promise<Agent | null> {
    if (!agentsEnabled()) return null;
    const sdk = asSdk<{ Agent?: unknown; tool?: unknown }>(await loadAgentsSdk());
    const AgentCtor = sdk.Agent;
    const tool = sdk.tool as (cfg: Record<string, unknown>) => unknown;
    let tools: unknown[] | undefined;
    if (def.tools && def.tools.length && tool) {
        tools = def.tools.map(t => {
            const schema = t.schema();
            return tool({
                name: t.name,
                description: t.description,
                parameters: schema,
                execute: async (input: Record<string, unknown>) => {
                    const start = Date.now();
                    try {
                        return await t.execute(input, { startTs: start, runId: 'adhoc' });
                    } catch (e) {
                        const msg = errToString(e);
                        return { error: msg };
                    }
                }
            });
        });
    }
    const inputGuardrails = (def.inputGuardrails || []).map(g => ({
        name: g.name,
        execute: async ({ input, context }: { input: string; context?: unknown }) => {
            const res = await g.execute({ input, context });
            // Narrow unknown result shape safely
            const r = (res && typeof res === 'object') ? res as Record<string, unknown> : {};
            const info = 'info' in r ? r.info : undefined;
            const tripwireVal = 'tripwire' in r ? r.tripwire : undefined;
            const tripwireTriggered = typeof tripwireVal === 'boolean' ? tripwireVal : Boolean(tripwireVal);
            return { outputInfo: info, tripwireTriggered };
        }
    }));
    const outputGuardrails = (def.outputGuardrails || []).map(g => ({
        name: g.name,
        execute: async ({ agentOutput, context }: { agentOutput: unknown; context?: unknown }) => {
            const res = await g.execute({ agentOutput, context });
            // Narrow unknown result shape safely
            const r = (res && typeof res === 'object') ? res as Record<string, unknown> : {};
            const info = 'info' in r ? r.info : undefined;
            const tripwireVal = 'tripwire' in r ? r.tripwire : undefined;
            const tripwireTriggered = typeof tripwireVal === 'boolean' ? tripwireVal : Boolean(tripwireVal);
            return { outputInfo: info, tripwireTriggered };
        }
    }));
    const baseConfig: unknown = {
        name: def.name,
        instructions: def.instructions as unknown as string | ((context: Record<string, unknown>) => string | Promise<string>),
        model: def.model,
        tools,
        inputGuardrails: inputGuardrails.length ? inputGuardrails : undefined,
        outputGuardrails: outputGuardrails.length ? outputGuardrails : undefined
    };
    if (AgentCtor) {
        if (def.handoffs && def.handoffs.length && typeof (AgentCtor as Record<string, unknown>).create === 'function') {
            return (AgentCtor as { create: (cfg: Record<string, unknown>) => Agent }).create({ ...(baseConfig as Record<string, unknown>), handoffs: def.handoffs });
        }
        try {
            return new (AgentCtor as new (cfg: unknown) => Agent)(baseConfig);
        } catch {
            return null;
        }
    }
    return null;
}

/** Run an agent for a single input returning the final output. */
export async function runAgentOnce<TContext extends Record<string, unknown> = Record<string, unknown>>(
    agent: Agent | null,
    opts: AgentRunOptions<TContext>
): Promise<AgentRunResult> {
    if (!agent) {
        return { ok: false, error: 'agents_disabled' };
    }
    const sdk = asSdk<{ run: (agent: Agent, input: string, opts: Record<string, unknown>) => Promise<unknown> }>(await loadAgentsSdk());
    const { run } = sdk;
    try {
        const started = Date.now();
        const result: unknown = await run(agent, opts.input, { context: opts.context, maxTurns: opts.maxTurns });
        const resAny = result as Record<string, unknown>;
        return {
            ok: true,
            output: (resAny as { finalOutput?: unknown }).finalOutput,
            meta: {
                turns: (resAny as { turns?: number }).turns,
                runId: (resAny as { runId?: string }).runId,
                toolCalls: Array.isArray(resAny.toolCalls)
                    ? (resAny.toolCalls as unknown[]).map(tc => {
                        const t = tc as Record<string, unknown>;
                        return {
                            name: typeof t.name === 'string' ? t.name : 'tool',
                            args: t.args as unknown,
                            result: t.result as unknown,
                            durationMs: typeof t.durationMs === 'number' ? t.durationMs : undefined,
                            error: typeof t.error === 'string' ? t.error : undefined,
                        };
                    }) as UsageMeta['toolCalls']
                    : [],
                durationMs: Date.now() - started,
                model: ((agent as unknown) as Record<string, unknown> & { model?: string }).model,
                inputTokens: (resAny as { inputTokens?: number; promptTokens?: number; usage?: { prompt_tokens?: number } }).inputTokens ?? (resAny as { promptTokens?: number }).promptTokens ?? (resAny as { usage?: { prompt_tokens?: number } }).usage?.prompt_tokens,
                outputTokens: (resAny as { outputTokens?: number; completionTokens?: number; usage?: { completion_tokens?: number } }).outputTokens ?? (resAny as { completionTokens?: number }).completionTokens ?? (resAny as { usage?: { completion_tokens?: number } }).usage?.completion_tokens,
                totalTokens: (resAny as { totalTokens?: number; usage?: { total_tokens?: number } }).totalTokens ?? (resAny as { usage?: { total_tokens?: number } }).usage?.total_tokens
            }
        };
    } catch (e) {
        const msg = errToString(e);
        return { ok: false, error: msg };
    }
}

/** Convenience helper to build+run in one shot. */
export async function runAdHocSimpleAgent(input: string, instructions: string): Promise<AgentRunResult> {
    const agent = await createSimpleAgent({ name: 'AdHoc', instructions });
    return runAgentOnce(agent, { input });
}

/** Streaming run: collects text + events; consumer can also attach to incremental callback. */
export async function runAgentStream(
    agent: Agent | null,
    opts: AgentRunOptions & { onToken?: (delta: string) => void; onEvent?: (ev: unknown) => void }
): Promise<AgentRunResult & { events?: unknown[] }> {
    if (!agent) return { ok: false, error: 'agents_disabled' };
    const sdk = asSdk<{ run: (agent: Agent, input: string, opts: Record<string, unknown>) => Promise<unknown> }>(await loadAgentsSdk());
    const { run } = sdk;
    try {
        const started = Date.now();
        const stream: unknown = await run(agent, opts.input, { context: opts.context, maxTurns: opts.maxTurns, stream: true });
        const sAny = stream as Record<string, unknown> & { toTextStream?: (opts: { compatibleWithNodeStreams: boolean }) => AsyncIterable<unknown> };
        const events: unknown[] = [];
        // Text accumulation
        const chunks: string[] = [];
        const textStream = sAny.toTextStream ? sAny.toTextStream({ compatibleWithNodeStreams: false }) : ([] as unknown as AsyncIterable<unknown>);
        // toTextStream returns an async iterable of string chunks (or Node Readable when compatible flag true)
        for await (const chunk of textStream as AsyncIterable<unknown>) {
            if (typeof chunk === 'string') {
                chunks.push(chunk);
                opts.onToken?.(chunk);
            }
        }
        for await (const ev of (sAny as unknown as AsyncIterable<unknown>)) {
            events.push(ev);
            opts.onEvent?.(ev);
        }
        await (sAny as { completed?: Promise<void> }).completed; // ensure flush
        return {
            ok: true,
            output: chunks.join(''),
            meta: { durationMs: Date.now() - started, model: ((agent as unknown) as Record<string, unknown> & { model?: string }).model },
            events
        } as AgentRunResult & { events: unknown[] };
    } catch (e) {
        const msg = errToString(e);
        return { ok: false, error: msg } as AgentRunResult;
    }
}

// Future extension hooks (tools, guardrails, streaming) intentionally omitted for minimal initial integration.

/** Helper to build a simple routed (triage) agent given subagents. */
export async function createTriageAgent(name: string, instructions: string, subAgents: Agent[]): Promise<Agent | null> {
    if (!agentsEnabled()) return null;
    const sdk = asSdk<{ Agent?: unknown }>(await loadAgentsSdk());
    const AgentAny = sdk?.Agent as unknown;
    if (AgentAny && (typeof AgentAny === 'function' || typeof AgentAny === 'object')) {
        if (typeof (AgentAny as Record<string, unknown>).create === 'function') {
            try { return (AgentAny as { create: (cfg: Record<string, unknown>) => Agent }).create({ name, instructions, handoffs: subAgents }); } catch { return null; }
        }
        try { return new (AgentAny as new (cfg: Record<string, unknown>) => Agent)({ name, instructions, handoffs: subAgents }); } catch { /* ignore */ }
    }
    return null;
}

export const __internal = { agentsEnabled };
