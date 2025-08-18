// Thin adapters for NeuroSEO operations (prefer concrete services where available)
import { runSEOAudit, type SEOAuditRequest, type SEOAuditResponse, fetchKeywordSuggestions } from "@/lib/services/ai-service";

export async function generateContentBrief(_input: unknown) {
    // Keep minimal non-throwing default until full service is wired
    return { topic: '', targetKeywords: [], competitorInsights: [], llmGeneratedOutline: [], seoRecommendations: [] };
}

export async function generateInsights(_input: unknown) {
    return { insights: [] };
}

export async function getKeywordSuggestions(input: { seed: string; locale?: string; limit?: number; includeMetrics?: boolean }) {
    try {
        const res = await fetchKeywordSuggestions({
            query: input.seed,
            language: input.locale,
            count: input.limit,
            includeMetrics: input.includeMetrics,
        });
        return { keywords: res.suggestions || [] };
    } catch {
        return { keywords: [] };
    }
}

export async function analyzeLinks(_input: unknown) {
    return { backlinks: [], domainMetrics: { totalBacklinks: 0, uniqueDomains: 0, averageAuthority: 0 } };
}

export async function getSerpData(_input: unknown) {
    return { keyword: '', results: [], totalResults: 0 };
}

/**
 * Legacy compatibility: route auditUrl() to the real Cloud Function via ai-service.
 */
export async function auditUrl(input: { url: string; checkMobile?: boolean }): Promise<SEOAuditResponse> {
    const req: SEOAuditRequest = { url: input.url, checkMobile: input.checkMobile ?? true };
    return await runSEOAudit(req);
}
