// Thin adapters for NeuroSEO operations (prefer concrete services where available)
import { chatComplete } from "@/lib/ai/aiClient";
import { getLogger } from "@/lib/logging/app-logger";
import { fetchKeywordSuggestions, runSEOAudit, type SEOAuditRequest, type SEOAuditResponse } from "@/lib/services/ai-service";
import type { ContentBriefInput, ContentBriefOutput, GenerateInsightsOutput, LinkAnalysisOutput, SerpViewOutput } from "./types";

const logger = getLogger('neuroseo-functions').withTrace();

export async function generateContentBrief(input: unknown): Promise<ContentBriefOutput> {
    // Lightweight validation and shaping
    const i = ((): ContentBriefInput => {
        if (input && typeof input === 'object') {
            const obj = input as Record<string, unknown>;
            return {
                topic: String((obj as { topic?: unknown }).topic || '').slice(0, 200),
                targetAudience: String((obj as { targetAudience?: unknown }).targetAudience || 'general audience'),
                keywords: Array.isArray((obj as { keywords?: unknown }).keywords) ? ((obj as { keywords?: unknown[] }).keywords || []).slice(0, 10).map((k) => String(k)) : [],
            };
        }
        return { topic: String(input || ''), targetAudience: 'general audience', keywords: [] };
    })();

    if (!i.topic) {
        return { topic: '', targetKeywords: [], competitorInsights: [], llmGeneratedOutline: [], seoRecommendations: [] };
    }

    // AI-backed outline and recs
    const sys = "You generate actionable SEO content briefs as JSON-like bullet lines.";
    const user = `Create a concise content brief for topic: "${i.topic}" targeting ${i.targetAudience}.\n` +
        `Primary keywords: ${i.keywords.join(', ')}. Include: outline (H2/H3), key points, and 6 SEO recommendations.`;
    let outlineText = '';
    try {
        outlineText = await chatComplete({
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: user }
            ], maxTokens: 700, temperature: 0.2
        });
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in (e as Record<string, unknown>) && typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : String(e);
        logger.warn('contentBrief.ai_error', { msg });
    }

    // Naive parsing to structured outline
    const lines = outlineText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 40);
    const headings = lines.filter(l => /^([Hh]2|##)\b/.test(l)).map(l => l.replace(/^([Hh]2|##)\s*[:\-]?\s*/, '')).slice(0, 8);
    const llmGeneratedOutline = headings.map(h => ({ heading: h, subheadings: [], keyPoints: [] }));
    const recs = lines.filter(l => /^(-|\*)\s/.test(l) || /recommend/i.test(l)).slice(0, 8).map(l => l.replace(/^(-|\*)\s/, ''));

    return {
        topic: i.topic,
        targetKeywords: i.keywords,
        competitorInsights: [],
        llmGeneratedOutline,
        seoRecommendations: recs.length ? recs : [
            'Include primary keyword in title and first 100 words',
            'Add structured data where applicable (FAQ/HowTo)',
            'Improve internal links to related pillar pages',
            'Add original graphics or examples to increase E-E-A-T',
            'Ensure meta title (50–60 chars) and description (120–155 chars)',
            'Add a clear call-to-action aligned with search intent'
        ]
    };
}

export async function generateInsights(_input: unknown): Promise<GenerateInsightsOutput> {
    const text = ((): string => {
        if (_input && typeof _input === 'object' && 'content' in (_input as Record<string, unknown>)) return String(((
            _input as { content?: unknown }
        ).content) || '').slice(0, 6000);
        if (typeof _input === 'string') return _input;
        return '';
    })();
    if (!text) return { insights: [] };
    let resp = '';
    try {
        resp = await chatComplete({
            messages: [
                { role: 'system', content: 'Extract 5 concise, actionable SEO insights from the provided content. Return as bullet lines.' },
                { role: 'user', content: text }
            ], maxTokens: 400, temperature: 0.2
        });
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in (e as Record<string, unknown>) && typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : String(e);
        logger.warn('generateInsights.ai_error', { msg });
    }
    const items = resp.split(/\r?\n/).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 5);
    return { insights: items.map(s => ({ title: s.slice(0, 60), description: s, impact: 'medium', actionable: true, category: 'seo' })) };
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

export async function analyzeLinks(input: unknown): Promise<LinkAnalysisOutput> {
    const url = (input && typeof input === 'object' && 'url' in (input as Record<string, unknown>)) ? String((input as { url?: unknown }).url) : '';
    if (!url) return { backlinks: [], domainMetrics: { totalBacklinks: 0, uniqueDomains: 0, averageAuthority: 0 } };
    // Fetch with timeout to avoid server stalls
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 8000);
    let html = '';
    try {
        const res = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'RankPilot-LinkAnalyzer/1.0' } });
        if (res.ok) html = await res.text();
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in (e as Record<string, unknown>) && typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : String(e);
        logger.warn('analyzeLinks.fetch_error', { msg });
    } finally { clearTimeout(to); }
    const anchors = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>(.*?)<\/a>/gim)).map(m => ({ href: m[1], text: m[2]?.replace(/<[^>]+>/g, '').trim() || '' }));
    const origin = ((): string => { try { return new URL(url).origin; } catch { return ''; } })();
    const backlinks = anchors.map(a => {
        const isExternal = /^https?:\/\//i.test(a.href) && !a.href.startsWith(origin);
        const domain = ((): string => { try { return new URL(a.href, url).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })();
        // Pseudo authority (stable-ish): length/hash heuristic
        const authority = Math.max(10, Math.min(95, (domain.length * 7) % 100));
        return { url: a.href.startsWith('http') ? a.href : new URL(a.href, url).toString(), domain, authority, anchorText: a.text, type: isExternal ? 'external' : 'internal', status: 'active' as const };
    });
    const externals = backlinks.filter(b => b.type === 'external');
    const uniqueDomains = new Set(externals.map(b => b.domain)).size;
    const avgAuthority = externals.length ? Math.round(externals.reduce((s, b) => s + b.authority, 0) / externals.length) : 0;
    return { backlinks: externals, domainMetrics: { totalBacklinks: externals.length, uniqueDomains, averageAuthority: avgAuthority } };
}

export async function getSerpData(_input: unknown): Promise<SerpViewOutput> {
    const keyword = ((): string => {
        if (_input && typeof _input === 'object' && 'keyword' in (_input as Record<string, unknown>)) {
            const k = (_input as { keyword?: unknown }).keyword;
            return typeof k === 'string' ? k : String(k ?? '');
        }
        if (typeof _input === 'string') return _input;
        return '';
    })();
    if (!keyword) return { keyword: '', results: [], totalResults: 0 };
    let text = '';
    try {
        text = await chatComplete({
            messages: [
                { role: 'system', content: 'Return top 10 likely SERP entries for the query as lines: position. title - url - snippet' },
                { role: 'user', content: keyword }
            ], maxTokens: 600, temperature: 0.2
        });
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in (e as Record<string, unknown>) && typeof (e as { message?: unknown }).message === 'string')
            ? (e as { message: string }).message
            : String(e);
        logger.warn('serp.ai_error', { msg });
    }
    const results = text.split(/\r?\n/).map((l) => {
        const m = l.match(/^\s*(\d{1,2})[\).]\s*(.*?)\s+-\s+(https?:[^\s]+)\s+-\s+(.*)$/i);
        return m ? { position: Number(m[1]), title: m[2].trim().slice(0, 120), url: m[3], snippet: m[4].trim().slice(0, 220), features: [] as string[] } : null;
    }).filter((x): x is NonNullable<typeof x> => Boolean(x)).slice(0, 10) as SerpViewOutput['results'];
    return { keyword, results, totalResults: results.length };
}

/**
 * Legacy compatibility: route auditUrl() to the real Cloud Function via ai-service.
 */
export async function auditUrl(input: { url: string; checkMobile?: boolean }): Promise<SEOAuditResponse> {
    const req: SEOAuditRequest = { url: input.url, checkMobile: input.checkMobile ?? true };
    return await runSEOAudit(req);
}
