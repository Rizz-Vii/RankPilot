/**
 * AIMemoryManager — multi-provider AI orchestration for Firebase Functions.
 *
 * Supports: OpenAI, Gemini (via Genkit), Anthropic
 * Features: capability routing, circuit breaker, latency budget, mock fallback,
 *           Zod schema validation, token persistence.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceConfig {
  model: string;
  apiKey: string;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

interface AIResponse {
  ok: boolean;
  content: string;
  usage: { in: number; out: number };
}

interface CBState {
  count: number;
  openedUntil: number;
}

interface ProcessOptions {
  capability?: "text" | "json" | "function_calling" | "vision";
  latencyBudgetMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
  schema?: z.ZodTypeAny;
  strictSchema?: boolean;
  expectJson?: boolean;
}

interface ProcessRequest {
  prompt: string;
  model?: string;
  options?: ProcessOptions;
}

interface ProcessResult {
  content: string;
  structured?: unknown;
  usage?: { in: number; out: number };
}

// ---------------------------------------------------------------------------
// Default capability map per provider
// ---------------------------------------------------------------------------
const DEFAULT_CAPABILITIES: Record<string, string[]> = {
  openai: ["text", "json", "function_calling", "vision"],
  gemini: ["text", "json", "vision"],
  anthropic: ["text", "json", "function_calling"],
};

// ---------------------------------------------------------------------------
// AIMemoryManagerImpl
// ---------------------------------------------------------------------------

class AIMemoryManagerImpl {
  services: Map<string, ServiceConfig> = new Map();
  cbFailures: Map<string, CBState> = new Map();
  capabilities: Map<string, Set<string>> = new Map();

  private genkitFactory:
    | (() => {
        generate: (
          prompt: string
        ) => Promise<{ text: () => string; usage?: Record<string, number> }>;
      })
    | null = null;

  constructor() {
    this.initializeServices();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  initializeServices(): void {
    this.services = new Map();
    this.capabilities = new Map();

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const preferred = process.env.AI_PROVIDER ?? "";

    const providers: Array<{
      name: string;
      key: string | undefined;
      model: string;
    }> = [
      { name: "openai", key: openaiKey, model: "gpt-4o" },
      { name: "gemini", key: geminiKey, model: "gemini-pro" },
      {
        name: "anthropic",
        key: anthropicKey,
        model: "claude-3-5-sonnet-20241022",
      },
    ];

    // Sort: preferred first
    providers.sort((a, b) =>
      a.name === preferred ? -1 : b.name === preferred ? 1 : 0
    );

    for (const p of providers) {
      if (!p.key) continue;
      this.services.set(p.name, {
        model: p.model,
        apiKey: p.key,
        timeout: 30000,
        temperature: 0.1,
        maxTokens: 1024,
      });
      this.capabilities.set(
        p.name,
        new Set(DEFAULT_CAPABILITIES[p.name] ?? ["text"])
      );
    }
  }

  async processRequest(req: ProcessRequest): Promise<ProcessResult> {
    const { prompt, model, options = {} } = req;
    const { latencyBudgetMs, schema, strictSchema, expectJson, capability } =
      options;

    // Respect global latency budget env
    const budget =
      latencyBudgetMs ??
      (process.env.AI_LATENCY_BUDGET_MS
        ? Number(process.env.AI_LATENCY_BUDGET_MS)
        : undefined);

    // Pick providers supporting the requested capability
    const orderedProviders = this._orderedProvidersForCapability(capability);

    // Check mock fallback shortcut
    if (process.env.AI_MOCK_FALLBACK === "true" && this.services.size === 0) {
      return { content: `[mock-ai:${model ?? "unknown"}] ${prompt}` };
    }

    // Build the AI call promise
    const aiCallPromise = this.makeAIRequest(
      prompt,
      model ?? "",
      options,
      orderedProviders
    );

    // Race against latency budget
    let rawContent: string;
    if (budget !== undefined) {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("latency_budget_exceeded")), budget)
      );
      try {
        rawContent = await Promise.race([aiCallPromise, timeoutPromise]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg === "latency_budget_exceeded" ||
          process.env.AI_MOCK_FALLBACK === "true"
        ) {
          return { content: `[mock-ai:${model ?? "unknown"}] ${prompt}` };
        }
        throw e;
      }
    } else {
      rawContent = await aiCallPromise;
    }

    // Schema validation
    if (schema && expectJson) {
      try {
        const parsed = JSON.parse(rawContent);
        const validated = schema.parse(parsed);
        return { content: rawContent, structured: validated };
      } catch {
        if (strictSchema) throw new Error("schema_validation_failed");
        return { content: rawContent };
      }
    }

    return { content: rawContent };
  }

  async makeAIRequest(
    prompt: string,
    model: string,
    options: ProcessOptions = {},
    providers?: string[]
  ): Promise<string> {
    const toTry = providers ?? Array.from(this.services.keys());

    if (toTry.length === 0) {
      if (process.env.AI_MOCK_FALLBACK === "true") {
        return `[mock-ai:${model}] ${prompt}`;
      }
      throw new Error("no_providers_configured");
    }

    let lastError: Error | null = null;
    const cbThreshold = Number(process.env.AI_CB_THRESHOLD ?? "5");

    for (const providerName of toTry) {
      // Circuit breaker check
      const cb = this.cbFailures.get(providerName);
      if (cb && cb.openedUntil > Date.now()) {
        throw new Error(`circuit_open_${providerName}`);
      }

      try {
        let res: AIResponse;
        if (providerName === "openai") {
          res = await this.invokeOpenAI(prompt, model, options);
        } else if (providerName === "gemini") {
          res = await this.invokeGemini(prompt, model, options);
        } else if (providerName === "anthropic") {
          res = await this.invokeAnthropic(prompt, model, options);
        } else {
          continue;
        }

        // Reset circuit breaker on success
        this.cbFailures.delete(providerName);

        // Persist token usage (best-effort, non-blocking)
        if (res.usage.in > 0 || res.usage.out > 0) {
          this.persistDailyUsage(
            providerName,
            res.usage.in,
            res.usage.out,
            model
          ).catch(() => {});
        }

        return res.content;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Update circuit breaker
        const existing = this.cbFailures.get(providerName) ?? {
          count: 0,
          openedUntil: 0,
        };
        existing.count += 1;
        if (existing.count >= cbThreshold) {
          existing.openedUntil = Date.now() + 60_000; // open for 60s
        }
        this.cbFailures.set(providerName, existing);
        // If circuit just opened, surface immediately
        if (existing.openedUntil > Date.now()) {
          throw new Error(`circuit_open_${providerName}`);
        }
      }
    }

    if (process.env.AI_MOCK_FALLBACK === "true") {
      return `[mock-ai:${model}] ${prompt}`;
    }
    throw lastError ?? new Error("all_providers_failed");
  }

  // -------------------------------------------------------------------------
  // Provider invocation stubs (real integrations injected or overridden in tests)
  // -------------------------------------------------------------------------

  async invokeOpenAI(
    prompt: string,
    model: string,
    _options?: ProcessOptions
  ): Promise<AIResponse> {
    const cfg = this.services.get("openai");
    if (!cfg) throw new Error("openai_not_configured");

    try {
      // Dynamic import to avoid hard dependency at module load
      const { OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
      const response = await client.chat.completions.create({
        model: model || cfg.model,
        messages: [{ role: "user", content: prompt }],
        temperature: _options?.temperature ?? cfg.temperature ?? 0.1,
        max_tokens: _options?.maxOutputTokens ?? cfg.maxTokens ?? 1024,
      });
      const content = response.choices[0]?.message?.content ?? "";
      const usage = {
        in: response.usage?.prompt_tokens ?? 0,
        out: response.usage?.completion_tokens ?? 0,
      };
      return { ok: true, content, usage };
    } catch (e) {
      throw e;
    }
  }

  async invokeGemini(
    prompt: string,
    model: string,
    _options?: ProcessOptions
  ): Promise<AIResponse> {
    const cfg = this.services.get("gemini");
    if (!cfg) throw new Error("gemini_not_configured");

    try {
      const factory =
        this.genkitFactory ??
        (() => {
          // Dynamic Genkit integration
          throw new Error("genkit_not_configured");
        });
      const ai = factory();
      const result = await ai.generate(prompt);
      const content = result.text();
      const rawUsage = (result as any).usage ?? {};
      const inTokens =
        rawUsage.promptTokens ??
        rawUsage.inputTokenCount ??
        Math.ceil(prompt.length / 4);
      const outTokens =
        rawUsage.completionTokens ??
        rawUsage.outputTokenCount ??
        Math.ceil(content.length / 4);
      return { ok: true, content, usage: { in: inTokens, out: outTokens } };
    } catch (e) {
      throw e;
    }
  }

  async invokeAnthropic(
    prompt: string,
    model: string,
    _options?: ProcessOptions
  ): Promise<AIResponse> {
    const cfg = this.services.get("anthropic");
    if (!cfg) throw new Error("anthropic_not_configured");

    try {
      const Anthropic =
        (await import("@anthropic-ai/sdk" as any)).default ??
        (await import("@anthropic-ai/sdk" as any));
      const client = new Anthropic({ apiKey: cfg.apiKey });
      const response = await client.messages.create({
        model: model || cfg.model,
        max_tokens: _options?.maxOutputTokens ?? cfg.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const content = (response.content[0] as any)?.text ?? "";
      const usage = {
        in: response.usage?.input_tokens ?? 0,
        out: response.usage?.output_tokens ?? 0,
      };
      return { ok: true, content, usage };
    } catch (e) {
      throw e;
    }
  }

  async persistDailyUsage(
    provider: string,
    inTokens: number,
    outTokens: number,
    model: string
  ): Promise<void> {
    try {
      const { getFirestore } = await import("firebase-admin/firestore");
      const { getApps } = await import("firebase-admin/app");
      if (!getApps().length) return;
      const db = getFirestore();
      const dateKey = new Date().toISOString().slice(0, 10);
      const ref = db.collection("aiDailyUsage").doc(`${dateKey}_${provider}`);
      await ref.set(
        {
          provider,
          model,
          date: dateKey,
          inputTokens: inTokens,
          outputTokens: outTokens,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch {
      // Non-blocking — ignore failures (e.g., no Firebase credentials in test)
    }
  }

  // -------------------------------------------------------------------------
  // Test helpers
  // -------------------------------------------------------------------------

  __setGenkitFactoryForTest(
    factory: () => {
      generate: (
        prompt: string
      ) => Promise<{ text: () => string; usage?: Record<string, number> }>;
    }
  ): void {
    this.genkitFactory = factory;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _orderedProvidersForCapability(capability?: string): string[] {
    const all = Array.from(this.services.keys());
    if (!capability) return all;
    // Providers that support the required capability come first; others are excluded
    return all.filter((p) => this.capabilities.get(p)?.has(capability));
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const aiMemoryManager = new AIMemoryManagerImpl();

export async function getAI(
  prompt: string,
  model?: string,
  options?: ProcessOptions
): Promise<string> {
  const result = await aiMemoryManager.processRequest({
    prompt,
    model,
    options,
  });
  return result.content;
}

/**
 * Convenience wrapper for a single AI inference call.
 * Delegates to {@link getAI}; used as the entry point exercised by the
 * AI adapter observability test suite.
 */
export async function runAiInference(
  prompt: string,
  options?: ProcessOptions
): Promise<string> {
  return getAI(prompt, undefined, options);
}
