// Sales Automation Snapshot lightweight fetchers
// Mirrors collections written by automation actions: salesMetricsSnapshots, salesForecastSnapshots
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

export interface SalesMetricsSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    range?: '30d' | '90d' | 'ytd';
    pipeline: number;
    closedWon: number;
    totalDeals: number;
    createdAt?: Date; // normalized
}

export interface SalesForecastSnapshotDoc {
    id: string;
    userId: string;
    teamId?: string | null;
    period: string; // YYYY-MM-DD
    forecast: number;
    actual?: number | null;
    createdAt?: Date;
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
    return snap.docs.map(d => mapSalesMetricsSnapshotDoc(d.id, d.data()));
}

export async function fetchRecentSalesForecastSnapshots(userId: string, teamId?: string, max = 8): Promise<SalesForecastSnapshotDoc[]> {
    const q = query(
        collection(db, 'salesForecastSnapshots'),
        where(scopeField(teamId), '==', teamId || userId),
        orderBy('createdAt', 'desc'),
        limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapSalesForecastSnapshotDoc(d.id, d.data()));
}

function num(v: unknown): number {
    return typeof v === 'number' ? v : Number(v ?? 0) || 0;
}

function toDate(v: unknown): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    const maybeTs = v as { toDate?: () => Date };
    return typeof maybeTs.toDate === 'function' ? maybeTs.toDate() : undefined;
}

function mapSalesMetricsSnapshotDoc(id: string, raw: unknown): SalesMetricsSnapshotDoc {
    const r = (raw as Record<string, unknown>) || {};
    return {
        id,
        userId: String(r.userId ?? ''),
        teamId: (r.teamId as string | null | undefined) ?? null,
        range: (r.range as SalesMetricsSnapshotDoc['range']) ?? undefined,
        pipeline: num(r.pipeline),
        closedWon: num(r.closedWon),
        totalDeals: num(r.totalDeals),
        createdAt: toDate(r.createdAt),
    };
}

function mapSalesForecastSnapshotDoc(id: string, raw: unknown): SalesForecastSnapshotDoc {
    const r = (raw as Record<string, unknown>) || {};
    return {
        id,
        userId: String(r.userId ?? ''),
        teamId: (r.teamId as string | null | undefined) ?? null,
        period: String(r.period ?? ''),
        forecast: num(r.forecast),
        actual: r.actual == null ? null : num(r.actual),
        createdAt: toDate(r.createdAt),
    };
}
