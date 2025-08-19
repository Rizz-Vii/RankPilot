// Neural Crawler Aggregation Helper (T14 Data Minimization – initial slice)
// Produces a compact aggregate document derived from the full (legacy) neuralCrawlerResults doc.
// Env Flag: NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_DUAL_WRITE=1 enables dual-write from client (temporary until server function introduced).
// Schema (version 1) kept intentionally small (<2KB) – no large content fields.

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FullResultLike {
    userId: string;
    historyId?: string;
    url: string;
    wordCount: number;
    readingTime: number;
    images?: Array<unknown>;
    links?: Array<{ type: 'internal' | 'external' }>;
    seoAnalysis?: { titleLength?: number; metaDescriptionLength?: number };
    issues?: Array<unknown>;
    entities?: Array<unknown>;
    headings?: Record<string, string[]>;
    createdAt?: Date;
}

export async function dualWriteNeuralCrawlerAggregate(full: FullResultLike & { _skipAgg?: boolean }) {
    try {
        if (full._skipAgg) return; // optional escape hatch for tests
        if (process.env.NEXT_PUBLIC_DATA_MIN_NEURAL_CRAWLER_DUAL_WRITE !== '1') return;

        const internalLinks = full.links?.filter(l => l.type === 'internal').length || 0;
        const externalLinks = full.links?.filter(l => l.type === 'external').length || 0;
        const headingsCounts = full.headings ? Object.fromEntries(Object.entries(full.headings).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])) : {};

        const doc = {
            userId: full.userId,
            historyId: full.historyId || null,
            url: full.url,
            wordCount: full.wordCount,
            readingTime: full.readingTime,
            imagesCount: full.images?.length || 0,
            linksInternal: internalLinks,
            linksExternal: externalLinks,
            titleLength: full.seoAnalysis?.titleLength ?? null,
            metaDescriptionLength: full.seoAnalysis?.metaDescriptionLength ?? null,
            issuesCount: full.issues?.length || 0,
            entitiesCount: full.entities?.length || 0,
            headings: headingsCounts, // numeric counts only
            version: 1,
            createdAt: serverTimestamp(),
            // No derived ratios; no large arrays.
        };
        await addDoc(collection(db, 'neuralCrawlerResultsAgg'), doc);
    } catch (e) {
        // Silent degradation per policy; failing aggregate must not block primary write.
        if (process.env.NODE_ENV !== 'production') {
             
            console.warn('[dualWriteNeuralCrawlerAggregate] failed', e);
        }
    }
}
