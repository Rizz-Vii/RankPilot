/**
 * Site Intelligence orchestrator — the single dispatch point behind the unified
 * `/api/site-intelligence` route. Routes a `SiteIntelligenceRequest` to the appropriate engine,
 * maps that engine's output into the unified `AnalysisItem[]` shape with honest provenance, and
 * assembles a `SiteIntelligenceReport`.
 *
 * Provenance policy here:
 *   - SEO audit fetches the real page (cheerio) then has Gemini score it → 'estimated'
 *     (AI interpretation of real content, not pure invention).
 *   - Competitor analysis is fully LLM-generated (no real SERP data) → 'simulated'.
 *   - NeuroSEO-backed engines ('comprehensive' / 'content-focused') are not yet migrated into the
 *     unified orchestrator and throw SiteIntelligenceNotImplementedError (handled as 501 upstream).
 *
 * Local structural interfaces describe the flow outputs so this module stays decoupled from the
 * `"use server"` flow modules (we import only their async functions).
 */

import { analyzeCompetitors } from "@/ai/flows/competitor-analysis";
import { auditUrl } from "@/ai/flows/seo-audit";

import { buildReport } from "./adapters";
import type {
  AnalysisImpact,
  AnalysisItem,
  SiteIntelligenceReport,
  SiteIntelligenceRequest,
} from "./types";

export class SiteIntelligenceNotImplementedError extends Error {
  constructor(public readonly analysisType: string) {
    super(`Site Intelligence engine for '${analysisType}' is not yet unified`);
    this.name = "SiteIntelligenceNotImplementedError";
  }
}

// --- SEO audit flow output → AnalysisItem[] ---

interface SeoFlowItem {
  id: string;
  name: string;
  score: number;
  details: string;
  status: "good" | "warning" | "error";
}
interface SeoFlowOutput {
  overallScore: number;
  summary: string;
  items: SeoFlowItem[];
}

function seoStatusToImpact(status: SeoFlowItem["status"]): AnalysisImpact {
  if (status === "error") return "high";
  if (status === "warning") return "medium";
  return "low";
}
function seoStatusToStatus(
  status: SeoFlowItem["status"]
): AnalysisItem["status"] {
  if (status === "error") return "fail";
  if (status === "warning") return "warning";
  return "pass";
}

function seoFlowToItems(output: SeoFlowOutput): AnalysisItem[] {
  return (output.items ?? []).map(
    (item): AnalysisItem => ({
      id: item.id,
      category: "seo",
      title: item.name,
      description: item.details,
      provenance: "estimated",
      impact: seoStatusToImpact(item.status),
      status: seoStatusToStatus(item.status),
      score: item.score,
      confidence: 0.6,
      evidence: item.details ? [item.details] : [],
      recommendation: item.details,
    })
  );
}

// --- Competitor analysis flow output → AnalysisItem[] ---

interface CompetitorFlowOutput {
  rankings: Array<Record<string, unknown>>;
  contentGaps: string[];
}

function competitorFlowToItems(output: CompetitorFlowOutput): AnalysisItem[] {
  return (output.contentGaps ?? []).map(
    (gap, i): AnalysisItem => ({
      id: `content-gap-${i}`,
      category: "content",
      title: "Content gap",
      description: gap,
      provenance: "simulated",
      impact: "medium",
      status: "warning",
      confidence: 0.5,
      evidence: [],
      recommendation: `Create content targeting: ${gap}`,
    })
  );
}

export async function runSiteIntelligence(
  request: SiteIntelligenceRequest
): Promise<SiteIntelligenceReport> {
  const startedAt = Date.now();
  const primaryUrl = request.urls[0];
  if (!primaryUrl) {
    throw new Error("At least one URL is required");
  }

  switch (request.analysisType) {
    case "seo": {
      const output = (await auditUrl({ url: primaryUrl })) as SeoFlowOutput;
      const items = seoFlowToItems(output);
      return buildReport({
        id: `si_${Date.now()}`,
        request,
        items,
        summary: output.summary,
        overallScore: output.overallScore,
        source: "live",
        totalProcessingTimeMs: Date.now() - startedAt,
      });
    }

    case "competitive": {
      const output = (await analyzeCompetitors({
        yourUrl: primaryUrl,
        competitorUrls: request.competitorUrls ?? [],
        keywords: request.targetKeywords ?? [],
      })) as CompetitorFlowOutput;
      const items = competitorFlowToItems(output);
      return buildReport({
        id: `si_${Date.now()}`,
        request,
        items,
        summary: `${items.length} content gap(s) identified vs ${
          request.competitorUrls?.length ?? 0
        } competitor(s).`,
        // The competitor flow returns no overall score; derive a neutral placeholder.
        overallScore: items.length > 0 ? 50 : 0,
        source: "live",
        totalProcessingTimeMs: Date.now() - startedAt,
      });
    }

    case "comprehensive":
    case "content-focused":
    default:
      throw new SiteIntelligenceNotImplementedError(request.analysisType);
  }
}
