import type { DomainMetricSet } from '@/lib/domain/mockMetrics';
import { getMockMetrics } from '@/lib/domain/mockMetrics';
import { useEffect, useState } from 'react';

export function useMockDomainMetrics(domain: 'sales' | 'finance' | 'marketing', enabled = true) {
    const [data, setData] = useState<DomainMetricSet | null>(null);
    const [loading, setLoading] = useState<boolean>(!!enabled);
    useEffect(() => {
        if (!enabled) return; let active = true;
        void (async () => {
            try {
                const m = await getMockMetrics(domain);
                if (active) setData(m);
            } finally { if (active) setLoading(false); }
        })();
        return () => { active = false; };
    }, [domain, enabled]);
    return { data, loading };
}
