/**
 * Adapter: legacy SEO Audit output → unified `AnalysisItem[]`.
 *
 * The current SEO audit flow (`src/ai/flows/seo-audit.ts`) is LLM-generated, so its findings default
 * to `provenance: 'simulated'`. When Phase 3 wires real crawl/GSC data, callers pass
 * `provenance: 'measured'` (or `'estimated'` for LLM interpretation of real numbers).
 */

import type { AuditUrlOutput } from "@/types";
import type { AnalysisItem, Provenance } from "@/lib/site-intelligence/types";

export function seoAuditToItems(
  output: Pick<AuditUrlOutput, "items">,
  provenance: Provenance = "simulated"
): AnalysisItem[] {
  const confidence = provenance === "measured" ? 0.9 : 0.6;
  return (output.items ?? []).map(
    (item, i): AnalysisItem => ({
      id: item.id || `seo-${i}`,
      category: "seo",
      title: item.title || item.name,
      description: item.description || item.details,
      provenance,
      impact: item.impact,
      status: item.status,
      score: item.score,
      confidence,
      evidence: item.details ? [item.details] : [],
      recommendation: item.recommendation,
    })
  );
}
