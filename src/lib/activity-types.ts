/**
 * Activity Type Constants - Standardized Schema
 * Prevents future schema conflicts by centralizing activity type definitions
 */

// Standardized activity types for consistent storage and retrieval
export const ACTIVITY_TYPES = {
  AUDIT: "audit",
  KEYWORD_RESEARCH: "keyword-research",
  SERP_ANALYSIS: "serp-analysis",
  COMPETITOR_ANALYSIS: "competitor-analysis",
  CONTENT_ANALYSIS: "content-analysis",
  CONTENT_BRIEF: "content-brief",
  LINK_ANALYSIS: "link-analysis",
} as const;

// Tool name mappings for consistent "tool" field
export const TOOL_NAMES = {
  SEO_AUDIT: "SEO Audit",
  KEYWORD_TOOL: "Keyword Tool",
  SERP_VIEW: "SERP View",
  COMPETITOR_ANALYSIS: "Competitor Analysis",
  CONTENT_ANALYZER: "Content Analyzer",
  CONTENT_BRIEF: "Content Brief",
  LINK_VIEW: "Link View",
} as const;

// Type-safe activity creation helper
export interface ActivityData {
  type: string;
  tool: string;
  timestamp: unknown; // Firestore serverTimestamp()
  details: Record<string, unknown>;
  resultsSummary: string;
}

// Standardized activity creation function
export function createStandardActivity(
  type: (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES],
  tool: (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES],
  details: Record<string, unknown>,
  resultsSummary: string
): ActivityData {
  return {
    type,
    tool,
    timestamp: null, // Will be replaced with serverTimestamp() when storing
    details,
    resultsSummary,
  };
}

// Legacy type mappings for migration reference
export const LEGACY_TYPE_MAPPINGS = {
  "SEO Audit": ACTIVITY_TYPES.AUDIT,
  "Keyword Search": ACTIVITY_TYPES.KEYWORD_RESEARCH,
  "SERP View": ACTIVITY_TYPES.SERP_ANALYSIS,
  "Competitor Analysis": ACTIVITY_TYPES.COMPETITOR_ANALYSIS,
  "Content Analysis": ACTIVITY_TYPES.CONTENT_ANALYSIS,
  "Content Brief Generation": ACTIVITY_TYPES.CONTENT_BRIEF,
  "Link Analysis": ACTIVITY_TYPES.LINK_ANALYSIS,
} as const;
