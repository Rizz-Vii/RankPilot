import type { firestore as AdminFirestore } from 'firebase-admin';
import { getLogger } from '@/lib/logging/app-logger';
import { recordRateLimitRejection, recordTeamRateLimitAllowed } from '@/lib/metrics/unified-metrics';
import { coerceWindowStart, windowStartToMs, TimestampLike } from '@/lib/firestore/typed-snapshot';

/**
 * Team-Aware Rate Limiter (PERF-01)
 * Strategy: Fixed window (1h) count; acceptable for Phase 1.
 * Firestore doc: teamRateLimits/{teamId} => { count, windowStart }
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export class TeamRateLimitError extends Error {
    status: number = 429;
    retryAfterSeconds: number;
    scope: string;
    constructor(scope: string, retryAfterSeconds: number) {
        super('rate_limited');
        this.retryAfterSeconds = retryAfterSeconds;
        this.scope = scope;
    }
}

interface RateDoc { count: number; windowStart: TimestampLike | Date; }
interface EnforceOpts { limit?: number; routeKey?: string; }

export async function enforceTeamRateLimit(db: AdminFirestore.Firestore, teamId: string, opts: EnforceOpts = {}) {
    const logger = getLogger('team-rate-limit');
    const limit = opts.limit ?? deriveTeamLimit(db, teamId);
    const routeKey = opts.routeKey || 'generic';
    const docRef = db.collection('teamRateLimits').doc(teamId);
    const now = Date.now();
    let retryAfterSeconds = 0;
    const res = await db.runTransaction(async tx => {
        const snap = await tx.get(docRef);
        const raw = snap.exists ? (snap.data() as Partial<RateDoc>) : undefined;
        const data: RateDoc = {
            count: typeof raw?.count === 'number' ? raw.count : 0,
            windowStart: raw?.windowStart ? coerceWindowStart(raw.windowStart, now) : new Date(now)
        };
        const windowStartMs = windowStartToMs(data.windowStart, now);
        if (now - windowStartMs >= WINDOW_MS) {
            data.count = 0;
            data.windowStart = new Date(now);
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
        recordRateLimitRejection(`team:${teamId}`);
        recordRateLimitRejection(routeKey);
        logger.warn('team.rate.limit.exceeded', { teamId, limit, retryAfterSeconds });
        throw new TeamRateLimitError(teamId, retryAfterSeconds);
    }
    // Record allowed metric for utilization tracking (routeKey and team scope)
    recordTeamRateLimitAllowed(routeKey);
    recordTeamRateLimitAllowed(`team:${teamId}`);
    return res;
}

function deriveTeamLimit(_db: AdminFirestore.Firestore, _teamId: string): number {
    if (process.env.TEAM_RATE_LIMIT) {
        const n = parseInt(process.env.TEAM_RATE_LIMIT, 10); if (!isNaN(n)) return n;
    }
    return 500; // default per hour
}
