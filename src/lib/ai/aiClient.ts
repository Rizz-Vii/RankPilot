/**
 * Unified AI client utilities with fallback support.
 * Chat completion: OpenAI (primary) -> Gemini (secondary) -> static failure message.
 * Embeddings: OpenAI only (to preserve a single consistent vector space for similarity search).
 */
import { recordLlmUsage } from "@/lib/analytics/llm";
import OpenAI from "openai";

// Gemini response typings
interface GeminiPart {
  text?: string;
}
interface GeminiContent {
  parts?: GeminiPart[];
}
interface GeminiCandidate {
  content?: GeminiContent;
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}
// Test hook + small infra helpers

declare const global:
  | { __OPENAI_SHIM__?: new (args: { apiKey: string }) => OpenAI }
  | undefined;

function createOpenAI(apiKey: string) {
  const Shim = global?.__OPENAI_SHIM__;
  return Shim ? new Shim({ apiKey }) : new OpenAI({ apiKey });
}

function sleepReject<T>(ms: number, err: Error): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(err), ms));
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}
function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

/** Perform a chat style completion with fallback. Returns raw text content. */
export async function chatComplete(opts: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const { messages, maxTokens = 800, temperature = 0.2 } = opts;
  const work = async (): Promise<string> => {
    const t0 = Date.now();
    const openaiKey = getOpenAIKey();
    if (openaiKey) {
      try {
        const client = createOpenAI(openaiKey);
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: maxTokens,
          temperature,
        });
        const txt = completion.choices?.[0]?.message?.content || "";
        recordLlmUsage("openai", !!txt, Date.now() - t0);
        if (txt) return txt;
      } catch {
        recordLlmUsage("openai", false, Date.now() - t0); /* fall through */
      }
    }
    const geminiKey = getGeminiKey();
    if (geminiKey) {
      try {
        // Collapse messages into a single user prompt (Gemini simple REST form)
        const systemPreamble = messages
          .filter((m) => m.role === "system")
          .map((m) => m.content)
          .join("\n");
        const conversation = messages
          .filter((m) => m.role !== "system")
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");
        const prompt =
          (systemPreamble ? systemPreamble + "\n" : "") + conversation;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
          }
        );
        if (!res.ok) throw new Error("Gemini HTTP " + res.status);
        const json: GeminiResponse = (await res.json()) as GeminiResponse;
        const first = json.candidates && json.candidates[0];
        const parts = first?.content?.parts || [];
        const text = parts.map((p) => p?.text || "").join("");
        recordLlmUsage("gemini", !!text, Date.now() - t0);
        if (text) return text;
      } catch {
        recordLlmUsage("gemini", false, Date.now() - t0);
      }
    }
    recordLlmUsage("fallback", false, Date.now() - t0);
    return "Unable to generate a response at this time.";
  };

  const budgetMs = Number.parseInt(
    process.env.AI_CLIENT_LATENCY_BUDGET_MS || "0"
  );
  if (budgetMs > 0) {
    try {
      return await Promise.race([
        work(),
        sleepReject<string>(budgetMs, new Error("latency_budget_exceeded")),
      ]);
    } catch {
      return "Unable to generate a response at this time.";
    }
  }
  return await work();
}

/** Creates an OpenAI embedding or returns null. */
export async function openAIEmbeddingOrNull(
  text: string
): Promise<number[] | null> {
  const apiKey = getOpenAIKey();
  if (!apiKey) return null;
  try {
    const client = createOpenAI(apiKey);
    const emb = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 3000),
    });
    const vector = emb.data?.[0]?.embedding;
    return Array.isArray(vector) ? (vector as number[]) : null;
  } catch {
    return null;
  }
}

/** Non-stream fallback chat (Gemini) used by streaming route when OpenAI stream unavailable. */
export async function fallbackOneShot(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 800
): Promise<string> {
  const geminiKey = getGeminiKey();
  if (!geminiKey) return "AI service temporarily unavailable.";
  try {
    const prompt = systemPrompt + "\nUSER: " + userMessage;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
        }),
      }
    );
    if (!res.ok) throw new Error("Gemini HTTP " + res.status);
    const json: GeminiResponse = (await res.json()) as GeminiResponse;
    const first = json.candidates && json.candidates[0];
    const parts = first?.content?.parts || [];
    const text = parts.map((p) => p?.text || "").join("");
    return text || "AI response unavailable.";
  } catch {
    return "AI fallback failed.";
  }
}
