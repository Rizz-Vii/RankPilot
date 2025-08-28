// Marketing Metrics Service - aggregates campaign data with realtime subscription
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firebase/snapshot-map';
import { managedOnSnapshot } from '@/lib/firebase/write-guard';
import type { MarketingCampaignFirestore } from '@/types/firestore-docs';
import { mapMarketingCampaignDoc } from '@/types/firestore-docs';
import type { DocumentData, QuerySnapshot, Unsubscribe } from 'firebase/firestore';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

export interface MarketingCampaignDoc { id?: string; userId?: string; teamId?: string; period: string; name?: string; channel?: string; impressions?: number; clicks?: number; leads?: number; spend?: number; revenue?: number; status?: string; createdAt?: unknown; }

export interface AggregatedMarketingMetrics {
    kpis: { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; target?: number; invertTarget?: boolean }[];
    campaigns: MarketingCampaignDoc[];
    channelPerformance: { channel: string; impressions: number; leads: number; roi: number }[];
    trendSeries: { period: string; impressions: number; leads: number; ctr: number; roi: number }[];
}

function aggregateCampaigns(campaigns: MarketingCampaignDoc[], months: number): AggregatedMarketingMetrics {
    if (!campaigns.length) {
        // When there is no data to aggregate, return empty metrics.
        // Mock fallback should be handled by the async fetch layer where awaiting is possible.
        return { kpis: [], campaigns: [], channelPerformance: [], trendSeries: [] };
    }
    const periods = Array.from(new Set(campaigns.map(c => c.period))).sort();
    const recent = periods.slice(-months);
    const filtered = campaigns.filter(c => recent.includes(c.period));
    const byPeriod: Record<string, MarketingCampaignDoc[]> = {};
    for (const c of filtered) { (byPeriod[c.period] ||= []).push(c); }
    const ordered = Object.keys(byPeriod).sort();
    const sum = (arr: MarketingCampaignDoc[], f: (x: MarketingCampaignDoc) => number) => arr.reduce((a, x) => a + f(x), 0);
    const last = ordered.at(-1)!; const prev = ordered.at(-2);
    const lastArr = byPeriod[last]; const prevArr = prev ? byPeriod[prev] : lastArr;
    const impressions = sum(lastArr, c => c.impressions || 0); const prevImpr = Math.max(1, sum(prevArr, c => c.impressions || 0));
    const clicks = sum(lastArr, c => c.clicks || 0); const ctr = impressions ? (clicks / impressions * 100) : 0;
    const prevClicks = sum(prevArr, c => c.clicks || 0); const prevCtr = prevImpr ? (prevClicks / prevImpr * 100) : 0;
    const leads = sum(lastArr, c => c.leads || 0); const prevLeads = Math.max(1, sum(prevArr, c => c.leads || 0));
    const spend = sum(lastArr, c => c.spend || 0); const revenue = sum(lastArr, c => c.revenue || 0); const roi = spend ? ((revenue - spend) / spend * 100) : 0;
    const prevSpend = sum(prevArr, c => c.spend || 0); const prevRevenue = sum(prevArr, c => c.revenue || 0); const prevRoi = prevSpend ? ((prevRevenue - prevSpend) / prevSpend * 100) : 0;
    const trendSeries = ordered.map(p => {
        const arr = byPeriod[p];
        const imp = sum(arr, c => c.impressions || 0);
        const clk = sum(arr, c => c.clicks || 0);
        const ld = sum(arr, c => c.leads || 0);
        const sp = sum(arr, c => c.spend || 0);
        const rev = sum(arr, c => c.revenue || 0);
        return { period: p, impressions: imp, leads: ld, ctr: imp ? clk / imp * 100 : 0, roi: sp ? (rev - sp) / sp * 100 : 0 };
    });
    const channelMap = new Map<string, { impressions: number; leads: number; spend: number; revenue: number }>();
    for (const c of filtered) {
        const key = c.channel || 'unknown';
        if (!channelMap.has(key)) channelMap.set(key, { impressions: 0, leads: 0, spend: 0, revenue: 0 });
        const rec = channelMap.get(key)!;
        rec.impressions += c.impressions || 0;
        rec.leads += c.leads || 0;
        rec.spend += c.spend || 0;
        rec.revenue += c.revenue || 0;
    }
    const channelPerformance = Array.from(channelMap.entries()).map(([channel, v]) => ({ channel, impressions: v.impressions, leads: v.leads, roi: v.spend ? ((v.revenue - v.spend) / v.spend * 100) : 0 })).sort((a, b) => b.leads - a.leads);
    const kpis: AggregatedMarketingMetrics['kpis'] = [
        { key: 'impr', label: 'Impressions', value: impressions, delta: impressions ? (impressions - prevImpr) / prevImpr * 100 : 0, trend: trendSeries.map(t => t.impressions), intent: 'neutral', target: impressions * 1.1 },
        { key: 'ctr', label: 'CTR %', value: Number(ctr.toFixed(2)), delta: ctr - prevCtr, trend: trendSeries.map(t => Number(t.ctr.toFixed(2))), intent: ctr > 3 ? 'success' : 'warning', target: 3.5 },
        { key: 'leads', label: 'Leads', value: leads, delta: (leads - prevLeads) / prevLeads * 100, trend: trendSeries.map(t => t.leads), intent: 'neutral', target: leads * 1.15 },
        { key: 'roi', label: 'ROI %', value: Number(roi.toFixed(1)), delta: roi - prevRoi, trend: trendSeries.map(t => Number(t.roi.toFixed(1))), intent: roi > 50 ? 'success' : 'warning', target: 60 }
    ];
    return { kpis, campaigns: filtered.slice(0, 300), channelPerformance, trendSeries };
}

export async function fetchMarketingMetrics(userId: string, months: number, teamId?: string): Promise<AggregatedMarketingMetrics> {
    try {
        const conds = teamId ? [where('teamId', '==', teamId)] : [where('userId', '==', userId)];
        const q = query(collection(db, 'marketingCampaigns'), ...conds, orderBy('period', 'desc'), limit(months * 40));
        const snap = await getDocs(q);
        const campaigns: MarketingCampaignDoc[] = mapDocs(snap as QuerySnapshot<DocumentData>, (id, data) => mapMarketingCampaignDoc(id, data as MarketingCampaignFirestore));
        if (!campaigns.length) throw new Error('empty');
        return aggregateCampaigns(campaigns, months);
    } catch {
        const mock = await getMockMetrics('marketing');
        return { kpis: mock.kpis, campaigns: [], channelPerformance: [], trendSeries: [] };
    }
}

export function subscribeMarketingMetrics(userId: string, months: number, cb: (m: AggregatedMarketingMetrics) => void, teamId?: string): Unsubscribe {
    const conds = teamId ? [where('teamId', '==', teamId)] : [where('userId', '==', userId)];
    const q = query(collection(db, 'marketingCampaigns'), ...conds, orderBy('period', 'desc'));
    let campaigns: MarketingCampaignDoc[] = [];
    const unsub = managedOnSnapshot(
        q,
        (snap) => {
            campaigns = mapDocs(snap as QuerySnapshot<DocumentData>, (id, data) => mapMarketingCampaignDoc(id, data as MarketingCampaignFirestore));
            cb(aggregateCampaigns(campaigns, months));
        },
        err => { console.error('[MarketingMetrics] snapshot error', err); },
        { debounceMs: 120 }
    );
    return () => { unsub(); };
}
