// Finance feature flags and mock gating

export function allowFinanceMocks(): boolean {
    // Allow override via localStorage for testing without rebuilds
    if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem('allowFinanceMocks');
        if (v === 'false') return false;
        if (v === 'true') return true;
    }
    // Default behavior: disable mocks in production unless explicitly enabled
    const explicit = process.env.NEXT_PUBLIC_ALLOW_FINANCE_MOCKS;
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    // If not explicitly set, gate by NODE_ENV: enabled in development, disabled in production
    return process.env.NODE_ENV !== 'production';
}
