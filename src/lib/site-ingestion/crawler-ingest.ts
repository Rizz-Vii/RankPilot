import { NeuralCrawler } from '../neuroseo/neural-crawler';
import { makeChunks } from './chunker';
import { embedAndStoreChunk } from './embedding';
import type { CrawlIngestionConfig, IngestionResult, SiteContentChunk } from './siteContentTypes';
import { adminDb } from '../firebase-admin';

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
            const result = await crawler.crawl(url, { includeImages: false, analyzeAuthorship: false, extractSchema: false, timeout: 20000 });
            const chunks: SiteContentChunk[] = makeChunks({ url: result.url, title: result.title, text: result.content, chunkSize: config.chunkSize, overlap: config.overlap });
            for (const chunk of chunks) {
                const docRef = adminDb.collection('siteContent').doc(uid).collection('default').doc(chunk.meta.hash);
                const snap = await docRef.get();
                if (snap.exists) {
                    const prevMeta = snap.data()?.meta || {};
                    await embedAndStoreChunk(uid, { ...chunk, meta: { ...chunk.meta, lastHash: prevMeta.hash, createdAt: prevMeta.createdAt || chunk.meta.createdAt, updatedAt: Date.now() } }, 'default');
                    updated++;
                } else {
                    await embedAndStoreChunk(uid, chunk, 'default');
                    added++;
                }
            }
            // Basic link discovery (same host only)
            const host = new URL(config.baseUrl).host;
            result.technicalData.links
                .filter((l: any) => l.href.startsWith('http') && new URL(l.href).host === host)
                .slice(0, 50)
                .forEach((l: any) => { if (!visited.has(l.href)) queue.push(l.href); });
        } catch (e: any) {
            errors++;
            if (process.env.RANKPILOT_INGEST_DEBUG === '1') {
                // eslint-disable-next-line no-console
                console.error('[INGEST][ERROR]', url, e?.message || e);
            }
        }
    }
    await crawler.close();
    return { added, updated, skipped, errors };
}
