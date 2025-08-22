/** Site Content Ingestion Script
 * npx ts-node scripts/ingest-site-content.ts --uid <userId> --url https://example.com --max 15 --include \\.*\/blog\/.*
 */
import 'dotenv/config';
import { ingestSiteContentForOrg } from '../src/lib/site-ingestion/crawler-ingest';

function parseArgs() {
    const args = process.argv.slice(2);
    const out: Record<string, unknown> = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--uid') out.uid = args[++i];
        else if (a === '--url') out.url = args[++i];
        else if (a === '--max') out.max = Number(args[++i]);
        else if (a === '--include') { out.include = (out.include as RegExp[] | undefined) || []; (out.include as RegExp[]).push(new RegExp(args[++i])); }
        else if (a === '--exclude') { out.exclude = (out.exclude as RegExp[] | undefined) || []; (out.exclude as RegExp[]).push(new RegExp(args[++i])); }
        else if (a === '--chunk') out.chunk = Number(args[++i]);
        else if (a === '--overlap') out.overlap = Number(args[++i]);
    }
    return out;
}

async function run() {
    const { uid, url, max, include, exclude, chunk, overlap } = parseArgs() as { uid?: string; url?: string; max?: number; include?: RegExp[]; exclude?: RegExp[]; chunk?: number; overlap?: number };
    if (!uid || !url) {
        console.error('Usage: --uid <userId> --url <baseUrl> [--max N]');
        process.exit(1);
    }
    const res = await ingestSiteContentForOrg(uid, {
        baseUrl: url,
        maxPages: max,
        includePatterns: include,
        excludePatterns: exclude,
        chunkSize: chunk,
        overlap,
    });
    console.log('Ingestion summary:', res);
}

run().catch(e => { console.error(e); process.exit(1); });
