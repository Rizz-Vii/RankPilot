import crypto from 'crypto';
import type { SiteContentChunk } from './siteContentTypes';

interface MakeChunksParams {
    url: string;
    title?: string;
    text: string;
    chunkSize?: number;
    overlap?: number;
}

export function makeChunks({ url, title, text, chunkSize = 1800, overlap = 200 }: MakeChunksParams): SiteContentChunk[] {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const chunks: SiteContentChunk[] = [];
    let i = 0; let index = 0;
    while (i < clean.length) {
        const end = Math.min(clean.length, i + chunkSize);
        const slice = clean.slice(i, end);
        const hash = crypto.createHash('sha1').update(url + '|' + slice).digest('hex').slice(0, 32);
        chunks.push({
            meta: {
                url,
                title,
                hash,
                section: undefined,
                tokens: Math.ceil(slice.split(/\s+/).length * 1.3),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                sourceType: 'crawl'
            },
            content: slice
        });
        i += chunkSize - overlap;
        index++;
    }
    return chunks;
}
