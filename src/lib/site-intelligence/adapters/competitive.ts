/**
 * Adapter: legacy Competitive Intelligence output → unified `AnalysisItem[]`.
 *
 * `CompetitorAnalysisOutput` is aggregate-shaped (opportunities, gaps, strengths, technical), so we
 * synthesize one `AnalysisItem` per finding. The current flow is LLM-generated → defaults to
 * `provenance: 'simulated'`; real competitive-API data (Phase 3, Agency+ tier) passes `'measured'`.
 */

import type { CompetitorAnalysisOutput } from "@/types";
import type { AnalysisItem, Provenance } from "@/lib/site-intelligence/types";

export function competitiveToItems(
  output: CompetitorAnalysisOutput,
  provenance: Provenance = "simulated"
): AnalysisItem[] {
  const confidence = provenance === "measured" ? 0.9 : 0.6;
  const items: AnalysisItem[] = [];

  output.opportunities?.forEach((text, i) =>
    items.push({
      id: `competitive-opportunity-${i}`,
      category: "competitive",
      title: "Opportunity",
      description: text,
      provenance,
      impact: "high",
      status: "info",
      confidence,
      evidence: [],
      recommendation: text,
    })
  );

  output.contentGaps?.forEach((text, i) =>
    items.push({
      id: `competitive-content-gap-${i}`,
      category: "content",
      title: "Content gap",
      description: text,
      provenance,
      impact: "medium",
      status: "warning",
      confidence,
      evidence: [],
      recommendation: `Create content addressing: ${text}`,
    })
  );

  output.competitiveStrengths?.forEach((text, i) =>
    items.push({
      id: `competitive-strength-${i}`,
      category: "competitive",
      title: "Competitive strength",
      description: text,
      provenance,
      impact: "low",
      status: "pass",
      confidence,
      evidence: [],
      recommendation: `Maintain advantage: ${text}`,
    })
  );

  const tech = output.technicalInsights;
  if (tech) {
    items.push({
      id: "competitive-technical-pagespeed",
      category: "technical",
      title: "Technical benchmark",
      description: `Competitor page speed ${tech.pageSpeed}, mobile ${tech.mobileScore}, Core Web Vitals ${tech.coreWebVitals ? "passing" : "failing"}.`,
      provenance,
      impact: "medium",
      status: tech.pageSpeed >= 70 && tech.coreWebVitals ? "pass" : "warning",
      score: tech.pageSpeed,
      confidence,
      evidence: [
        `pageSpeed=${tech.pageSpeed}`,
        `mobileScore=${tech.mobileScore}`,
        `coreWebVitals=${tech.coreWebVitals}`,
      ],
      recommendation:
        "Benchmark and improve Core Web Vitals against competitor baselines.",
    });
  }

  return items;
}
