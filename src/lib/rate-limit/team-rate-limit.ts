import { getLogger } from "@/lib/logging/app-logger";
import {
  recordRateLimitRejection,
  recordTeamRateLimitAllowed,
} from "@/lib/metrics/unified-metrics";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebase-admin";

export interface RateLimitBucketState {
  remaining: number;
  updatedAt: number; // epoch ms
}

interface TeamRateLimitResult {
  allowed: boolean;
  state: RateLimitBucketState;
  retryAfterSeconds?: number;
  headers: Record<string, string>;
}

// Legacy error class + function signatures kept for backward compatibility with existing route imports.
export class TeamRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = "Team rate limit exceeded") {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function readConfig() {
  return {
    enabled: process.env.ENABLE_TEAM_BUCKET_LIMIT === "1",
    cap: parseInt(process.env.BUCKET_TOKENS || "60", 10),
    refillPerMin: parseInt(process.env.BUCKET_REFILL_PER_MIN || "1", 10),
  };
}

/**
 * Apply team-scoped token bucket limit. Safe no-op when flag disabled or missing teamId.
 * Firestore doc path strategy: rateLimits/{teamId}
 */
export async function applyTeamRateLimit(
  teamId?: string
): Promise<TeamRateLimitResult | null> {
  const logger = getLogger("team-rate-limit");
  const { enabled, cap, refillPerMin } = readConfig();
  if (!enabled || !teamId) return null;

  const now = Date.now();
  const docRef = adminDb.collection("rateLimits").doc(teamId);
  let snap = await docRef.get();
  let state: RateLimitBucketState;

  if (!snap.exists) {
    state = { remaining: cap, updatedAt: now };
    // Initialize lazily; ignore write errors (fallback)
    try {
      await docRef.create({
        remaining: state.remaining,
        updatedAt: Timestamp.fromMillis(state.updatedAt),
      });
    } catch {
      // ignore race
    }
  } else {
    // Narrow the Firestore document shape defensively without using any
    interface FirestoreRateLimitDoc {
      remaining?: unknown;
      updatedAt?: { toMillis?: () => number } | number;
    }
    const raw = snap.data() as FirestoreRateLimitDoc | undefined;
    const remaining = typeof raw?.remaining === "number" ? raw.remaining : cap;
    let updatedAt: number;
    if (
      raw?.updatedAt &&
      typeof raw.updatedAt === "object" &&
      "toMillis" in raw.updatedAt &&
      typeof raw.updatedAt.toMillis === "function"
    ) {
      updatedAt = raw.updatedAt.toMillis();
    } else if (typeof raw?.updatedAt === "number") {
      updatedAt = raw.updatedAt;
    } else {
      updatedAt = now;
    }
    state = { remaining, updatedAt };
  }

  // Refill
  if (state.remaining < cap) {
    const minutes = Math.floor((now - state.updatedAt) / 60000);
    if (minutes > 0 && refillPerMin > 0) {
      const toAdd = minutes * refillPerMin;
      state.remaining = Math.min(cap, state.remaining + toAdd);
      state.updatedAt = now;
    }
  }

  // Decision
  if (state.remaining <= 0) {
    const msUntilNext = 60000 / (refillPerMin || 1) - (now - state.updatedAt);
    recordRateLimitRejection(teamId);
    const retryAfterSeconds = Math.max(1, Math.ceil(msUntilNext / 1000));
    return {
      allowed: false,
      state,
      retryAfterSeconds,
      headers: {
        "X-Team-RateLimit-Limit": String(cap),
        "X-Team-RateLimit-Remaining": "0",
        "X-Team-RateLimit-Reset": String(
          Math.floor((now + msUntilNext) / 1000)
        ),
        "Retry-After": String(retryAfterSeconds),
      },
    };
  }

  // Consume 1 token
  state.remaining -= 1;
  const writePayload = {
    remaining: state.remaining,
    updatedAt: Timestamp.fromMillis(now),
  };

  try {
    // Optimistic: only write if updatedAt not changed (simple compare)
    await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const fresh = await tx.get(docRef);
      const freshUpdated = fresh.exists
        ? fresh.data()?.updatedAt?.toMillis
          ? fresh.data()?.updatedAt.toMillis()
          : fresh.data()?.updatedAt
        : 0;
      if (freshUpdated === state.updatedAt || !fresh.exists) {
        tx.set(docRef, writePayload, { merge: true });
      } else {
        // Race: ignore; accept in-memory decrement
      }
    });
  } catch (e) {
    const msg =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : String(e);
    logger.warn("write.failed.allow", { error: msg, teamId });
  }

  recordTeamRateLimitAllowed(teamId);
  return {
    allowed: true,
    state,
    headers: {
      "X-Team-RateLimit-Limit": String(cap),
      "X-Team-RateLimit-Remaining": String(state.remaining),
      "X-Team-RateLimit-Reset": String(
        Math.floor((now + 60000 / (refillPerMin || 1)) / 1000)
      ),
    },
  };
}
// deriveTeamLimit reserved for future dynamic per-team overrides (kept as documented placeholder)
// function deriveTeamLimit(db: AdminFirestore.Firestore, teamId: string): number { /* planned extension */ return CAP }

// Back-compat wrapper emulating older imperative throwing API
export async function enforceTeamRateLimit(
  _db: unknown,
  teamId: string,
  _opts?: { routeKey?: string }
) {
  const res = await applyTeamRateLimit(teamId);
  if (res && !res.allowed)
    throw new TeamRateLimitError(res.retryAfterSeconds || 60);
  return res;
}
