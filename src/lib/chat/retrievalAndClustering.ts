import { adminDb } from '@/lib/firebase-admin';
import OpenAI from 'openai';
import { openAIEmbeddingOrNull, chatComplete } from '@/lib/ai/aiClient';

export interface RetrievedContextItem { question: string; response: string; similarity: number; }

function cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length && i < b.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (!na || !nb) return 0; return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function buildQueryEmbedding(apiKey: string, text: string): Promise<number[] | null> {
    return openAIEmbeddingOrNull(text);
}

export async function retrieveSimilarMessages(params: { uid: string; sessionId: string; queryEmbedding: number[]; limit?: number; topK?: number; }): Promise<RetrievedContextItem[]> {
    const { uid, sessionId, queryEmbedding, limit = 80, topK = 3 } = params;
    try {
        const snap = await adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(sessionId).collection('messages').orderBy('timestamp', 'desc').limit(limit).get();
        const scored: RetrievedContextItem[] = [];
        snap.forEach(doc => { const d = doc.data() as any; const vec: number[] | undefined = d.embedding?.question; if (Array.isArray(vec) && d.response && d.question) { const sim = cosine(queryEmbedding, vec); if (sim > 0.1) scored.push({ question: d.question, response: d.response, similarity: sim }); } });
        scored.sort((a, b) => b.similarity - a.similarity); return scored.slice(0, topK);
    } catch { return []; }
}

function kMeans(vectors: number[][], k: number, iters = 12): { assignments: number[]; centroids: number[][] } {
    if (vectors.length === 0) return { assignments: [], centroids: [] };
    k = Math.max(1, Math.min(k, vectors.length));
    const dim = vectors[0].length; const centroids = vectors.slice(0, k).map(v => v.slice()); let assignments = new Array(vectors.length).fill(0);
    for (let iter = 0; iter < iters; iter++) {
        for (let i = 0; i < vectors.length; i++) { let best = -1, bestSim = -Infinity; for (let c = 0; c < centroids.length; c++) { const sim = cosine(vectors[i], centroids[c]); if (sim > bestSim) { bestSim = sim; best = c; } } assignments[i] = best; }
        const sums = Array.from({ length: k }, () => Array(dim).fill(0)); const counts = Array(k).fill(0);
        vectors.forEach((v, i) => { const a = assignments[i]; counts[a]++; for (let d = 0; d < dim; d++) { sums[a][d] += v[d]; } });
        for (let c = 0; c < k; c++) if (counts[c] > 0) for (let d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / counts[c];
    }
    return { assignments, centroids };
}

export async function maybeClusterKeywords(params: { uid: string; sessionId: string; apiKey: string; clusteringInterval?: number; }): Promise<boolean> {
    const { uid, sessionId, apiKey, clusteringInterval = 12 } = params;
    if (process.env.RANKPILOT_ENABLE_CLUSTERING !== '1') return false;
    try {
        const sessionRef = adminDb.collection('chatLogs').doc(uid).collection('sessions').doc(sessionId);
        const sessSnap = await sessionRef.get();
        const data = sessSnap.data() as any || {};
        const msgCount = data.messageCount || 0;
        if (msgCount < clusteringInterval || msgCount % clusteringInterval !== 0) return false;
        const msgsSnap = await sessionRef.collection('messages').orderBy('timestamp', 'desc').limit(120).get();
        const vectors: number[][] = []; const texts: string[] = [];
        msgsSnap.forEach(doc => { const d = doc.data() as any; if (Array.isArray(d.embedding?.question) && d.question) { vectors.push(d.embedding.question); texts.push(d.question); } });
        if (vectors.length < 6) return false;
        const k = Math.max(2, Math.min(6, Math.round(Math.sqrt(vectors.length / 2))));
        const { assignments } = kMeans(vectors, k);
        const clusters: { label: string; size: number; examples: string[] }[] = [];
        for (let c = 0; c < k; c++) {
            const indices = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0);
            if (!indices.length) continue;
            const sampleTexts = indices.slice(0, 5).map(i => texts[i]);
            let label = sampleTexts[0].split(/[,.;:!?]/)[0].slice(0, 60);
            try {
                const content = await chatComplete({
                    messages: [
                        { role: 'system', content: 'You label a cluster of user SEO intent queries with a concise 3-6 word topic.' },
                        { role: 'user', content: 'Queries:\n' + sampleTexts.join('\n') + '\nLabel:' }
                    ], maxTokens: 24, temperature: 0.3
                });
                label = (content || label).trim().replace(/^["']|["']$/g, '');
            } catch { }
            clusters.push({ label, size: indices.length, examples: sampleTexts });
        }
        await sessionRef.set({ clusters, lastClusteredAt: new Date() }, { merge: true });
        return true;
    } catch { return false; }
}
