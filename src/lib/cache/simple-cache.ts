/**
 * Simple cache abstraction (NEU-03)
 */
export interface CacheEntry<V> { value: V; ts: number; }
export interface ICache<V> {
    get(key: string): CacheEntry<V> | undefined;
    set(key: string, value: V): void;
    has(key: string): boolean;
    size(): number;
    delete(key: string): void;
    keys(): string[];
}

export class InMemoryCache<V> implements ICache<V> {
    private store = new Map<string, CacheEntry<V>>();
    get(key: string) { return this.store.get(key); }
    set(key: string, value: V) { this.store.set(key, { value, ts: Date.now() }); }
    has(key: string) { return this.store.has(key); }
    size() { return this.store.size; }
    delete(key: string) { this.store.delete(key); }
    keys() { return [...this.store.keys()]; }
    prune(maxAgeMs: number) { const now = Date.now(); for (const [k, e] of this.store.entries()) if (now - e.ts > maxAgeMs) this.store.delete(k); }
}

// Redis cache adapter (uses fetch-based Upstash REST or ioredis-like client if provided)
interface RedisLike {
    get(key: string): Promise<string | null> | string | null;
    set(key: string, value: string): Promise<unknown> | unknown;
    del(key: string): Promise<number | unknown> | unknown;
    keys?(pattern: string): Promise<string[]> | string[];
}

export class RedisCache<V> implements ICache<V> {
    private client: RedisLike | null = null;
    private prefix: string;

    constructor(opts?: { client?: RedisLike; prefix?: string; upstashUrl?: string; upstashToken?: string; }) {
        this.prefix = opts?.prefix || 'cache:';
        if (opts?.client) {
            this.client = opts.client;
        } else if (opts?.upstashUrl && opts?.upstashToken) {
            // Minimal fetch-based client for Upstash REST
            const base = opts.upstashUrl.replace(/\/$/, '');
            const token = opts.upstashToken;
            this.client = {
                get: async (key: string) => {
                    const res = await fetch(`${base}/get/${encodeURIComponent(this.prefix + key)}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) return null;
                    type UpstashGet = { result?: string | null };
                    const data: UpstashGet | null = await res.json().catch(() => null);
                    return data?.result ?? null;
                },
                set: async (key: string, value: string) => {
                    await fetch(`${base}/set/${encodeURIComponent(this.prefix + key)}/${encodeURIComponent(value)}`, { headers: { Authorization: `Bearer ${token}` } });
                },
                del: async (key: string) => {
                    await fetch(`${base}/del/${encodeURIComponent(this.prefix + key)}`, { headers: { Authorization: `Bearer ${token}` } });
                },
                keys: async (_pattern: string) => []
            } as RedisLike;
        }
    }

    private serialize(entry: CacheEntry<V>): string {
        return JSON.stringify(entry);
    }
    private deserialize(s: string | null): CacheEntry<V> | undefined {
        if (!s) return undefined;
        try { return JSON.parse(s) as CacheEntry<V>; } catch { return undefined; }
    }

    get(key: string): CacheEntry<V> | undefined {
        if (!this.client) return undefined;
        const out = this.client.get(key as string);
        if (out && typeof (out as any).then === 'function') {
            // Note: callers expecting sync ICache will not await; to keep contract, return undefined when async
            // Prefer using factory below to choose sync in-memory in environments without async support
            console.warn('RedisCache.get is async; returning undefined synchronously');
            return undefined;
        }
        return this.deserialize(out as string | null);
    }
    set(key: string, value: V): void {
        if (!this.client) return;
        const payload = this.serialize({ value, ts: Date.now() });
        const out = this.client.set(key, payload);
        if (out && typeof (out as any).then === 'function') {
            // fire and forget
            (out as Promise<unknown>).catch(() => { /* ignore */ });
        }
    }
    has(key: string): boolean {
        return !!this.get(key);
    }
    size(): number {
        // Not efficient without KEYS command; return 0 when unsupported
        return 0;
    }
    delete(key: string): void {
        if (!this.client) return;
        const out = this.client.del(key);
        if (out && typeof (out as any).then === 'function') (out as Promise<unknown>).catch(() => { /* ignore */ });
    }
    keys(): string[] { return []; }
}

// Feature-flagged cache factory
export function createCache<V>(): ICache<V> {
    const useRedis = process.env.NEXT_PUBLIC_USE_REDIS_CACHE === 'true';
    if (useRedis) {
        const upstashUrl = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
        const upstashToken = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;
        if (upstashUrl && upstashToken) return new RedisCache<V>({ upstashUrl, upstashToken, prefix: 'rankpilot:' });
        console.warn('Redis cache enabled but Upstash env vars missing; falling back to in-memory');
    }
    return new InMemoryCache<V>();
}
