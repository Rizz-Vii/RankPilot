// Development-only module load guard to detect excessive re-import loops.
// Usage: registerModuleLoad(import.meta.url, { threshold: 10, label: 'SeoScoreTrend' })

const globalKey = '__RP_MODULE_LOAD_COUNTS__';
interface CounterMap { [k: string]: { count: number; first: number } }

function getStore(): CounterMap {
    if (typeof globalThis === 'undefined') return {} as any;
    if (!(globalKey in globalThis)) (globalThis as any)[globalKey] = {};
    return (globalThis as any)[globalKey] as CounterMap;
}

export function registerModuleLoad(rawId: string | undefined, opts: { threshold?: number; label?: string } = {}) {
    if (process.env.NODE_ENV === 'production') return;
    if (!rawId) return;
    try {
        const id = rawId.replace(/[?#].*$/, '');
        const store = getStore();
        const rec = store[id] || { count: 0, first: Date.now() };
        rec.count++;
        store[id] = rec;
        const threshold = opts.threshold ?? 12;
        if (rec.count === threshold) {
            // eslint-disable-next-line no-console
            console.warn(`[ModuleLoadGuard] Module '${opts.label || id}' loaded ${rec.count} times. Potential circular re-export or dynamic import loop.`);
        }
    } catch { /* swallow */ }
}

export default registerModuleLoad;
