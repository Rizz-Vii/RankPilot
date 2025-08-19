export type FinanceMetrics = {
    revenue: number
    mrr: number
    users: number
    // ...existing fields...
}

function detectMode(req?: Request): 'mock' | 'live' {
    // Query param override (?financeMock=0 switches to live)
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('financeMetricsMode')
            if (stored === 'live' || stored === 'mock') return stored
        } catch { }
    }
    if (req) {
        const url = new URL(req.url)
        if (url.searchParams.get('financeMock') === '0') return 'live'
    }
    const envMode = (process.env.FINANCE_METRICS_MODE as 'mock' | 'live' | undefined) || 'mock'
    return envMode
}

export async function getFinanceMetrics(req?: Request): Promise<{ data: FinanceMetrics; headers: Record<string, string> }> {
    const mode = detectMode(req)
    if (mode === 'mock') {
        // ...existing mock generation...
        const mock: FinanceMetrics = {
            revenue: 12345,
            mrr: 678,
            users: 42
            // ...existing fields...
        }
        return { data: mock, headers: { 'X-Finance-Metrics-Mock': '1' } }
    }
    // Live placeholder deterministic zeros (contract-safe)
    const live: FinanceMetrics = {
        revenue: 0,
        mrr: 0,
        users: 0
        // ...existing fields...
    }
    return { data: live, headers: { 'X-Finance-Metrics-Live': '1' } }
}