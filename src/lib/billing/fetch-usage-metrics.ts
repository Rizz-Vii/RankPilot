import type { Firestore} from 'firebase/firestore';
import { collection, getDocs, limit, orderBy, query, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { getLogger } from '@/lib/logging/app-logger';

export interface NormalizedUsageMetrics {
    period: string;
    periodStart: Date;
    periodEnd: Date;
    keywordsTracked: number;
    keywordsLimit: number | -1;
    competitorAnalysis: number;
    competitorLimit: number | -1;
    reportsGenerated: number;
}

function monthBounds(period: string): { start: Date; end: Date } {
    const [y, m] = period.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    return { start, end };
}

export async function fetchUsageMetrics(firestore: Firestore, userId: string): Promise<NormalizedUsageMetrics | null> {
    const logger = getLogger('billing-usage');
    try {
        const q = query(collection(firestore, 'usage'), where('userId', '==', userId), orderBy('period', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const raw = snap.docs[0].data() as Record<string, any>;
        const period = typeof raw.period === 'string' ? raw.period : '1970-01';
        const { start, end } = monthBounds(period);
        return {
            period,
            periodStart: start,
            periodEnd: end,
            keywordsTracked: Number(raw.usage?.keywordSearches) || 0,
            keywordsLimit: Number(raw.limits?.keywordSearches) || 0,
            competitorAnalysis: Number(raw.usage?.competitorReports) || 0,
            competitorLimit: Number(raw.limits?.competitorReports) || 0,
            reportsGenerated: Number(raw.usage?.neuroSeoAnalyses) || 0,
        };
    } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
        logger.error('billing-usage.error', { userId, error: msg });
        return null;
    }
}
