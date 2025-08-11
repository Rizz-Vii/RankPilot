import type { firestore as AdminFirestore } from 'firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export class NeuroSeoRateLimitError extends Error {
    status: number;
    retryAfterSeconds: number;
    constructor(message: string, retryAfterSeconds: number) {
        super(message);
        this.status = 429;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

interface RateDoc {
    count: number;
    windowStart: AdminFirestore.Timestamp | any;
}

/**
 * Enforce per-scope (user or team) NeuroSEO live analysis rate limit over a rolling 1h window.
 * Fixed window reset strategy (Phase 1 acceptable). Firestore transaction ensures atomic increment.
 */
export async function enforceNeuroSeoRateLimit(db: AdminFirestore.Firestore, scopeId: string, opts?: { limit?: number }) {
    const logger = getLogger('neuroseo-rate');
    const limit = opts?.limit ?? (process.env.NEUROSEO_RATE_LIMIT ? parseInt(process.env.NEUROSEO_RATE_LIMIT, 10) : 50);
    const docRef = db.collection('neuroseoRateLimits').doc(scopeId);
    const now = Date.now();
    let retryAfterSeconds = 0;
    const res = await db.runTransaction(async (tx: AdminFirestore.Transaction) => {
        const snap = await tx.get(docRef);
        let data: RateDoc = snap.exists ? (snap.data() as any) : { count: 0, windowStart: (global as any).Timestamp?.fromMillis(now) || new Date(now) };
        const windowStartMs = data.windowStart?.toMillis ? data.windowStart.toMillis() : (data.windowStart?.seconds ? data.windowStart.seconds * 1000 : now);
        if (now - windowStartMs >= WINDOW_MS) {
            data.count = 0;
            data.windowStart = (global as any).Timestamp?.fromMillis(now) || new Date(now);
        }
        if (data.count + 1 > limit) {
            retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - windowStartMs)) / 1000));
            return { allowed: false, remaining: 0, resetAt: new Date(windowStartMs + WINDOW_MS) };
        }
        data.count += 1;
        tx.set(docRef, data, { merge: true });
        return { allowed: true, remaining: Math.max(0, limit - data.count), resetAt: new Date(windowStartMs + WINDOW_MS) };
    });
    if (!res.allowed) {
        logger.warn('rate.limit.exceeded', { scopeId, limit, retryAfterSeconds });
        throw new NeuroSeoRateLimitError('rate_limited', retryAfterSeconds);
    }
    logger.debug('rate.limit.ok', { scopeId, remaining: res.remaining });
    return res;
}
