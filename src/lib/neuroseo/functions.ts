// Stub functions for NeuroSEO operations
export async function generateContentBrief(input: any) {
    return { topic: '', targetKeywords: [], competitorInsights: [], llmGeneratedOutline: [], seoRecommendations: [] };
}

export async function generateInsights(input: any) {
    return { insights: [] };
}

export async function getKeywordSuggestions(input: any) {
    return { keywords: [] };
}

export async function analyzeLinks(input: any) {
    return { backlinks: [], domainMetrics: { totalBacklinks: 0, uniqueDomains: 0, averageAuthority: 0 } };
}

export async function getSerpData(input: any) {
    return { keyword: '', results: [], totalResults: 0 };
}

/**
 * DEPRECATED: Use runSEOAudit (Cloud Function) via ai-service instead.
 * This stub is kept to avoid breaking legacy imports but will throw to surface incorrect usage.
 */
export async function auditUrl(_input: any) {
    throw new Error('auditUrl stub deprecated. Use runSEOAudit from ai-service.');
}
