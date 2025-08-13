// Helper: derive test override limit from request headers (non-production only)
// Allows automated tests to trigger low-rate limits without altering global env.
export function getTestTeamRateLimitOverride(req: Request | { headers: { get(name: string): string | null } }): number | undefined {
    if (process.env.NODE_ENV === 'production') return undefined;
    const raw = req.headers.get('x-test-team-limit');
    if (!raw) return undefined;
    const n = parseInt(raw, 10);
    return isNaN(n) || n <= 0 ? undefined : n;
}
