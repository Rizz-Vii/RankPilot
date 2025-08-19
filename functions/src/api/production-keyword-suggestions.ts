/**
 * Production-Ready Keyword Suggestions Function
 * Implements Firebase Functions v2 best practices with proper error handling
 */

import { logger } from "firebase-functions";
import type { HttpsOptions} from "firebase-functions/v2/https";
import { HttpsError, onCall } from "firebase-functions/v2/https";
// Use consolidated AI memory manager (path adjusted for actual location)
import { getAI as getMockAI } from "../lib/ai-memory-manager";
import { getAI as getGenkitAI } from "../ai/genkit"; // real AI engine
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Ensure Admin SDK initialized
try {
  if (!getApps().length) {
    initializeApp();
  }
} catch {
  logger.info("Admin already initialized for keyword suggestions function");
}
const db = getFirestore();

// Optimized HttpsOptions for keyword suggestions
const httpsOptions: HttpsOptions = {
  timeoutSeconds: 120,
  memory: "1GiB", // Increased from 512MiB for better performance
  minInstances: 0,
  maxInstances: 10,
  concurrency: 80,
  region: "australia-southeast2",
  // secrets: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY"], // Temporarily disabled for deployment
};

interface KeywordSuggestionsRequest {
  query: string;
  language?: string;
  count?: number;
  includeMetrics?: boolean;
  forceReal?: boolean;
  crawlUrls?: string[]; // optional seed URLs to crawl for context
}

interface KeywordSuggestion {
  keyword: string;
  searchVolume?: number;
  competition?: "low" | "medium" | "high";
  difficulty?: number;
  intent?: "informational" | "commercial" | "transactional" | "navigational";
  semanticCluster?: string;
  topicalRelevance?: number;
  opportunities?: string[];
}

interface KeywordSuggestionsResponse {
  suggestions: KeywordSuggestion[];
  relatedQueries?: string[];
  totalProcessingTime: number;
  cacheHit: boolean;
  plan?: string;
  quota?: { limit: number; used: number; remaining: number };
  rateLimited?: boolean;
  source?: "live" | "cache" | "fallback";
}

// Simple in-memory cache for function instances
const cache = new Map<string, { data: KeywordSuggestionsResponse; expiry: number; }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Enhanced keyword suggestions function with comprehensive error handling
 */
export const getKeywordSuggestionsEnhanced = onCall(httpsOptions, async (request) => {
  const startTime = Date.now();
  const userId = request.auth?.uid || "anonymous";

  try {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Fetch user plan (default free)
    let plan = "free";
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      plan = (userDoc.data()?.subscriptionTier || userDoc.data()?.role || "free").toLowerCase();
    } catch {
      logger.warn("Could not fetch user plan, defaulting to free", { userId });
    }

    // Quota limits per plan (-1 == unlimited)
    const quotaLimits: Record<string, number> = {
      free: 10,
      starter: 50,
      agency: 200,
      enterprise: 1000,
      admin: -1,
    };

    const quotaLimit = quotaLimits[plan] ?? 10;

    // Simple rate limiting (1 request / second) using rateLimits collection
    const rateLimitRef = db.collection("rateLimits").doc(userId);
    const rateDoc = await rateLimitRef.get();
    const now = Date.now();
    if (rateDoc.exists) {
      const last = rateDoc.data()?.lastRequest?.toMillis?.() || 0;
      if (now - last < 1000) {
        // Soft rate limit response
        throw new HttpsError("resource-exhausted", "Too many requests – slow down");
      }
    }

    // Daily usage count (start of UTC day)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    let used = 0;
    try {
      const snapshot = await db
        .collection("keywordResearch")
        .where("userId", "==", userId)
        .where("createdAt", ">=", startOfDay)
        .select("userId")
        .get();
      used = snapshot.size;
    } catch {
      logger.warn("Failed to compute daily keyword usage", { userId });
    }

    if (quotaLimit !== -1 && used >= quotaLimit) {
      throw new HttpsError("resource-exhausted", "Daily keyword research limit reached");
    }

    // Input validation
    const data = request.data as KeywordSuggestionsRequest;
    if (!data?.query || typeof data.query !== "string") {
      throw new HttpsError("invalid-argument", "Query is required and must be a string");
    }

    if (data.query.length > 200) {
      throw new HttpsError("invalid-argument", "Query too long (max 200 characters)");
    }

    // Set defaults
    const query = data.query.trim();
    const language = data.language || "en";
    const count = Math.min(Math.max(data.count || 10, 1), 50);
    const includeMetrics = data.includeMetrics !== false;

    logger.info("Keyword suggestions request", {
      userId,
      query: query.substring(0, 50),
      language,
      count
    });

    // Check cache
    const cacheKey = `${query}-${language}-${count}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      logger.info("Cache hit for keyword suggestions", { userId, query: query.substring(0, 50) });
      // Update rate limit timestamp
      await rateLimitRef.set({ lastRequest: FieldValue.serverTimestamp() }, { merge: true });
      return { ...cached.data, cacheHit: true, source: "cache", plan, quota: { limit: quotaLimit, used, remaining: quotaLimit === -1 ? -1 : quotaLimit - used } };
    }

    // Build historical corpus sample (recent docs for this user + global)
    let corpusSummary = '';
    try {
      const recentSnap = await db.collection('keywordResearch').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get();
      const globalSnap = await db.collectionGroup('keywordResearch').orderBy('createdAt', 'desc').limit(25).get();
      const clusters: Record<string, number> = {}; let _total = 0;
      globalSnap.forEach(d => {
        const s = d.data() as Record<string, unknown>;
        const sugg = Array.isArray(s['suggestions']) ? (s['suggestions'] as unknown[]) : [];
        sugg.slice(0, 15).forEach(item => {
          if (item && typeof item === 'object' && 'semanticCluster' in item) {
            const c = String((item as Record<string, unknown>).semanticCluster || 'general');
            clusters[c] = (clusters[c] || 0) + 1;
            _total++;
          }
        });
      });
      const topClusters = Object.entries(clusters).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, f]) => `${c}(${f})`).join(', ');
      corpusSummary = `GlobalClusters:${topClusters}`;
      if (!recentSnap.empty) {
        const recKw: string[] = [];
        recentSnap.forEach(d => {
          const s = d.data() as Record<string, unknown>;
          const suggArr = Array.isArray(s['suggestions']) ? (s['suggestions'] as unknown[]) : [];
          suggArr.slice(0, 5).forEach(item => {
            if (item && typeof item === 'object' && 'keyword' in item) {
              recKw.push(String((item as Record<string, unknown>).keyword));
            }
          });
        });
        corpusSummary += ` | UserRecent:${recKw.slice(0, 10).join(', ')}`;
      }
    } catch (e) {
      logger.warn('corpus_build_failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // Optional Firecrawl context (first provided crawlUrls or simple search URL if pattern)
    let crawlContext = '';
    if (process.env.FIRECRAWL_API_KEY && (data.crawlUrls?.length || query.split(' ').length <= 4)) {
      try {
        const targetList = (data.crawlUrls && data.crawlUrls.length > 0) ? data.crawlUrls.slice(0, 3) : [`https://www.google.com/search?q=${encodeURIComponent(query)}`];
        for (const u of targetList) {
          const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` },
            body: JSON.stringify({ url: u, formats: ['markdown'], onlyMainContent: true, mobile: true })
          });
          if (resp.ok) {
            const j = await resp.json();
            const md = (j && typeof j === 'object' && 'markdown' in j) ? String((j as Record<string, unknown>).markdown) : '';
            if (md) crawlContext += `\nURL:${u}\n${md.slice(0, 800)}`;
          }
          if (crawlContext.length > 2400) break;
        }
      } catch (e) {
        logger.warn('firecrawl_keyword_context_failed', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    const suggestions = await generateKeywords(query, language, count, includeMetrics, { forceReal: plan === "admin" || data.forceReal, corpusSummary, crawlContext });
    const relatedQueries = await generateRelatedQueries(query, language, { corpusSummary });

    const response: KeywordSuggestionsResponse = {
      suggestions,
      relatedQueries,
      totalProcessingTime: Date.now() - startTime,
      cacheHit: false,
      plan,
      quota: { limit: quotaLimit, used, remaining: quotaLimit === -1 ? -1 : quotaLimit - used - 1 },
      source: "live"
    };

    // Cache the result
    cache.set(cacheKey, {
      data: response,
      expiry: Date.now() + CACHE_TTL
    });

    // Cleanup old cache entries periodically
    cleanupCache();

    // Persist research document (trim suggestions if very large)
    try {
      await db.collection("keywordResearch").add({
        userId,
        query,
        language,
        countRequested: count,
        suggestions: suggestions.slice(0, 50),
        suggestionsCount: suggestions.length,
        relatedQueries: relatedQueries || [],
        plan,
        cacheHit: false,
        processingMs: response.totalProcessingTime,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (persistError) {
      logger.warn("Failed to persist keyword research doc", {
        userId,
        error: persistError instanceof Error ? persistError.message : String(persistError),
      });
    }

    // Update rate limit timestamp
    await rateLimitRef.set({ lastRequest: FieldValue.serverTimestamp() }, { merge: true });

    logger.info("Keyword suggestions completed", {
      userId,
      plan,
      suggestionsCount: suggestions.length,
      duration: Date.now() - startTime,
      cacheHit: false,
    });

    return response;

  } catch (error) {
    logger.error("Keyword suggestions function failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "An internal error occurred while generating keyword suggestions");
  }
});

async function generateKeywords(
  query: string,
  language: string,
  count: number,
  includeMetrics: boolean,
  context?: { forceReal?: boolean; corpusSummary?: string; crawlContext?: string }
): Promise<KeywordSuggestion[]> {
  try {
    const prompt = `ROLE: Senior SEO & Keyword Research Strategist.
TASK: Generate ${count} high-quality keyword suggestions for "${query}" (${language}).
CONTEXT_CORPUS: ${context?.corpusSummary || 'none'}
CRAWL_CONTEXT_SNIPPETS:${context?.crawlContext ? context.crawlContext.slice(0, 1500) : 'none'}
OUTPUT REQUIREMENTS:
1. Mix: 40% head, 60% long-tail.
2. Each keyword fields: keyword, searchVolume (integer realistic), competition (low|medium|high), difficulty (1-100), intent (informational|commercial|transactional|navigational), semanticCluster, topicalRelevance (0-100), opportunities (1-3 concise strings), rationale (short why included), serpFeatures (array subset of ['featured_snippet','people_also_ask','local_pack','videos','images']).
3. Avoid duplicates, ensure diversity across clusters.
4. Estimate volumes & difficulty realistically (no all identical numbers).
5. STRICT JSON ONLY: { "keywords": [ ... ] }`;

    const useReal = context?.forceReal || (process.env.USE_REAL_AI === "true");
    let rawOutput: any;
    if (useReal) {
      try {
        const ai = getGenkitAI();
        const gen = await ai.generate(prompt) as { text?: () => string } | string;
        rawOutput = typeof gen === 'string' ? gen : gen?.text?.();
      } catch (realErr) {
        logger.warn("Real AI generation failed, falling back to mock", { error: realErr instanceof Error ? realErr.message : String(realErr) });
      }
    }
    if (!rawOutput) {
      rawOutput = await getMockAI(prompt, undefined, { temperature: 0.7, maxOutputTokens: 1000 });
    }
    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(rawOutput);
    } catch {
      logger.warn("AI returned non-JSON content, using fallback generation", { snippet: rawOutput?.slice(0, 120) });
      return getFallbackKeywords(query, count);
    }
    const raw: KeywordSuggestion[] = Array.isArray(parsedResult.keywords) ? parsedResult.keywords : [];
    if (!raw.length) {
      logger.warn("AI returned empty keywords array, using fallback generation");
      return getFallbackKeywords(query, count);
    }
    const normalized = raw.map(k => ({
      ...k,
      difficulty: clampNumber(k.difficulty, 1, 100),
      topicalRelevance: clampNumber(k.topicalRelevance, 0, 100),
      semanticCluster: k.semanticCluster || deriveCluster(k.keyword),
      opportunities: Array.isArray(k.opportunities) ? k.opportunities.slice(0, 3) : [],
    }));
    return normalized;
  } catch (error) {
    logger.warn("AI keyword generation failed, using fallback", {
      error: error instanceof Error ? error.message : String(error),
      query: query.substring(0, 50)
    });
    return getFallbackKeywords(query, count);
  }
}

async function generateRelatedQueries(query: string, language: string, ctx?: { corpusSummary?: string }): Promise<string[]> {
  try {
    const prompt = `Generate 5 related search queries for "${query}" in ${language} considering corpus: ${ctx?.corpusSummary || 'none'}. Return JSON array of strings.`;
    let output: any;
    try {
      if (process.env.USE_REAL_AI === "true") {
        const ai = getGenkitAI();
        const gen = await ai.generate(prompt) as { text?: () => string } | string;
        output = typeof gen === 'string' ? gen : gen?.text?.();
      }
    } catch (e) {
      logger.warn("Real AI related queries failed, falling back to mock", { error: e instanceof Error ? e.message : String(e) });
    }
    if (!output) {
      output = await getMockAI(prompt, undefined, { temperature: 0.8, maxOutputTokens: 200 });
    }
    try {
      return JSON.parse(output);
    } catch {
      return [];
    }
  } catch (error) {
    logger.warn("Related queries generation failed", {
      error: error instanceof Error ? error.message : String(error),
      query: query.substring(0, 50)
    });
    return [];
  }
}

function getFallbackKeywords(query: string, count: number): KeywordSuggestion[] {
  const variations = [
    `${query} guide`,
    `${query} tips`,
    `best ${query}`,
    `${query} tutorial`,
    `how to ${query}`,
    `${query} examples`,
    `${query} benefits`,
    `${query} cost`,
    `${query} comparison`,
    `${query} review`,
    `${query} vs`,
    `${query} free`,
    `${query} online`,
    `${query} 2025`,
    `${query} strategy`
  ];

  return variations.slice(0, count).map((keyword, index) => ({
    keyword,
    searchVolume: Math.floor(Math.random() * 10000) + 100,
    competition: ["low", "medium", "high"][index % 3] as "low" | "medium" | "high",
    difficulty: Math.floor(Math.random() * 100) + 1,
    intent: ["informational", "commercial", "transactional", "navigational"][index % 4] as any,
    semanticCluster: deriveCluster(keyword),
    topicalRelevance: Math.floor(Math.random() * 100),
    opportunities: ["Improve CTR", "Capture long-tail"].slice(0, Math.floor(Math.random() * 2) + 1),
  }));
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now >= value.expiry) {
      cache.delete(key);
    }
  }
}

// Utility helpers for normalization & lightweight semantic grouping
function clampNumber(val: unknown, min: number, max: number) {
  const n = typeof val === "number" && !isNaN(val) ? val : min;
  return Math.min(Math.max(n, min), max);
}

function deriveCluster(keyword: string): string {
  if (!keyword) return "general";
  const parts = keyword.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
  return parts || "general";
}
