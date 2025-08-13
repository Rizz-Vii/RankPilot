// Finance feature flags and mock gating

export function allowFinanceMocks(): boolean {
    // Allow override via localStorage for testing without rebuilds
    if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem('allowFinanceMocks');
        if (v === 'false') return false;
        if (v === 'true') return true;
    }
    // Default to allowing mocks unless explicitly disabled via env
    return process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS !== 'false';
}
