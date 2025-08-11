import { collection, getDocs, limit, orderBy, query, where, Firestore } from 'firebase/firestore';
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
        const d: any = snap.docs[0].data();
        const period: string = d.period;
        const { start, end } = monthBounds(period);
        return {
            period,
            periodStart: start,
            periodEnd: end,
            keywordsTracked: d.usage?.keywordSearches ?? 0,
            keywordsLimit: d.limits?.keywordSearches ?? 0,
            competitorAnalysis: d.usage?.competitorReports ?? 0,
            competitorLimit: d.limits?.competitorReports ?? 0,
            reportsGenerated: d.usage?.neuroSeoAnalyses ?? 0,
        };
    } catch (e: any) {
        logger.error('billing-usage.error', { userId, error: e?.message });
        return null;
    }
}
