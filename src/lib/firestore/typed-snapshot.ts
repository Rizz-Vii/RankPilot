/** Lightweight Firestore typing helpers to reduce `unknown` usage in rate limiters. */
export interface TimestampLike { toMillis(): number; seconds?: number }
export function coerceWindowStart(value: unknown, now: number): TimestampLike | Date {
    if (value && typeof value === 'object') {
        const maybe = value as { toMillis?: () => number; seconds?: number };
        if (typeof maybe.toMillis === 'function') return value as TimestampLike;
        if (typeof maybe.seconds === 'number') return { toMillis: () => maybe.seconds! * 1000, seconds: maybe.seconds } as TimestampLike;
    }
    return new Date(now);
}
export function windowStartToMs(ws: TimestampLike | Date, now: number): number {
    if (ws instanceof Date) return ws.getTime();
    try { return ws.toMillis(); } catch { if (typeof (ws as TimestampLike).seconds === 'number') return (ws as TimestampLike).seconds! * 1000; }
    return now;
}
