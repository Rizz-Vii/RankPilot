"use client";
import { useContext, useEffect, useState, useCallback } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; }
interface MarketingCampaignDoc {
    id: string;
    period: string;
    impressions?: number;
    clicks?: number;
    leads?: number;
    spend?: number;
    revenue?: number;
    // Allow forward-compatible extension
    [k: string]: unknown;
}
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: MarketingCampaignDoc[]; addOptimistic: (row: MarketingCampaignDoc) => void; }

export function useMarketingCampaignMetrics(monthWindow = 6): Result {
    const { user } = useContext(AuthContext);
    const [state, setState] = useState<Omit<Result, 'addOptimistic'>>({ loading: true, kpis: [], rows: [] });
    const addOptimistic = useCallback((row: MarketingCampaignDoc) => {
        setState(s => ({ ...s, rows: [row, ...s.rows].slice(0, 200) }));
    }, []);
    useEffect(() => {
        if (!user) return; let cancelled = false;
        const q = query(collection(db, 'marketingCampaigns'), where('userId', '==', user.uid), orderBy('period', 'desc'), limit(monthWindow * 60));
        const unsub = onSnapshot(q, snap => {
            if (cancelled) return;
            const docs: MarketingCampaignDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as MarketingCampaignDoc[];
            if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
            const periods = Array.from(new Set(docs.map(d => d.period))).sort();
            const cutoff = periods.slice(-monthWindow); const filtered = docs.filter(d => cutoff.includes(d.period));
            const byPeriod: Record<string, MarketingCampaignDoc[]> = {}; for (const d of filtered) { (byPeriod[d.period] ||= []).push(d); } const ordered = Object.keys(byPeriod).sort();
            function sum(arr: MarketingCampaignDoc[], f: (x: MarketingCampaignDoc) => number) { return arr.reduce((s, x) => s + f(x), 0); }
            const last = ordered.at(-1)!; const prev = ordered.at(-2);
            const impressions = sum(byPeriod[last], d => d.impressions || 0); const prevImp = (prev ? sum(byPeriod[prev], d => d.impressions || 0) : impressions) || 1;
            const clicks = sum(byPeriod[last], d => d.clicks || 0); const ctr = impressions ? (clicks / impressions * 100) : 0;
            const leads = sum(byPeriod[last], d => d.leads || 0); const prevLeads = (prev ? sum(byPeriod[prev], d => d.leads || 0) : leads) || 1;
            const spend = sum(byPeriod[last], d => d.spend || 0); const revenue = sum(byPeriod[last], d => d.revenue || 0); const roi = spend ? ((revenue - spend) / spend * 100) : 0;
            const kpis: Metric[] = [
                { key: 'impr', label: 'Impressions', value: impressions, delta: (impressions - prevImp) / prevImp * 100, trend: ordered.map(p => sum(byPeriod[p], d => d.impressions || 0)), intent: 'neutral' },
                { key: 'ctr', label: 'CTR %', value: Number(ctr.toFixed(2)), delta: 0, trend: ordered.map(p => { const arr = byPeriod[p]; const imp = sum(arr, d => d.impressions || 0); const clk = sum(arr, d => d.clicks || 0); return imp ? clk / imp * 100 : 0; }), intent: ctr > 3 ? 'success' : 'warning' },
                { key: 'leads', label: 'Leads', value: leads, delta: (leads - prevLeads) / prevLeads * 100, trend: ordered.map(p => sum(byPeriod[p], d => d.leads || 0)), intent: 'neutral' },
                { key: 'roi', label: 'ROI %', value: Number(roi.toFixed(1)), delta: 0, trend: ordered.map(p => { const arr = byPeriod[p]; const sp = sum(arr, d => d.spend || 0); const rev = sum(arr, d => d.revenue || 0); return sp ? (rev - sp) / sp * 100 : 0; }), intent: roi > 50 ? 'success' : 'warning' }
            ];
            setState({ loading: false, kpis, rows: filtered.slice(0, 200) });
        }, err => {
            if (cancelled) return; setState({ loading: false, kpis: [], rows: [], error: err.message });
        });
        return () => { cancelled = true; unsub(); };
    }, [user, monthWindow]);
    return { ...state, addOptimistic };
}
