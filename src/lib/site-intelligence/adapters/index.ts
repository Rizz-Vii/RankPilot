/**
 * Site Intelligence adapters — convert each legacy system's output into the unified
 * `AnalysisItem[]` shape, then assemble a `SiteIntelligenceReport` whose overall provenance is the
 * worst (least trustworthy) of its parts.
 */

import {
  type AnalysisItem,
  type SiteIntelligenceReport,
  type SiteIntelligenceRequest,
  worstProvenance,
} from "@/lib/site-intelligence/types";

export { seoAuditToItems } from "./seo";
export { competitiveToItems } from "./competitive";
export { neuroSeoToItems } from "./neuroseo";

export interface BuildReportArgs {
  id: string;
  request: SiteIntelligenceRequest;
  items: AnalysisItem[];
  summary: string;
  overallScore: number;
  source?: "live" | "cache" | "fallback";
  cacheHit?: boolean;
  totalProcessingTimeMs?: number;
}

/**
 * Assembles a unified report. The report-level `metadata.provenance` is computed from the items via
 * `worstProvenance`, so the aggregate label can never overclaim relative to its inputs.
 */
export function buildReport(args: BuildReportArgs): SiteIntelligenceReport {
  return {
    id: args.id,
    request: args.request,
    overallScore: args.overallScore,
    items: args.items,
    summary: args.summary,
    metadata: {
      provenance: worstProvenance(args.items),
      source: args.source ?? "live",
      totalProcessingTimeMs: args.totalProcessingTimeMs ?? 0,
      cacheHit: args.cacheHit ?? false,
      generatedAt: new Date().toISOString(),
      engine: args.request.analysisType,
    },
  };
}
