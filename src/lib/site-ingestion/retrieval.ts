import { adminDb } from '../firebase-admin';

type FieldPathCtor = { documentId: () => unknown };
type DocSnap = { id: string; exists: boolean; data(): Record<string, unknown> };
type QueryResult = { empty: boolean; size: number; docs: DocSnap[] };
type QueryLike = {
    orderBy?: (fp: unknown) => QueryLike;
    limit: (n: number) => QueryLike;
    startAfter: (cursor: unknown) => QueryLike;
    get: () => Promise<QueryResult>;
};

interface SiteRetrievalParams {
    uid: string;
    queryEmbedding: number[];
    topK?: number;
    collectionId?: string; // future support for multiple collections
    pageSize?: number; // internal batch size for scanning (default 250)
    pageCursor?: string; // optional last doc id for continued paging
    maxScan?: number; // safety cap on total docs scanned (default 1000)
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

export async function retrieveSiteChunks({ uid, queryEmbedding, topK = 4, collectionId = 'default', pageSize = 250, pageCursor, maxScan = 1000 }: SiteRetrievalParams) {
    // Paging implementation: iteratively scan batches until maxScan or exhaustion.
    // For large collections a future vector index should replace full scan.
    // Firestore admin SDK: use FieldPath.documentId() via (adminDb as any).firestore?.FieldPath or import from firebase-admin
    // Fallback: no explicit order (natural) if FieldPath unavailable
    const colBase = adminDb.collection('siteContent').doc(uid).collection(collectionId) as unknown as QueryLike;
    let col: QueryLike;
    try {
        const adminLike = adminDb as unknown as { constructor?: { FieldPath?: FieldPathCtor }, firestore?: { FieldPath?: FieldPathCtor } };
        const FieldPath = adminLike.constructor?.FieldPath || adminLike.firestore?.FieldPath;
        col = FieldPath && colBase.orderBy ? colBase.orderBy(FieldPath.documentId()) : colBase;
    } catch {
        col = colBase;
    }
    const scored: Array<{ score: number; content: string; meta: Record<string, unknown> }> = [];
    let scanned = 0;
    let lastDocId = pageCursor;
    while (scanned < maxScan && scored.length < Math.max(topK * 4, topK + 8)) { // oversample factor
        let q = col.limit(pageSize);
        if (lastDocId) {
            const lastSnap = await (adminDb.collection('siteContent').doc(uid).collection(collectionId).doc(lastDocId).get() as unknown as Promise<DocSnap>);
            if (lastSnap.exists) q = col.startAfter(lastSnap.id).limit(pageSize);
        }
        const snapshot = await q.get();
        if (snapshot.empty) break;
        snapshot.docs.forEach((doc) => {
            scanned++;
            if (scanned > maxScan) return;
            const data = doc.data();
            const embedding = Array.isArray((data as Record<string, unknown>).embedding)
                ? (data as { embedding: number[] }).embedding
                : undefined;
            if (embedding) {
                const score = cosine(queryEmbedding, embedding);
                const content = (data as Record<string, unknown>).content as string | undefined;
                const meta = ((data as Record<string, unknown>).meta as Record<string, unknown> | undefined) || {};
                scored.push({ score, content: content || "", meta: { ...meta, id: doc.id } });
            }
            lastDocId = doc.id;
        });
        if (snapshot.size < pageSize) break; // end reached
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);
    return { chunks: top, nextCursor: lastDocId, scanned };
}
