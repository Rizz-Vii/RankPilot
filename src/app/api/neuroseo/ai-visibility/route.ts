import { extractErrorMessage } from "@/lib/errors/extract-error-message";
import { adminAuth } from "@/lib/firebase-admin";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import { generateAiVisibility } from "@/lib/neuroseo/ai-insights";
import {
  AIVisibilityEngine,
  type CitationAnalysis,
  type VisibilityRecommendation,
} from "@/lib/neuroseo/ai-visibility-engine";
import { NextResponse } from "next/server";

// Lightweight in-memory cache to reduce repeated analyses during a short window
const cache = new Map<string, { ts: number; data: unknown }>();
const TTL_MS = 1000 * 60 * 5; // 5 minutes

// Ensure this route runs on the Node.js runtime and is always dynamic (no static optimization)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withProvenance(
  async function POST(req: Request) {
    try {
      // Require a verified Firebase ID token; identity from the token, not the body.
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
        return NextResponse.json(
          enforceProvenance(
            { error: "Missing or invalid authorization header" },
            { path: "neuroseo/ai-visibility", note: "auth" }
          ),
          { status: 401 }
        );
      }
      let uid: string;
      try {
        const decoded = await adminAuth.verifyIdToken(
          authHeader.replace(/^Bearer\s+/i, "")
        );
        uid = decoded.uid;
      } catch {
        return NextResponse.json(
          enforceProvenance(
            { error: "Invalid authentication token" },
            { path: "neuroseo/ai-visibility", note: "auth" }
          ),
          { status: 401 }
        );
      }

      const body = (await req.json().catch(() => ({}))) ?? {};
      const { url, query, targetAudience, analysisType = "quick" } = body;

      if (!url || !query) {
        return NextResponse.json(
          { error: "Missing url or query" },
          { status: 400 }
        );
      }

      const cacheKey = `${url}|${query}|${analysisType}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < TTL_MS) {
        return NextResponse.json(cached.data);
      }

      // REAL AI-visibility assessment (gemini-2.5-flash reasoning over the live page). Falls back to
      // the heuristic engine (honestly labeled 'simulated') on any failure.
      try {
        const aiv = await generateAiVisibility({ url, query, targetAudience });
        if (aiv) {
          const aiPlatforms = aiv.citedDomains.map((d) => ({
            name: d.name,
            citations: Math.max(1, 7 - d.position),
            position: d.position,
            trend: "stable" as const,
          }));
          const aiVisibility = [
            {
              citation: {
                platform: "AI assistants (Gemini)",
                position: aiv.ourCited ? 1 : 0,
                snippet: aiv.ourCitationSnippet,
                confidence: aiv.citationRate / 100,
                url,
              },
              optimization: {
                recommendations: aiv.recommendations.slice(0, 5),
                priority: (aiv.score >= 60
                  ? "low"
                  : aiv.score >= 35
                    ? "medium"
                    : "high") as "low" | "medium" | "high",
                impact: Math.max(0, 100 - aiv.score),
              },
            },
          ];
          const aiPayload = enforceProvenance(
            {
              score: aiv.score,
              citationRate: aiv.citationRate,
              visibility: aiVisibility,
              recommendations: aiv.recommendations,
              platforms: aiPlatforms,
              dataIntegrity: "estimated",
              meta: {
                targetAudience: targetAudience || null,
                analysisType,
                userId: uid,
                generatedAt: new Date().toISOString(),
              },
            },
            { path: "neuroseo/ai-visibility", note: "ai" }
          );
          cache.set(cacheKey, { ts: Date.now(), data: aiPayload });
          return NextResponse.json(aiPayload);
        }
      } catch (e) {
        console.error(
          "[AI Visibility API] AI path failed; using heuristic fallback",
          extractErrorMessage(e)
        );
      }

      const engine = new AIVisibilityEngine();
      // Reuse engine API: treat single query as targetKeyword list of length 1
      const report = await engine.analyzeVisibility(url, [query], []);

      // Derive simplified shape expected by client page
      const score = Math.round(report.metrics.overallVisibilityScore);
      const citationRate = report.metrics.citationRate;

      // Some downstream UI expects enriched citation objects; extend base citation analysis with optional fields.
      interface EnrichedCitation extends CitationAnalysis {
        platform?: string;
        position?: number; // alias for citationPosition
        snippet?: string; // alias for citationContext
        confidence?: number; // alias for relevanceScore
        url?: string; // source url (fallback to request url)
        recommendations?: Array<{ description?: string } | string>;
      }
      const visibility = (report.citations as EnrichedCitation[])
        .slice(0, 25)
        .map((c) => {
          const recs = Array.isArray(c.recommendations)
            ? c.recommendations
                .map((r) => (typeof r === "string" ? r : r?.description || ""))
                .filter(Boolean)
            : [];
          return {
            citation: {
              platform: c.platform || "unknown",
              position: c.position ?? c.citationPosition ?? 0,
              snippet: c.snippet || c.citationContext || "",
              confidence:
                typeof c.confidence === "number"
                  ? c.confidence
                  : c.relevanceScore,
              url: c.url || url,
            },
            optimization: {
              recommendations: recs,
              priority: "medium" as const,
              impact: 50,
            },
          };
        });

      const recommendations = (
        (report.recommendations as VisibilityRecommendation[] | undefined) || []
      )
        .map((r) => r.description)
        .filter(Boolean)
        .slice(0, 15);

      const platforms = report.competitiveAnalysis.topCompetitors
        .slice(0, 8)
        .map((comp) => {
          let host = comp.url;
          try {
            host = new URL(comp.url).hostname.replace("www.", "");
          } catch {
            // Accept bare domains w/o scheme by prefixing
            try {
              host = new URL(`https://${comp.url}`).hostname.replace(
                "www.",
                ""
              );
            } catch {
              /* keep as-is */
            }
          }
          return {
            name: host,
            citations: Math.round(comp.citationRate * 10),
            position: Math.max(1, Math.round(100 - comp.visibilityScore)),
            trend: "stable" as const,
          };
        });

      const responsePayload = enforceProvenance(
        {
          score,
          citationRate,
          visibility,
          recommendations,
          platforms,
          dataIntegrity: "simulated",
          meta: {
            targetAudience: targetAudience || null,
            analysisType,
            userId: uid,
            generatedAt: new Date().toISOString(),
          },
        },
        { path: "neuroseo/ai-visibility" }
      );

      cache.set(cacheKey, { ts: Date.now(), data: responsePayload });
      return NextResponse.json(responsePayload);
    } catch (error: unknown) {
      const errMessage = extractErrorMessage(error);
      console.error("[AI Visibility API] Failure", errMessage);
      return NextResponse.json(
        enforceProvenance(
          { error: "Internal server error", details: errMessage },
          { path: "neuroseo/ai-visibility", note: "error" }
        ),
        { status: 500 }
      );
    }
  },
  { path: "neuroseo/ai-visibility" }
);
