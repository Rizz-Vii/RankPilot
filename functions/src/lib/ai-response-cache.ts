/**
 * AIResponseCache — in-memory LRU cache for AI responses in Firebase Functions.
 */

interface CacheEntry {
  data: Record<string, unknown>;
  expiresAt: number;
  meta: CacheOptions;
}

interface CacheOptions {
  aiModel: string;
  promptHash: string;
  tokens: number;
  userTier: "free" | "starter" | "agency" | "enterprise" | "admin";
}

interface CacheStats {
  size: number;
  hitRate: number;
  totalAccesses: number;
  memoryUsage: number;
}

const MAX_SIZE = 500;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map<string, CacheEntry>();
let hits = 0;
let misses = 0;

export class AIResponseCache {
  static set(
    key: string,
    data: Record<string, unknown>,
    options: CacheOptions
  ): void {
    if (cache.size >= MAX_SIZE) {
      // Evict oldest entry
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(key, { data, expiresAt: Date.now() + TTL_MS, meta: options });
  }

  static async get(key: string): Promise<Record<string, unknown> | null> {
    const entry = cache.get(key);
    if (!entry) {
      misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      misses++;
      return null;
    }
    hits++;
    return entry.data;
  }

  static getStats(): CacheStats {
    const total = hits + misses;
    // Rough memory estimate: 1KB per entry
    return {
      size: cache.size,
      hitRate: total > 0 ? hits / total : 0,
      totalAccesses: total,
      memoryUsage: cache.size * 1024,
    };
  }
}
