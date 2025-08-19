// Quota tracking & enforcement for firecrawl route isolated to keep route module export surface minimal.
// Provides Firestore-backed transactional quota with in-memory fallback.
// test helper exported here (NOT from route) to avoid Next.js route type validation picking it up.

const FIRECRAWL_WINDOW_MS = 60 * 60 * 1000; // 1h
let memWindowStart = Date.now();
let memCount = 0;
let cachedAdminDb: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

export function __resetFirecrawlQuotaTestOnly() { // test-only, safe to export here
    memWindowStart = Date.now();
    memCount = 0;
    cachedAdminDb = null;
}

export async function enforceFirecrawlQuota(limit: number, scopeKey: string) {
    try {
        if (!cachedAdminDb) {
            const mod: any = (global as any).adminDb ? { adminDb: (global as any).adminDb } : await import('@/lib/firebase-admin').catch(() => import('../../../../lib/firebase-admin'));
            cachedAdminDb = mod.adminDb;
        }
        const adminDb: any = cachedAdminDb as any;
        const docRef = adminDb.collection('firecrawlQuota').doc(scopeKey);
        const now = Date.now();
        let retryAfterSeconds = 0;
        const res = await adminDb.runTransaction(async (tx: any) => {
            const snap = await tx.get(docRef);
            let data: any = snap.exists ? (snap.data() as any) : { count: 0, windowStart: (global as any).Timestamp?.fromMillis(now) || new Date(now) };
            const windowStartMs = data?.windowStart?.toMillis ? data.windowStart.toMillis() : (data?.windowStart?.seconds ? data.windowStart.seconds * 1000 : now);
            if (now - windowStartMs >= FIRECRAWL_WINDOW_MS) {
                data.count = 0; data.windowStart = (global as any).Timestamp?.fromMillis(now) || new Date(now);
            }
            if ((data.count || 0) + 1 > limit) {
                retryAfterSeconds = Math.max(1, Math.ceil((FIRECRAWL_WINDOW_MS - (now - windowStartMs)) / 1000));
                return { allowed: false, remaining: 0, resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS), retryAfterSeconds };
            }
            data.count = (data.count || 0) + 1;
            tx.set(docRef, data, { merge: true });
            return { allowed: true, remaining: Math.max(0, limit - data.count), resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS), retryAfterSeconds: 0 };
        });
        return res;
    } catch {
        // Fallback to in-memory (single-instance) if Firestore unavailable
        const now = Date.now();
        if (now - memWindowStart >= FIRECRAWL_WINDOW_MS) { memWindowStart = now; memCount = 0; }
        memCount += 1;
        const allowed = memCount <= limit;
        return { allowed, remaining: allowed ? (limit - memCount) : 0, resetAt: new Date(memWindowStart + FIRECRAWL_WINDOW_MS), retryAfterSeconds: allowed ? 0 : 3600 };
    }
}
