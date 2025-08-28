/**
 * Node crash guard: install once per process to capture and log fatal errors.
 * Safe to import in any server-only context (instrumentation.ts, API routes).
 */

const SENTINEL = Symbol.for('__rp_node_crash_guard_installed__');
const g = (globalThis as unknown as Record<symbol, unknown>);

export function installNodeCrashGuard(): void {
    if (g[SENTINEL]) return;
    g[SENTINEL] = true;

    try {
        process.on('uncaughtException', (err) => {
            // Avoid noisy logs for known exit signals; still print concise summary
            const msg = (err && typeof err.message === 'string') ? err.message : String(err);
            // Defer to Sentry if present; otherwise log to stderr
            // dynamic import without awaiting inside listener to avoid async handler
            import('@sentry/nextjs').then((Sentry) => {
                try {
                    const mod = Sentry as unknown as { captureException?: (e: unknown) => void };
                    mod.captureException?.(err);
                } catch { /* ignore */ }
            }).catch(() => { /* optional */ });
            // Keep a compact server log entry
            // Prefer process.stderr to avoid console rule
            try { process.stderr.write(`[CrashGuard] uncaughtException: ${msg}\n`); } catch { /* ignore */ }
        });

        process.on('unhandledRejection', (reason) => {
            const msg = (reason && typeof (reason as { message?: unknown }).message === 'string')
                ? (reason as { message: string }).message
                : String(reason);
            import('@sentry/nextjs').then((Sentry) => {
                try {
                    const mod = Sentry as unknown as { captureException?: (e: unknown) => void };
                    mod.captureException?.(reason);
                } catch { /* ignore */ }
            }).catch(() => { /* optional */ });
            try { process.stderr.write(`[CrashGuard] unhandledRejection: ${msg}\n`); } catch { /* ignore */ }
        });
    } catch {
        // ignore guard failures
    }
}

// Auto-install if running in a Node/server context
if (typeof process !== 'undefined' && process?.versions?.node) {
    try { installNodeCrashGuard(); } catch { /* noop */ }
}

export default installNodeCrashGuard;
