// Finance Automation Snapshot fetchers
// Collections: financeRevenueSnapshots, financeInvoiceAgingSummaries
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/connection-manager';

export interface FinanceRevenueSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    period: string; // YYYY-MM
    mrr: number;
    onTimePct: number;
    outstanding: number;
    createdAt?: any;
}

export interface FinanceInvoiceAgingSummaryDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    buckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
    createdAt?: any;
}

function scopeField(teamId?: string) { return teamId ? 'teamId' : 'userId'; }

export async function fetchRecentFinanceRevenueSnapshots(userId: string, teamId?: string, max = 12): Promise<FinanceRevenueSnapshotDoc[]> {
    const q = query(
        collection(db, 'financeRevenueSnapshots'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as FinanceRevenueSnapshotDoc[];
}

export async function fetchLatestFinanceInvoiceAging(userId: string, teamId?: string): Promise<FinanceInvoiceAgingSummaryDoc | null> {
    const q = query(
        collection(db, 'financeInvoiceAgingSummaries'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as FinanceInvoiceAgingSummaryDoc;
}
