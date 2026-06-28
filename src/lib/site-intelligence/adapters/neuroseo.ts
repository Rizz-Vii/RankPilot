/**
 * Adapter: NeuroSEO™ report → unified `AnalysisItem[]`.
 *
 * NeuroSEO self-reports `trustMeta.dataIntegrity` ('measured' | 'simulated'). We honor it: insights
 * inherit 'measured' only when NeuroSEO declares measured data, otherwise 'simulated'. Accepts a
 * minimal structural type so this adapter stays decoupled from the heavy NeuroSEO engine module.
 */

import type {
  AnalysisCategory,
  AnalysisImpact,
  AnalysisItem,
  Provenance,
} from "@/lib/site-intelligence/types";

interface NeuroSeoInsight {
  category: AnalysisCategory;
  title: string;
  description: string;
  impact: AnalysisImpact;
  confidence: number;
  evidence: string[];
  recommendation: string;
}

interface NeuroSeoReportLike {
  keyInsights: NeuroSeoInsight[];
  trustMeta?: { dataIntegrity?: "simulated" | "measured" };
}

function impactToStatus(impact: AnalysisImpact): AnalysisItem["status"] {
  switch (impact) {
    case "critical":
    case "high":
      return "fail";
    case "medium":
      return "warning";
    case "low":
      return "info";
  }
}

export function neuroSeoToItems(report: NeuroSeoReportLike): AnalysisItem[] {
  const provenance: Provenance =
    report.trustMeta?.dataIntegrity === "measured" ? "measured" : "simulated";

  return (report.keyInsights ?? []).map(
    (insight, i): AnalysisItem => ({
      id: `neuroseo-insight-${i}`,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      provenance,
      impact: insight.impact,
      status: impactToStatus(insight.impact),
      confidence: insight.confidence,
      evidence: insight.evidence ?? [],
      recommendation: insight.recommendation,
    })
  );
}
