/**
 * Site Intelligence — unified schema for the three analysis systems that RankPilot is
 * consolidating: SEO Audit, the NeuroSEO™ Suite, and Competitive Intelligence.
 *
 * THE PROVENANCE INVARIANT
 * ------------------------
 * Every `AnalysisItem` carries a REQUIRED, non-defaulted `provenance` field. The compiler — not
 * developer discipline — guarantees that no value reaches a user without declaring how it was
 * produced:
 *   - 'measured'   real data from a verified source (Google Search Console, GA4, a paid SEO API);
 *   - 'estimated'  an LLM-derived figure computed from real inputs (interpretation, not invention);
 *   - 'simulated'  an LLM-invented placeholder with no real data behind it.
 *
 * This is the honesty fix from the approved plan, baked into the type system *before* the real-data
 * work (Phase 3) starts. The UI must render provenance on every item. Until a legacy flow is wired
 * to real data, its adapter maps its output to `provenance: 'simulated'` — instantly honest.
 */

/** Which analysis pipeline produced (or should produce) a report. */
export type AnalysisType = "seo" | "competitive" | "comprehensive" | "content-focused";

/**
 * How a value or finding was produced. Required on every AnalysisItem; there is intentionally
 * no default, so a developer must make a conscious, reviewable choice for each item.
 */
export type Provenance = "measured" | "estimated" | "simulated";

export type AnalysisCategory =
  | "seo"
  | "content"
  | "technical"
  | "competitive"
  | "trust";

export type AnalysisImpact = "critical" | "high" | "medium" | "low";

export type AnalysisStatus = "pass" | "fail" | "warning" | "info";

/**
 * The unified finding. A superset of NeuroSEO's `KeyInsight` plus SEO Audit's item fields, with
 * provenance made mandatory. Every legacy shape maps into this via an adapter.
 */
export interface AnalysisItem {
  id: string;
  category: AnalysisCategory;
  title: string;
  description: string;
  /**
   * REQUIRED. No default. Declares whether this finding's data is real, LLM-estimated, or
   * LLM-simulated. Rendered in the UI on every item.
   */
  provenance: Provenance;
  impact: AnalysisImpact;
  status: AnalysisStatus;
  /** 0–100 when the finding is scored; omitted when a score is not meaningful. */
  score?: number;
  /** 0–1 confidence in the finding. */
  confidence: number;
  /** Supporting evidence strings (URLs, measured values, snippets). */
  evidence: string[];
  recommendation: string;
}

export interface SiteIntelligenceRequest {
  urls: string[];
  analysisType: AnalysisType;
  targetKeywords?: string[];
  competitorUrls?: string[];
  options?: {
    depth?: "quick" | "standard" | "comprehensive";
    includeImages?: boolean;
    checkMobile?: boolean;
  };
  userId: string;
  userPlan: string;
}

export interface QuotaSnapshot {
  limit: number;
  used: number;
  remaining: number;
}

export interface SiteIntelligenceMetadata {
  /**
   * The report-level provenance: the *worst* provenance across all items (see `worstProvenance`).
   * If any contributing item is simulated, the whole report is at best `simulated` — a report
   * cannot claim to be more trustworthy than its least-trustworthy input.
   */
  provenance: Provenance;
  /** Where the response came from operationally (independent of data provenance). */
  source: "live" | "cache" | "fallback";
  totalProcessingTimeMs: number;
  cacheHit: boolean;
  /** ISO-8601 timestamp. */
  generatedAt: string;
  /** Which engine produced the report. */
  engine: AnalysisType;
}

export interface SiteIntelligenceReport {
  id: string;
  request: SiteIntelligenceRequest;
  /** 0–100 unified score. */
  overallScore: number;
  items: AnalysisItem[];
  summary: string;
  metadata: SiteIntelligenceMetadata;
  quota?: QuotaSnapshot;
}

/**
 * Severity ordering for provenance. Higher = less trustworthy. Used to compute a report's
 * overall provenance as the worst of its parts, so honesty propagates upward automatically.
 */
const PROVENANCE_SEVERITY: Record<Provenance, number> = {
  measured: 0,
  estimated: 1,
  simulated: 2,
};

/**
 * Returns the worst (least trustworthy) provenance across a set of items. An empty set resolves to
 * 'measured' (there is nothing to overclaim); callers building a report should set
 * `metadata.provenance` from this so the aggregate label can never be more optimistic than its
 * inputs.
 */
export function worstProvenance(
  items: ReadonlyArray<{ provenance: Provenance }>
): Provenance {
  return items.reduce<Provenance>(
    (worst, item) =>
      PROVENANCE_SEVERITY[item.provenance] > PROVENANCE_SEVERITY[worst]
        ? item.provenance
        : worst,
    "measured"
  );
}

/** Human-readable, UI-facing label + tone for a provenance value. */
export function provenanceLabel(provenance: Provenance): {
  label: string;
  tone: "positive" | "caution" | "warning";
} {
  switch (provenance) {
    case "measured":
      return { label: "Measured", tone: "positive" };
    case "estimated":
      return { label: "Estimated", tone: "caution" };
    case "simulated":
      return { label: "Demo data", tone: "warning" };
  }
}
