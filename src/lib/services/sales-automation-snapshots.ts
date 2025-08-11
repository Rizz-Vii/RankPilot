// Sales Automation Snapshot lightweight fetchers
// Mirrors collections written by automation actions: salesMetricsSnapshots, salesForecastSnapshots
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/connection-manager';

export interface SalesMetricsSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    range?: '30d' | '90d' | 'ytd';
    pipeline: number;
    closedWon: number;
    totalDeals: number;
    createdAt?: any; // Firestore TS
}

export interface SalesForecastSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    period: string; // YYYY-MM-DD
    forecast: number;
    actual?: number | null;
    createdAt?: any;
}

function scopeField(teamId?: string) { return teamId ? 'teamId' : 'userId'; }

export async function fetchRecentSalesMetricsSnapshots(userId: string, teamId?: string, max = 12): Promise<SalesMetricsSnapshotDoc[]> {
    const q = query(
        collection(db, 'salesMetricsSnapshots'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SalesMetricsSnapshotDoc[];
}

export async function fetchRecentSalesForecastSnapshots(userId: string, teamId?: string, max = 8): Promise<SalesForecastSnapshotDoc[]> {
    const q = query(
        collection(db, 'salesForecastSnapshots'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SalesForecastSnapshotDoc[];
}
