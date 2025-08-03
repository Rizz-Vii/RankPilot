/**
 * Rate Limiting Utility
 * Advanced Architecture Enhancement - DevReady Phase 3
 * 
 * Features:
 * - Memory-based rate limiting for API endpoints
 * - IP-based tracking with cleanup
 * - Configurable intervals and limits
 * - Enterprise-grade protection
 */

interface RateLimitConfig {
    interval: number; // Time window in milliseconds
    uniqueTokenPerInterval: number; // Max unique tokens to track
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private requests = new Map<string, RateLimitEntry>();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;

        // Cleanup old entries every minute
        setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    async check(limit: number, token: string): Promise<void> {
        const now = Date.now();
        const key = token;

        // Get or create entry
        let entry = this.requests.get(key);

        if (!entry || now > entry.resetTime) {
            // Create new entry or reset expired one
            entry = {
                count: 1,
                resetTime: now + this.config.interval
            };
            this.requests.set(key, entry);
            return;
        }

        // Check if limit exceeded
        if (entry.count >= limit) {
            throw new Error('Rate limit exceeded');
        }

        // Increment count
        entry.count++;
        this.requests.set(key, entry);
    }

    private cleanup(): void {
        const now = Date.now();
        const toDelete: string[] = [];

        for (const [_key, entry] of this.requests.entries()) {
            if (now > entry.resetTime) {
                toDelete.push(_key);
            }
        }

        for (const key of toDelete) {
            this.requests.delete(key);
        }

        // Prevent memory leak by limiting total entries
        if (this.requests.size > this.config.uniqueTokenPerInterval) {
            const entries = Array.from(this.requests.entries());
            entries.sort((a, b) => a[1].resetTime - b[1].resetTime);

            const toRemove = entries.slice(0, entries.length - this.config.uniqueTokenPerInterval);
            for (const [key] of toRemove) {
                this.requests.delete(key);
            }
        }
    }

    getStats(): { totalRequests: number; activeTokens: number; } {
        const now = Date.now();
        let totalRequests = 0;
        let activeTokens = 0;

        for (const [, entry] of this.requests.entries()) {
            if (now <= entry.resetTime) {
                totalRequests += entry.count;
                activeTokens++;
            }
        }

        return { totalRequests, activeTokens };
    }
}

export function rateLimit(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(config);
}

export type { RateLimitConfig, RateLimiter };
