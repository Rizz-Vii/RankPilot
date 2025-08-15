import { z } from 'zod';
// Firecrawl page schema (T11)
export const firecrawlPageSchema = z.object({
    url: z.string().min(1),
    content: z.string().optional(),
    status: z.number().int().min(100).max(599).optional(),
    title: z.string().optional(),
    links: z.array(z.string().min(1)).max(200).optional(),
    canonicalUrl: z.string().url().optional(),
    metaDescription: z.string().max(500).optional(),
}).strict().transform(p => ({
    ...p,
    links: p.links ? Array.from(new Set(p.links)).slice(0, 50) : p.links,
}));

export const firecrawlCrawlResponseSchema = z.object({
    pages: z.array(firecrawlPageSchema).min(1).max(500),
});

export type FirecrawlValidatedPage = z.infer<typeof firecrawlPageSchema>;
export type FirecrawlValidatedResponse = z.infer<typeof firecrawlCrawlResponseSchema>;
