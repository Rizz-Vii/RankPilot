"use client";
import { useContext, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthContext } from '@/context/AuthContext';

interface Metric { key: string; label: string; value: number; delta: number; trend: number[]; intent?: 'neutral' | 'success' | 'warning' | 'danger'; }
interface Result { loading: boolean; error?: string; kpis: Metric[]; rows: any[]; }

export function useSerpKeywordMetrics(): Result {
    const { user } = useContext<any>(AuthContext);
    const [state, setState] = useState<Result>({ loading: true, kpis: [], rows: [] });
    useEffect(() => {
        if (!user) return; let cancelled = false; (async () => {
            try {
                const q = query(collection(db, 'serpData'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(30));
                const snap = await getDocs(q); if (cancelled) return; const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                if (!docs.length) { setState({ loading: false, kpis: [], rows: [] }); return; }
                const featuredCount = docs.filter(d => (d.results || []).some((r: any) => r.position === 1 && /result 1/i.test(r.title || ''))).length;
                const paaCount = docs.filter(d => (d.results || []).slice(0, 5).some((r: any) => /snippet/i.test(r.snippet || ''))).length;
                const top3Presence = docs.filter(d => (d.results || []).some((r: any) => r.position <= 3)).length / docs.length * 100;
                const kpis: Metric[] = [
                    { key: 'featured', label: 'Featured Snippet %', value: docs.length ? featuredCount / docs.length * 100 : 0, delta: 0, trend: [featuredCount / docs.length * 100], intent: 'neutral' },
                    { key: 'paa', label: 'PeopleAlsoAsk %', value: docs.length ? paaCount / docs.length * 100 : 0, delta: 0, trend: [paaCount / docs.length * 100], intent: 'neutral' },
                    { key: 'top3', label: 'Top-3 Presence %', value: Number(top3Presence.toFixed(1)), delta: 0, trend: [top3Presence], intent: top3Presence > 40 ? 'success' : 'warning' }
                ];
                setState({ loading: false, kpis, rows: docs });
            } catch (e: any) { if (cancelled) return; setState({ loading: false, kpis: [], rows: [], error: e.message }); }
        })(); return () => { cancelled = true; };
    }, [user]);
    return state;
}
