/**
 * Real-AI insight generation for the NeuroSEO™ suite.
 *
 * The suite historically produced only heuristic, *simulated* keyInsights (dataIntegrity:
 * 'simulated'). This module generates genuine insights with gemini-2.5-flash over the page content
 * that was actually crawled, so the analysis reflects the real page. Returns `null` on ANY failure
 * (no content, AI error, bad JSON) so the suite can fall back to its deterministic heuristic
 * insights without breaking — provenance then stays honestly 'simulated'.
 */

import { ai } from "@/ai/genkit";

export type NeuroInsightCategory =
  | "seo"
  | "content"
  | "technical"
  | "competitive"
  | "trust";
export type NeuroInsightImpact = "critical" | "high" | "medium" | "low";

/** Structurally compatible with the suite's KeyInsight. */
export interface NeuroAiInsight {
  category: NeuroInsightCategory;
  title: string;
  description: string;
  impact: NeuroInsightImpact;
  confidence: number;
  evidence: string[];
  recommendation: string;
}

export interface AiInsightInput {
  url: string;
  pageContent: string;
  targetKeywords: string[];
}

const CATEGORIES: NeuroInsightCategory[] = [
  "seo",
  "content",
  "technical",
  "competitive",
  "trust",
];
const IMPACTS: NeuroInsightImpact[] = ["critical", "high", "medium", "low"];

export async function generateAiKeyInsights(
  input: AiInsightInput
): Promise<NeuroAiInsight[] | null> {
  const content = (input.pageContent || "").trim();
  if (!content) return null;

  const prompt = `You are a senior SEO and content strategist powering the "NeuroSEO" analysis engine. Analyze the page below and produce 5-7 SPECIFIC, high-value insights grounded in the ACTUAL content (its topics, structure, gaps) — not generic advice.

URL: ${input.url}
TARGET KEYWORDS: ${input.targetKeywords.join(", ") || "(none provided)"}
PAGE CONTENT (truncated):
<<<
${content.slice(0, 12000)}
>>>

Return STRICT JSON ONLY in this shape:
{ "insights": [ { "category": "seo|content|technical|competitive|trust", "title": "<=70 chars", "description": "specific finding about THIS page", "impact": "critical|high|medium|low", "confidence": 0.0-1.0, "evidence": ["concrete observation from the page", "..."], "recommendation": "actionable next step" } ] }
Rules: reference the real content; no duplicates; no markdown fences.`;

  let raw: unknown;
  try {
    const gen = await ai.generate(prompt);
    raw = typeof gen === "string" ? gen : (gen as { text?: string })?.text;
  } catch {
    return null;
  }
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    const f = raw.replace(/```json|```/gi, "").trim();
    const s = f.indexOf("{");
    const e = f.lastIndexOf("}");
    parsed = JSON.parse(s >= 0 && e > s ? f.slice(s, e + 1) : f);
  } catch {
    return null;
  }

  const arr =
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).insights)
      ? ((parsed as Record<string, unknown>).insights as unknown[])
      : [];
  if (!arr.length) return null;

  const insights: NeuroAiInsight[] = [];
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.slice(0, 80) : "";
    const description = typeof o.description === "string" ? o.description : "";
    if (!title || !description) continue;
    insights.push({
      category: CATEGORIES.includes(o.category as NeuroInsightCategory)
        ? (o.category as NeuroInsightCategory)
        : "seo",
      impact: IMPACTS.includes(o.impact as NeuroInsightImpact)
        ? (o.impact as NeuroInsightImpact)
        : "medium",
      title,
      description,
      confidence:
        typeof o.confidence === "number"
          ? Math.max(0, Math.min(1, o.confidence))
          : 0.7,
      evidence: Array.isArray(o.evidence)
        ? o.evidence.filter((x): x is string => typeof x === "string").slice(0, 5)
        : [],
      recommendation:
        typeof o.recommendation === "string" ? o.recommendation : "",
    });
  }
  return insights.length ? insights : null;
}
