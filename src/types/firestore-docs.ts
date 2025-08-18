// Shared Firestore DTOs and mapping helpers for service layer Firestore reads.
// Keep persistence shapes minimal; mapping functions normalize runtime values.
import type { Timestamp } from 'firebase/firestore';

// ----- Firestore Raw DTOs (stored form) -----
export interface MarketingCampaignFirestore {
    period: string;
    name?: string;
    channel?: string;
    impressions?: number;
    clicks?: number;
    leads?: number;
    spend?: number;
    revenue?: number;
    status?: string;
    userId?: string;
    teamId?: string;
    createdAt?: Timestamp | Date;
}

export interface SalesDealFirestore {
    stage?: string;
    amount?: number;
    probability?: number;
    status?: string;
    cycleDays?: number;
    userId?: string;
    teamId?: string;
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface ForecastSnapshotFirestore {
    period: string;
    forecast?: number;
    actual?: number;
    createdAt?: Timestamp | Date;
    userId?: string;
    teamId?: string;
}

// Finance invoices (raw Firestore shape)
export interface FinanceInvoiceFirestore {
    userId?: string;
    teamId?: string;
    period: string;          // YYYY-MM
    amount?: number;
    status?: string;         // 'paid' | 'unpaid' | 'overdue' | etc.
    issuedAt?: Timestamp | Date;
    paidAt?: Timestamp | Date;
    dueAt?: Timestamp | Date;
    planTier?: string;
}

// ----- Runtime normalized shapes (not persisted) -----
export interface MarketingCampaignRuntime {
    id: string;
    period: string;
    name?: string;
    channel?: string;
    impressions: number; // default 0
    clicks: number;      // default 0
    leads: number;       // default 0
    spend: number;       // default 0
    revenue: number;     // default 0
    status?: string;
    userId?: string;
    teamId?: string;
    createdAt?: Date;
}

export interface SalesDealRuntime {
    stage: string;       // default 'Unknown'
    amount: number;      // default 0
    probability?: number;
    status?: string;
    cycleDays?: number;
    userId?: string;
    teamId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ForecastSnapshotRuntime {
    period: string;
    forecast: number; // default 0
    actual: number;   // default 0
    createdAt?: Date;
    userId?: string;
    teamId?: string;
}

export interface FinanceInvoiceRuntime {
    id: string;
    userId?: string;
    teamId?: string;
    period: string;
    amount: number;          // default 0
    status: string;          // default 'unpaid'
    issuedAt?: Date;
    paidAt?: Date;
    dueAt?: Date;
    planTier?: string;
}

// ----- Helpers -----
export function toDate(v: Timestamp | Date | undefined | null): Date | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    const maybeTs = v as unknown as { toDate?: () => Date };
    return typeof maybeTs.toDate === 'function' ? maybeTs.toDate() : undefined;
}

export function num(v: unknown, fallback = 0): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
}

// ----- Mappers -----
export function mapMarketingCampaignDoc(id: string, raw: MarketingCampaignFirestore): MarketingCampaignRuntime {
    return {
        id,
        period: raw.period,
        name: raw.name,
        channel: raw.channel,
        impressions: num(raw.impressions),
        clicks: num(raw.clicks),
        leads: num(raw.leads),
        spend: num(raw.spend),
        revenue: num(raw.revenue),
        status: raw.status,
        userId: raw.userId,
        teamId: raw.teamId,
        createdAt: toDate(raw.createdAt)
    };
}

export function mapSalesDeal(raw: SalesDealFirestore): SalesDealRuntime {
    return {
        stage: raw.stage || 'Unknown',
        amount: num(raw.amount),
        probability: typeof raw.probability === 'number' ? raw.probability : undefined,
        status: raw.status,
        cycleDays: typeof raw.cycleDays === 'number' ? raw.cycleDays : undefined,
        userId: raw.userId,
        teamId: raw.teamId,
        createdAt: toDate(raw.createdAt),
        updatedAt: toDate(raw.updatedAt)
    };
}

export function mapForecastSnapshot(raw: ForecastSnapshotFirestore): ForecastSnapshotRuntime {
    return {
        period: raw.period,
        forecast: num(raw.forecast),
        actual: num(raw.actual),
        createdAt: toDate(raw.createdAt),
        userId: raw.userId,
        teamId: raw.teamId
    };
}

export function mapFinanceInvoiceDoc(id: string, raw: FinanceInvoiceFirestore): FinanceInvoiceRuntime {
    return {
        id,
        userId: raw.userId,
        teamId: raw.teamId,
        period: raw.period,
        amount: num(raw.amount),
        status: raw.status || 'unpaid',
        issuedAt: toDate(raw.issuedAt),
        paidAt: toDate(raw.paidAt),
        dueAt: toDate(raw.dueAt),
        planTier: raw.planTier
    };
}
