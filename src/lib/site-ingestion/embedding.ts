import OpenAI from 'openai';
import { adminDb } from '../firebase-admin';
import type { SiteContentChunk } from './siteContentTypes';

export async function embedAndStoreChunk(uid: string, chunk: SiteContentChunk, collectionId: string) {
    const cleanedMeta = { ...chunk.meta } as any;
    Object.keys(cleanedMeta).forEach(k => { if (cleanedMeta[k] === undefined) delete cleanedMeta[k]; });
    if (process.env.RANKPILOT_ENABLE_EMBEDDINGS !== '1') {
        await adminDb.collection('siteContent').doc(uid).collection(collectionId).doc(cleanedMeta.hash).set({
            meta: cleanedMeta,
            content: chunk.content,
            updatedAt: new Date()
        }, { merge: true });
        return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return;
    const client = new OpenAI({ apiKey });
    const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: chunk.content.slice(0, 3000) });
    const vector = emb.data?.[0]?.embedding;
    await adminDb.collection('siteContent').doc(uid).collection(collectionId).doc(cleanedMeta.hash).set({
        meta: cleanedMeta,
        content: chunk.content,
        embedding: vector,
        embeddingModel: 'text-embedding-3-small',
        updatedAt: new Date()
    }, { merge: true });
}
