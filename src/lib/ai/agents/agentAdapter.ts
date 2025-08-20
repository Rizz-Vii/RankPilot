/* eslint-disable @typescript-eslint/no-explicit-any */
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
        return (e as any).message ?? String(e);
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
    const sdk = await loadAgentsSdk();
    const { Agent: AgentCtor, tool } = asSdk<{ Agent: any; tool?: any }>(sdk);
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
            return { outputInfo: (res as any).info, tripwireTriggered: !!(res as any).tripwire };
        }
    }));
    const outputGuardrails = (def.outputGuardrails || []).map(g => ({
        name: g.name,
        execute: async ({ agentOutput, context }: { agentOutput: unknown; context?: unknown }) => {
            const res = await g.execute({ agentOutput, context });
            return { outputInfo: (res as any).info, tripwireTriggered: !!(res as any).tripwire };
        }
    }));
    const baseConfig: unknown = {
        name: def.name,
        instructions: def.instructions as any,
        model: def.model,
        tools,
        inputGuardrails: inputGuardrails.length ? inputGuardrails : undefined,
        outputGuardrails: outputGuardrails.length ? outputGuardrails : undefined
    };
    if (def.handoffs && def.handoffs.length) {
        return (AgentCtor as any).create({ ...(baseConfig as any), handoffs: def.handoffs });
    }
    return new (AgentCtor as any)(baseConfig);
}

/** Run an agent for a single input returning the final output. */
export async function runAgentOnce<TContext extends Record<string, unknown> = Record<string, unknown>>(
    agent: Agent | null,
    opts: AgentRunOptions<TContext>
): Promise<AgentRunResult> {
    if (!agent) {
        return { ok: false, error: 'agents_disabled' };
    }
    const sdk = asSdk<{ run: any }>(await loadAgentsSdk());
    const { run } = sdk;
    try {
        const started = Date.now();
        const result: unknown = await run(agent, opts.input, { context: opts.context, maxTurns: opts.maxTurns });
        const resAny = result as any;
        return {
            ok: true,
            output: resAny.finalOutput,
            meta: {
                turns: resAny.turns,
                runId: resAny.runId,
                toolCalls: resAny.toolCalls as unknown[],
                durationMs: Date.now() - started,
                model: (agent as any).model,
                inputTokens: resAny.inputTokens ?? resAny.promptTokens ?? resAny.usage?.prompt_tokens,
                outputTokens: resAny.outputTokens ?? resAny.completionTokens ?? resAny.usage?.completion_tokens,
                totalTokens: resAny.totalTokens ?? resAny.usage?.total_tokens
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
    const sdk = asSdk<{ run: any }>(await loadAgentsSdk());
    const { run } = sdk;
    try {
        const started = Date.now();
        const stream: unknown = await run(agent, opts.input, { context: opts.context, maxTurns: opts.maxTurns, stream: true });
        const sAny = stream as any;
        const events: unknown[] = [];
        // Text accumulation
        const chunks: string[] = [];
        const textStream = sAny.toTextStream({ compatibleWithNodeStreams: false });
        // toTextStream returns an async iterable of string chunks (or Node Readable when compatible flag true)
        for await (const chunk of textStream as any) {
            if (typeof chunk === 'string') {
                chunks.push(chunk);
                opts.onToken?.(chunk);
            }
        }
        for await (const ev of sAny as any) {
            events.push(ev);
            opts.onEvent?.(ev);
        }
        await sAny.completed; // ensure flush
        return {
            ok: true,
            output: chunks.join(''),
            meta: { durationMs: Date.now() - started, model: (agent as any).model },
            events
        } as any;
    } catch (e) {
        const msg = errToString(e);
        return { ok: false, error: msg } as any;
    }
}

// Future extension hooks (tools, guardrails, streaming) intentionally omitted for minimal initial integration.

/** Helper to build a simple routed (triage) agent given subagents. */
export async function createTriageAgent(name: string, instructions: string, subAgents: Agent[]): Promise<Agent | null> {
    if (!agentsEnabled()) return null;
    const { Agent } = await loadAgentsSdk();
    return Agent.create({ name, instructions, handoffs: subAgents });
}

export const __internal = { agentsEnabled };
