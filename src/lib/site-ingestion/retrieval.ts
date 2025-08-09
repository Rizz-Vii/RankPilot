import { adminDb } from '../firebase-admin';

interface SiteRetrievalParams {
    uid: string;
    queryEmbedding: number[];
    topK?: number;
    collectionId?: string; // future support for multiple collections
}

function cosine(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length && i < b.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export async function retrieveSiteChunks({ uid, queryEmbedding, topK = 4, collectionId = 'default' }: SiteRetrievalParams) {
    // TODO: add paging if collection grows large; for now sample first N docs
    const snapshot = await adminDb.collection('siteContent').doc(uid).collection(collectionId).limit(250).get();
    const scored: Array<{ score: number; content: string; meta: any }> = [];
    snapshot.docs.forEach(doc => {
        const data: any = doc.data();
        if (Array.isArray(data.embedding)) {
            const score = cosine(queryEmbedding, data.embedding as number[]);
            scored.push({ score, content: data.content, meta: data.meta });
        }
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}
