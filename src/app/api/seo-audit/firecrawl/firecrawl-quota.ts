// Quota tracking & enforcement for firecrawl route isolated to keep route module export surface minimal.
// Provides Firestore-backed transactional quota with in-memory fallback.
// test helper exported here (NOT from route) to avoid Next.js route type validation picking it up.

const FIRECRAWL_WINDOW_MS = 60 * 60 * 1000; // 1h
let memWindowStart = Date.now();
let memCount = 0;
let cachedAdminDb: unknown = null;

export function __resetFirecrawlQuotaTestOnly(): void {
  // test-only, safe to export here
  memWindowStart = Date.now();
  memCount = 0;
  cachedAdminDb = null;
}

export async function enforceFirecrawlQuota(
  limit: number,
  scopeKey: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}> {
  try {
    if (!cachedAdminDb) {
      const g = global as unknown as { adminDb?: unknown };
      const mod: unknown = g.adminDb
        ? { adminDb: g.adminDb }
        : await import("@/lib/firebase-admin").catch(
            () => import("../../../../lib/firebase-admin")
          );
      cachedAdminDb = (mod as { adminDb?: unknown }).adminDb;
    }
    const adminDb = cachedAdminDb as {
      collection: (name: string) => { doc: (id: string) => unknown };
      runTransaction: (
        fn: (tx: {
          get: (ref: unknown) => Promise<{ exists: boolean; data(): unknown }>;
          set: (
            ref: unknown,
            data: unknown,
            opts?: { merge?: boolean }
          ) => unknown;
        }) => Promise<unknown>
      ) => Promise<unknown>;
    };
    const docRef = adminDb.collection("firecrawlQuota").doc(scopeKey);
    const now = Date.now();
    let retryAfterSeconds = 0;
    const res = (await adminDb.runTransaction(
      async (tx: {
        get: (ref: unknown) => Promise<{ exists: boolean; data(): unknown }>;
        set: (
          ref: unknown,
          data: unknown,
          opts?: { merge?: boolean }
        ) => unknown;
      }) => {
        const snap = await tx.get(docRef);
        let data: { count?: number; windowStart?: unknown } = snap.exists
          ? (snap.data() as { count?: number; windowStart?: unknown })
          : {
              count: 0,
              windowStart:
                (
                  global as unknown as {
                    Timestamp?: { fromMillis: (ms: number) => unknown };
                  }
                ).Timestamp?.fromMillis(now) || new Date(now),
            };
        const ws = data?.windowStart as unknown;
        let windowStartMs = now;
        if (ws && typeof ws === "object") {
          const maybeTs = ws as { toMillis?: () => number; seconds?: number };
          if (typeof maybeTs.toMillis === "function") {
            try {
              windowStartMs = maybeTs.toMillis();
            } catch {
              windowStartMs = now;
            }
          } else if (typeof maybeTs.seconds === "number") {
            windowStartMs = maybeTs.seconds * 1000;
          }
        }
        if (now - windowStartMs >= FIRECRAWL_WINDOW_MS) {
          data.count = 0;
          data.windowStart =
            (
              global as unknown as {
                Timestamp?: { fromMillis: (ms: number) => unknown };
              }
            ).Timestamp?.fromMillis(now) || new Date(now);
        }
        if ((data.count || 0) + 1 > limit) {
          retryAfterSeconds = Math.max(
            1,
            Math.ceil((FIRECRAWL_WINDOW_MS - (now - windowStartMs)) / 1000)
          );
          return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS),
            retryAfterSeconds,
          };
        }
        data.count = (data.count || 0) + 1;
        tx.set(docRef, data, { merge: true });
        return {
          allowed: true,
          remaining: Math.max(0, limit - data.count),
          resetAt: new Date(windowStartMs + FIRECRAWL_WINDOW_MS),
          retryAfterSeconds: 0,
        };
      }
    )) as {
      allowed: boolean;
      remaining: number;
      resetAt: Date;
      retryAfterSeconds: number;
    };
    return res;
  } catch (err: unknown) {
    // Fallback to in-memory (single-instance) if Firestore unavailable
    void err;
    const now = Date.now();
    if (now - memWindowStart >= FIRECRAWL_WINDOW_MS) {
      memWindowStart = now;
      memCount = 0;
    }
    memCount += 1;
    const allowed = memCount <= limit;
    return {
      allowed,
      remaining: allowed ? limit - memCount : 0,
      resetAt: new Date(memWindowStart + FIRECRAWL_WINDOW_MS),
      retryAfterSeconds: allowed ? 0 : 3600,
    };
  }
}
