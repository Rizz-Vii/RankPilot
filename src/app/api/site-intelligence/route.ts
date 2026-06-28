/**
 * Unified Site Intelligence API route.
 *
 * One endpoint behind the consolidating SEO Audit + NeuroSEO + Competitive Intelligence systems.
 * Accepts a SiteIntelligenceRequest, dispatches via the orchestrator, and returns a
 * SiteIntelligenceReport whose items each carry data provenance ('measured' | 'estimated' |
 * 'simulated'). The API-level provenance tag (the middleware's live/mixed/synthetic concept) is
 * derived from the report's overall data provenance so the two stay consistent.
 *
 * NOTE: legacy per-engine routes (/api/seo-audit/run, /api/neuroseo, /api/intelligence/competitive)
 * remain in place; this route is the unified surface they will migrate behind.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { extractErrorMessage } from "@/lib/errors/extract-error-message";
import { adminAuth } from "@/lib/firebase-admin";
import { enforceProvenance, withProvenance } from "@/lib/middleware/provenance";
import {
  runSiteIntelligence,
  SiteIntelligenceNotImplementedError,
} from "@/lib/site-intelligence/orchestrator";
import type {
  AnalysisType,
  Provenance,
  SiteIntelligenceRequest,
} from "@/lib/site-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TYPES: readonly AnalysisType[] = [
  "seo",
  "competitive",
  "comprehensive",
  "content-focused",
];

const TIER_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  agency: 2,
  enterprise: 3,
  admin: 4,
};

/** Minimum tier required per analysis type. */
const MIN_TIER: Record<AnalysisType, string> = {
  seo: "free",
  competitive: "agency",
  comprehensive: "agency",
  "content-focused": "starter",
};

function tierAtLeast(tier: string, min: string): boolean {
  return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[min] ?? 0);
}

/** Bridge data provenance → the middleware's API-level provenance tag. */
function apiProvenanceFor(
  dataProvenance: Provenance
): "live" | "mixed" | "synthetic" {
  if (dataProvenance === "measured") return "live";
  if (dataProvenance === "estimated") return "mixed";
  return "synthetic";
}

const PATH = "site-intelligence";

function fail(error: string, status: number, note: string) {
  return NextResponse.json(
    enforceProvenance(
      { success: false, error, provenance: "synthetic" },
      { path: PATH, note }
    ),
    { status }
  );
}

export const POST = withProvenance(
  async function POST(request: NextRequest) {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return fail("Missing or invalid authorization header", 401, "auth");
      }

      const token = authHeader.split("Bearer ")[1];
      let decoded: { uid: string; tier?: string };
      try {
        decoded = (await adminAuth.verifyIdToken(token)) as {
          uid: string;
          tier?: string;
        };
      } catch {
        return fail("Invalid authentication token", 401, "auth");
      }

      const userTier = decoded.tier || "free";

      const body = (await request.json()) as Partial<SiteIntelligenceRequest>;

      // Validate analysisType
      const analysisType = body.analysisType;
      if (!analysisType || !VALID_TYPES.includes(analysisType)) {
        return fail(
          `analysisType must be one of: ${VALID_TYPES.join(", ")}`,
          400,
          "validation"
        );
      }

      // Validate urls
      const urls = Array.isArray(body.urls)
        ? body.urls.filter((u): u is string => typeof u === "string" && !!u)
        : [];
      if (urls.length === 0) {
        return fail("At least one URL is required", 400, "validation");
      }

      // Tier gating per analysis type
      if (!tierAtLeast(userTier, MIN_TIER[analysisType])) {
        return fail(
          `'${analysisType}' analysis requires the ${MIN_TIER[analysisType]} tier or higher`,
          403,
          "tier"
        );
      }

      const siRequest: SiteIntelligenceRequest = {
        urls,
        analysisType,
        targetKeywords: Array.isArray(body.targetKeywords)
          ? body.targetKeywords.filter((k): k is string => typeof k === "string")
          : undefined,
        competitorUrls: Array.isArray(body.competitorUrls)
          ? body.competitorUrls.filter((u): u is string => typeof u === "string")
          : undefined,
        options: body.options,
        userId: decoded.uid,
        userPlan: userTier,
      };

      const report = await runSiteIntelligence(siRequest);

      return NextResponse.json(
        enforceProvenance(
          {
            success: true,
            report,
            provenance: apiProvenanceFor(report.metadata.provenance),
          },
          { path: PATH, note: analysisType }
        )
      );
    } catch (error) {
      if (error instanceof SiteIntelligenceNotImplementedError) {
        return fail(error.message, 501, "not_implemented");
      }
      console.error("[SiteIntelligenceAPI] Error:", error);
      return NextResponse.json(
        enforceProvenance(
          {
            success: false,
            error: "Internal server error",
            details: extractErrorMessage(error),
            provenance: "synthetic",
          },
          { path: PATH, note: "exception" }
        ),
        { status: 500 }
      );
    }
  },
  { path: PATH }
);
