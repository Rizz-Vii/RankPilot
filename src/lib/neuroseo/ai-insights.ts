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
import * as cheerio from "cheerio";
import fetch from "node-fetch";

/**
 * Fetch + extract readable text from a URL (same approach as the working SEO-audit flow). Used when
 * the suite's neural-crawler returns no content in the deployed environment, so the AI pass is
 * self-sufficient rather than depending on the crawler.
 */
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      // @ts-ignore node-fetch v2 supports timeout
      timeout: 15000,
    });
    if (!res.ok) return "";
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();
    return $("body").text().replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

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
  let content = (input.pageContent || "").trim();
  if (!content && input.url) {
    content = await fetchPageText(input.url);
  }
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

export interface AiCompetitiveInput {
  /** Our (the user's) site URL. */
  url: string;
  competitorUrls: string[];
  targetKeywords: string[];
  /** Our page content if already fetched; otherwise it is self-fetched. */
  pageContent?: string;
}

export interface AiCompetitivePositioning {
  overallRanking: number;
  totalCompetitors: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

function strArray(v: unknown, max = 5): string[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && !!x.trim())
        .slice(0, max)
    : [];
}

/**
 * Real competitive positioning: self-fetches OUR page + each competitor page and asks
 * gemini-2.5-flash to compare them. Replaces the suite's jittered/simulated positioning. Returns
 * `null` on any failure (no competitors reachable, AI error, bad JSON) so the suite falls back to its
 * heuristic positioning and keeps provenance honest.
 */
export async function generateAiCompetitive(
  input: AiCompetitiveInput
): Promise<AiCompetitivePositioning | null> {
  const competitorUrls = (input.competitorUrls || [])
    .filter((u) => typeof u === "string" && !!u)
    .slice(0, 4);
  if (!competitorUrls.length) return null;

  // Fetch OUR page (if not already provided) and all competitor pages concurrently.
  const provided = (input.pageContent || "").trim();
  const [ourContent, fetched] = await Promise.all([
    provided
      ? Promise.resolve(provided)
      : input.url
        ? fetchPageText(input.url)
        : Promise.resolve(""),
    Promise.all(
      competitorUrls.map(async (u) => ({ url: u, content: await fetchPageText(u) }))
    ),
  ]);
  if (!ourContent) return null;

  const competitors = fetched.filter((c) => c.content);
  if (!competitors.length) return null;

  const fieldCount = competitors.length + 1;
  const compBlocks = competitors
    .map(
      (c, i) => `COMPETITOR ${i + 1} (${c.url}):\n${c.content.slice(0, 5000)}`
    )
    .join("\n\n");

  const prompt = `You are a competitive SEO and content strategist. Compare OUR page against the competitor pages below and produce a competitive positioning assessment grounded in the ACTUAL content (real topics, depth, gaps) — not generic advice.

OUR SITE: ${input.url}
TARGET KEYWORDS: ${input.targetKeywords.join(", ") || "(none provided)"}
OUR CONTENT (truncated):
${ourContent.slice(0, 6000)}

${compBlocks}

Return STRICT JSON ONLY:
{ "overallRanking": <integer, OUR rank among ${fieldCount} sites where 1 = best>, "strengths": ["where OUR page beats competitors"], "weaknesses": ["where competitors beat OUR page"], "opportunities": ["concrete gaps OUR page can exploit"], "threats": ["competitor advantages that threaten us"], "recommendations": ["specific, actionable next steps"] }
Each array: 2-5 concrete items referencing the real content. No markdown fences.`;

  let raw: unknown;
  try {
    const gen = await ai.generate(prompt);
    raw = typeof gen === "string" ? gen : (gen as { text?: string })?.text;
  } catch {
    return null;
  }
  if (typeof raw !== "string") return null;

  let parsed: Record<string, unknown>;
  try {
    const f = raw.replace(/```json|```/gi, "").trim();
    const s = f.indexOf("{");
    const e = f.lastIndexOf("}");
    parsed = JSON.parse(
      s >= 0 && e > s ? f.slice(s, e + 1) : f
    ) as Record<string, unknown>;
  } catch {
    return null;
  }

  const strengths = strArray(parsed.strengths);
  const weaknesses = strArray(parsed.weaknesses);
  const recommendations = strArray(parsed.recommendations);
  if (!strengths.length && !weaknesses.length && !recommendations.length) {
    return null;
  }
  const rankRaw =
    typeof parsed.overallRanking === "number"
      ? parsed.overallRanking
      : fieldCount;
  const overallRanking = Math.max(1, Math.min(fieldCount, Math.round(rankRaw)));

  return {
    overallRanking,
    totalCompetitors: fieldCount,
    strengths,
    weaknesses,
    opportunities: strArray(parsed.opportunities),
    threats: strArray(parsed.threats),
    recommendations,
  };
}

export interface AiVisibilityInput {
  url: string;
  query: string;
  targetAudience?: string;
  pageContent?: string;
}

export interface AiVisibilityResult {
  /** 0-100: likelihood an AI assistant answering the query surfaces/cites OUR page. */
  score: number;
  /** 0-100. */
  citationRate: number;
  recommendations: string[];
  /** Domains an AI assistant would likely cite for this query (position 1 = most likely). */
  citedDomains: Array<{ name: string; position: number }>;
  ourCitationSnippet: string;
  ourCited: boolean;
}

/**
 * Real AI-search-visibility assessment: asks gemini-2.5-flash to reason about how an AI assistant
 * would answer the query and whether OUR page (real fetched content) would be cited. Replaces the
 * engine's Math.random() simulation. Returns `null` on failure so callers can fall back + label
 * honestly. Provenance is 'estimated' (AI judgment, not a guaranteed multi-LLM measurement).
 */
export async function generateAiVisibility(
  input: AiVisibilityInput
): Promise<AiVisibilityResult | null> {
  if (!input.query) return null;
  let content = (input.pageContent || "").trim();
  if (!content && input.url) content = await fetchPageText(input.url);
  if (!content) return null;

  let host = input.url;
  try {
    host = new URL(input.url).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }

  const prompt = `You assess "AI Search Visibility": how likely a modern AI assistant (an LLM that answers with web-grounded knowledge) is to surface or cite a SPECIFIC page when a user asks a query. Reason about authority, depth, specificity, and topical match — grounded in the ACTUAL page content below.

USER QUERY: ${input.query}
TARGET AUDIENCE: ${input.targetAudience || "(general)"}
OUR PAGE: ${input.url} (domain: ${host})
OUR PAGE CONTENT (truncated):
${content.slice(0, 10000)}

Return STRICT JSON ONLY:
{ "visibilityScore": <0-100 likelihood OUR page is surfaced/cited for this query>, "citationLikelihood": <0.0-1.0>, "ourCited": <true|false: would a well-grounded assistant plausibly cite OUR domain>, "ourCitationSnippet": "<short text from OUR page an assistant would quote, or '' if unlikely>", "citedDomains": [ { "name": "<domain an assistant would likely cite for this query>", "position": <1=most likely> } ], "recommendations": [ "specific change to OUR page to improve its AI-citation likelihood for this query" ] }
Rules: citedDomains = 3-6 realistic authoritative sources for THIS query; recommendations = 4-8 concrete items grounded in the real content; no markdown fences.`;

  let raw: unknown;
  try {
    const gen = await ai.generate(prompt);
    raw = typeof gen === "string" ? gen : (gen as { text?: string })?.text;
  } catch {
    return null;
  }
  if (typeof raw !== "string") return null;

  let parsed: Record<string, unknown>;
  try {
    const f = raw.replace(/```json|```/gi, "").trim();
    const s = f.indexOf("{");
    const e = f.lastIndexOf("}");
    parsed = JSON.parse(
      s >= 0 && e > s ? f.slice(s, e + 1) : f
    ) as Record<string, unknown>;
  } catch {
    return null;
  }

  const recommendations = strArray(parsed.recommendations, 8);
  if (!recommendations.length) return null;

  const scoreRaw =
    typeof parsed.visibilityScore === "number" ? parsed.visibilityScore : 0;
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));
  const likeRaw =
    typeof parsed.citationLikelihood === "number"
      ? parsed.citationLikelihood
      : score / 100;
  const citationRate = Math.max(0, Math.min(100, Math.round(likeRaw * 100)));

  const citedDomains = Array.isArray(parsed.citedDomains)
    ? (parsed.citedDomains as unknown[])
        .map((d, i) => {
          const o = (d || {}) as Record<string, unknown>;
          return {
            name: typeof o.name === "string" ? o.name : "",
            position: typeof o.position === "number" ? o.position : i + 1,
          };
        })
        .filter((d) => d.name)
        .slice(0, 6)
    : [];

  return {
    score,
    citationRate,
    recommendations,
    citedDomains,
    ourCitationSnippet:
      typeof parsed.ourCitationSnippet === "string"
        ? parsed.ourCitationSnippet
        : "",
    ourCited: parsed.ourCited === true,
  };
}
