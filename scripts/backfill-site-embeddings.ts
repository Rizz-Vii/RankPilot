/** Backfill embeddings for existing site content chunks missing vectors.
 * Usage:
 *   RANKPILOT_ENABLE_EMBEDDINGS=1 OPENAI_API_KEY=sk-... npx ts-node scripts/backfill-site-embeddings.ts --uid <userId> [--collection default] [--limit 100] [--dry]
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { adminDb } from '../src/lib/firebase-admin';

interface Args { uid?: string; collection?: string; limit?: number; dry?: boolean; }
function parseArgs(): Args {
    const a = process.argv.slice(2); const out: Args = {};
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--uid') out.uid = a[++i];
        else if (a[i] === '--collection') out.collection = a[++i];
        else if (a[i] === '--limit') out.limit = Number(a[++i]);
        else if (a[i] === '--dry') out.dry = true;
    }
    return out;
}

async function backfill({ uid, collection = 'default', limit = 250, dry = false }: { uid: string; collection: string; limit: number; dry: boolean; }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');
    const client = new OpenAI({ apiKey });
    const collRef = adminDb.collection('siteContent').doc(uid).collection(collection);
    const snapshot = await collRef.limit(limit).get();
    let processed = 0, embedded = 0, skipped = 0, errors = 0;
    for (const doc of snapshot.docs) {
        processed++;
        const data: any = doc.data();
        if (Array.isArray(data.embedding) && data.embedding.length > 10) { skipped++; continue; }
        if (dry) { embedded++; continue; }
        try {
            const text: string = data.content?.slice(0, 3000) || '';
            if (!text) { skipped++; continue; }
            const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
            const vector = emb.data?.[0]?.embedding;
            if (Array.isArray(vector)) {
                await doc.ref.set({ embedding: vector, embeddingModel: 'text-embedding-3-small', embeddingUpdatedAt: new Date() }, { merge: true });
                embedded++;
            } else { skipped++; }
        } catch (e: any) {
            errors++;
            if ((e.message || '').includes('rate limit')) {
                await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
    return { processed, embedded, skipped, errors };
}

async function run() {
    const { uid, collection, limit, dry } = parseArgs();
    if (!uid) { console.error('Missing --uid'); process.exit(1); }
    if (process.env.RANKPILOT_ENABLE_EMBEDDINGS !== '1') {
        console.warn('RANKPILOT_ENABLE_EMBEDDINGS not set to 1; proceeding anyway (override)');
    }
    const res = await backfill({ uid, collection: collection || 'default', limit: limit || 250, dry: !!dry });
    console.log('Backfill summary:', res);
}

run().catch(e => { console.error(e); process.exit(1); });
