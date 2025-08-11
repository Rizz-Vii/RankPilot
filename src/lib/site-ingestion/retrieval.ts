import { adminDb } from '../firebase-admin';

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
    let colBase = adminDb.collection('siteContent').doc(uid).collection(collectionId);
    let col: any;
    try {
        const adminAny: any = adminDb as any;
        const FieldPath = adminAny.constructor?.FieldPath || adminAny.firestore?.FieldPath;
        col = FieldPath ? colBase.orderBy(FieldPath.documentId()) : colBase;
    } catch {
        col = colBase;
    }
    const scored: Array<{ score: number; content: string; meta: any }> = [];
    let scanned = 0;
    let lastDocId = pageCursor;
    while (scanned < maxScan && scored.length < Math.max(topK * 4, topK + 8)) { // oversample factor
        let q = col.limit(pageSize);
        if (lastDocId) {
            const lastSnap = await adminDb.collection('siteContent').doc(uid).collection(collectionId).doc(lastDocId).get();
            if (lastSnap.exists) q = col.startAfter(lastSnap.id).limit(pageSize);
        }
        const snapshot = await q.get();
        if (snapshot.empty) break;
        snapshot.docs.forEach((doc: any) => {
            scanned++;
            if (scanned > maxScan) return;
            const data: any = doc.data();
            if (Array.isArray(data.embedding)) {
                const score = cosine(queryEmbedding, data.embedding as number[]);
                scored.push({ score, content: data.content, meta: { ...(data.meta || {}), id: doc.id } });
            }
            lastDocId = doc.id;
        });
        if (snapshot.size < pageSize) break; // end reached
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);
    return { chunks: top, nextCursor: lastDocId, scanned };
}
