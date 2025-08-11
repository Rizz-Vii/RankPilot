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

// Placeholder Redis cache stub for future implementation.
export class RedisCache<V> implements ICache<V> {
    constructor(_opts?: any) { /* no-op */ }
    get(): CacheEntry<V> | undefined { return undefined; }
    set(): void { /* no-op */ }
    has(): boolean { return false; }
    size(): number { return 0; }
    delete(): void { /* no-op */ }
    keys(): string[] { return []; }
}
