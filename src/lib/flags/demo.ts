export function allowDemoContent(): boolean {
    // Prefer client override to avoid rebuilds in tests and local dev
    if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem('demoContent');
        if (v === 'true') return true;
        if (v === 'false') return false;
    }
    return process.env.NEXT_PUBLIC_DEMO_CONTENT === 'true' || process.env.DEMO_CONTENT === 'true';
}

export function allowIntegrationsMocks(): boolean {
    return allowDemoContent();
}

export function allowEnterpriseMocks(): boolean {
    return allowDemoContent();
}

export function allowContentAnalyzerMocks(): boolean {
    return allowDemoContent();
}

export function allowStreamingMockUser(): boolean {
    // Never allow in production unless explicitly enabled via DEMO_CONTENT
    if (process.env.NODE_ENV === 'production') return process.env.DEMO_CONTENT === 'true';
    return allowDemoContent();
}// Demo content flag utilities

// Reads NEXT_PUBLIC_DEMO_CONTENT or a localStorage override.
// Usage: isDemoContentEnabled() === true to allow mock/demo content in UI.
export function isDemoContentEnabled(): boolean {
    // Local override to avoid rebuilds during testing
    if (typeof window !== 'undefined') {
        const v = window.localStorage.getItem('demoContent');
        if (v === 'true') return true;
        if (v === 'false') return false;
    }
    // Default disabled unless explicitly enabled
    return process.env.NEXT_PUBLIC_DEMO_CONTENT === 'true';
}
