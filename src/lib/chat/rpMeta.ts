export interface RpMeta {
    intent?: 'performance' | 'keyword_strategy' | 'structured_data' | 'technical_seo' | 'competitor' | 'content_optimization' | 'general';
    actions?: string[];
    priority?: number;
}

export function extractRpMeta(text: string): { cleaned: string; meta?: RpMeta } {
    if (typeof text !== 'string' || !text) return { cleaned: text };
    const match = text.match(/<rp_meta>([\s\S]*?)<\/rp_meta>/);
    if (!match) return { cleaned: text };
    const cleaned = text.replace(match[0], '').trim();
    try {
        const json = JSON.parse(match[1].trim());
        const meta: RpMeta = {
            intent: json.intent,
            actions: Array.isArray(json.actions) ? json.actions.slice(0, 5) : undefined,
            priority: typeof json.priority === 'number' ? json.priority : undefined
        };
        return { cleaned, meta };
    } catch {
        return { cleaned };
    }
}
