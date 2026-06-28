/**
 * Centralized user-activity logging.
 *
 * Replaces the repeated `addDoc(collection(db, "users", uid, "activities"), {...})` pattern that
 * was inlined in each tool's page component (SEO Audit, NeuroSEO, Competitive Intelligence). One
 * schema, one timestamp source, one place to evolve the audit trail.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Provenance } from "@/lib/site-intelligence/types";

export interface ToolActivity {
  /** Activity type, e.g. "SEO Audit", "Site Intelligence". */
  type: string;
  /** Tool name shown in the activity feed. */
  tool: string;
  /** Arbitrary structured context for the activity. */
  details?: Record<string, unknown>;
  /** One-line human-readable summary of the result. */
  resultsSummary: string;
  /** Optional run metadata (provenance, timing, outcome). */
  metadata?: {
    provenance?: Provenance;
    source?: "live" | "cache" | "fallback";
    durationMs?: number;
    cacheHit?: boolean;
    success?: boolean;
  };
}

/**
 * Appends an activity record to `users/{userId}/activities` with a server timestamp.
 *
 * Never throws into the caller's main flow: logging is best-effort, so a failure here must not
 * break the user-facing action that triggered it. No-ops when `userId` is empty.
 */
export async function logToolActivity(
  userId: string,
  activity: ToolActivity
): Promise<void> {
  if (!userId) return;
  try {
    const userActivitiesRef = collection(db, "users", userId, "activities");
    await addDoc(userActivitiesRef, {
      ...activity,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Best-effort: surface for debugging but never propagate into the tool's result path.
    console.warn("[activity-logger] failed to record activity", {
      type: activity.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
