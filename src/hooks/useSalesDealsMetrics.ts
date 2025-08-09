"use client";
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

interface DealMetric {
    key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger';
}

interface UseSalesDealsMetricsResult {
    loading: boolean;
    error?: string;
    kpis: DealMetric[];
    dealsSample: any[];
}

export function useSalesDealsMetrics(): UseSalesDealsMetricsResult {
    const { user } = useContext<any>(AuthContext);
    const [state, setState] = useState<UseSalesDealsMetricsResult>({ loading: true, kpis: [], dealsSample: [] });

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const dealsQ = query(
                    collection(db, 'salesDeals'),
                    where('userId', '==', user.uid),
                    orderBy('period', 'desc'),
                    limit(120)
                );
                const snap = await getDocs(dealsQ);
                if (cancelled) return;
                const deals = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
                if (!deals.length) { setState({ loading: false, kpis: [], dealsSample: [] }); return; }
                const byPeriod: Record<string, any[]> = {};
                for (const d of deals) { (byPeriod[d.period] ||= []).push(d); }
                const periods = Object.keys(byPeriod).sort();
                const last = periods[periods.length - 1];
                const prev = periods[periods.length - 2];
                function sum(arr: any[], f: (x: any) => number) { return arr.reduce((s, x) => s + f(x), 0); }
                const lastDeals = byPeriod[last];
                const prevDeals = prev ? byPeriod[prev] : [];
                const pipelineValue = sum(lastDeals, d => d.value || 0);
                const prevPipeline = sum(prevDeals, d => d.value || 0) || 1;
                const closedWon = lastDeals.filter(d => d.stage === 'closed_won');
                const winRate = closedWon.length / lastDeals.length * 100;
                const stageAges = lastDeals.map(d => (d.closedAt?.toDate?.() || new Date()).getTime() - (d.createdAt?.toDate?.() || new Date()).getTime()).filter(v => !isNaN(v));
                const avgCycleDays = stageAges.length ? (stageAges.reduce((a, b) => a + b, 0) / stageAges.length) / (86400000) : 0;
                const kpis: DealMetric[] = [
                    { key: 'pipeline', label: 'Pipeline Value', value: pipelineValue, delta: ((pipelineValue - prevPipeline) / prevPipeline) * 100, trend: periods.map(p => sum(byPeriod[p], d => d.value || 0)), intent: 'success' },
                    { key: 'win_rate', label: 'Win Rate %', value: Number(winRate.toFixed(1)), delta: 0, trend: periods.map(p => { const arr = byPeriod[p]; return arr.filter(d => d.stage === 'closed_won').length / (arr.length || 1) * 100; }), intent: winRate > 30 ? 'success' : 'warning' },
                    { key: 'cycle', label: 'Avg Cycle (d)', value: Number(avgCycleDays.toFixed(1)), delta: 0, trend: periods.map(p => { const arr = byPeriod[p]; const ages = arr.map(d => (d.closedAt?.toDate?.() || new Date()).getTime() - (d.createdAt?.toDate?.() || new Date()).getTime()); return ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length) / (86400000) : 0; }), intent: avgCycleDays < 15 ? 'success' : 'warning' }
                ];
                setState({ loading: false, kpis, dealsSample: lastDeals.slice(0, 10) });
            } catch (e: any) {
                if (cancelled) return;
                setState(s => ({ ...s, loading: false, error: e.message }));
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    return state;
}
