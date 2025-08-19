import { adminDb } from '../firebase-admin';
import type { CrawlResult } from '../neuroseo/neural-crawler';
import { NeuralCrawler } from '../neuroseo/neural-crawler';
import { makeChunks } from './chunker';
import { embedAndStoreChunk } from './embedding';
import type { CrawlIngestionConfig, IngestionResult, SiteContentChunk } from './siteContentTypes';

export async function ingestSiteContentForOrg(uid: string, config: CrawlIngestionConfig): Promise<IngestionResult> {
    const crawler = new NeuralCrawler();
    const visited = new Set<string>();
    const queue: string[] = [config.baseUrl];
    const include = config.includePatterns || [];
    const exclude = config.excludePatterns || [];
    const maxPages = config.maxPages || 10;
    let added = 0, updated = 0, skipped = 0, errors = 0;
    while (queue.length && visited.size < maxPages) {
        const url = queue.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);
        if (exclude.some(r => r.test(url))) { skipped++; continue; }
        if (include.length && !include.some(r => r.test(url))) { skipped++; continue; }
        try {
            interface CrawlIngestOptions { includeImages: boolean; analyzeAuthorship: boolean; extractSchema: boolean; timeout: number }
            const crawlOpts: CrawlIngestOptions = {
                includeImages: false,
                analyzeAuthorship: false,
                extractSchema: false,
                timeout: 20000
            };
            const result: CrawlResult = await crawler.crawl(url, crawlOpts);
            const chunks: SiteContentChunk[] = makeChunks({ url: result.url, title: result.title, text: result.content, chunkSize: config.chunkSize, overlap: config.overlap });
            for (const chunk of chunks) {
                const docRef = adminDb.collection('siteContent').doc(uid).collection('default').doc(chunk.meta.hash);
                const snap = await docRef.get();
                if (snap.exists) {
                    const prevMetaRaw = (snap.data()?.meta as unknown) || {};
                    const createdAt = ((): number => {
                        if (prevMetaRaw && typeof prevMetaRaw === 'object' && 'createdAt' in (prevMetaRaw as { createdAt?: unknown })) {
                            const val = (prevMetaRaw as { createdAt?: unknown }).createdAt;
                            if (typeof val === 'number') return val;
                        }
                        return chunk.meta.createdAt;
                    })();
                    const prevMeta = (prevMetaRaw && typeof prevMetaRaw === 'object') ? prevMetaRaw as Record<string, unknown> : {};
                    await embedAndStoreChunk(uid, { ...chunk, meta: { ...chunk.meta, lastHash: prevMeta.hash as string | undefined, createdAt, updatedAt: Date.now() } }, 'default');
                    updated++;
                } else {
                    await embedAndStoreChunk(uid, chunk, 'default');
                    added++;
                }
            }
            // Basic link discovery (same host only)
            const host = new URL(config.baseUrl).host;
            const linksArr: unknown = (result as unknown as { technicalData?: { links?: unknown } }).technicalData?.links;
            const links = Array.isArray(linksArr) ? linksArr : [];
            const isLink = (v: unknown): v is { href: string } => !!v && typeof (v as { href?: unknown }).href === 'string';
            links
                .filter(isLink)
                .filter(l => l.href.startsWith('http') && new URL(l.href).host === host)
                .slice(0, 50)
                .forEach(l => { if (!visited.has(l.href)) queue.push(l.href); });
        } catch (e: unknown) {
            errors++;
            if (process.env.RANKPILOT_INGEST_DEBUG === '1') {

                const err = e as { message?: string };
                console.error('[INGEST][ERROR]', url, err.message || e);
            }
        }
    }
    await crawler.close();
    return { added, updated, skipped, errors };
}
