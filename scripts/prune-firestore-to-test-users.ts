#!/usr/bin/env ts-node
/**
 * Prunes Firestore to only keep data for known test users/teams.
 * - Dry-run by default (set APPLY=1 to write)
 * - Collections: financeInvoices, kpiAlertsDaily, usageTracking, activities, projects, contentAnalyses
 * - Filters by userId or teamId; keeps recent N per user to preserve UI
 */
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const APPLY = process.env.APPLY === "1";
const KEEP_PER_USER = Number(process.env.KEEP_PER_USER || "12");
const TEST_USERS = (
  process.env.TEST_USER_EMAILS ||
  "admin@rankpilot.com,starter@rankpilot.com,enterprise@rankpilot.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function getUidsByEmail(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const email of TEST_USERS) {
    try {
      const u = await adminAuth.getUserByEmail(email);
      map[email] = u.uid;
    } catch {
      /* skip */
    }
  }
  return map;
}

async function pruneCollectionByUserId(colName: string, userField = "userId") {
  const uidsByEmail = await getUidsByEmail();
  const keepUids = new Set(Object.values(uidsByEmail).filter(Boolean));
  const col = adminDb.collection(colName);
  const snap = await col.limit(2000).get();
  let deletes = 0;
  let kept = 0;
  const byUser: Record<string, Array<{ id: string; ts: number }>> = {};
  snap.forEach((doc) => {
    const d = doc.data() as Record<string, unknown>;
    const uid = String(d[userField] || "");
    const ts = Number(
      (d.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ??
        Date.now()
    );
    if (uid) {
      (byUser[uid] = byUser[uid] || []).push({ id: doc.id, ts });
    }
  });
  for (const [uid, items] of Object.entries(byUser)) {
    items.sort((a, b) => b.ts - a.ts);
    items.forEach((it, idx) => {
      if (!keepUids.has(uid) || idx >= KEEP_PER_USER) deletes++;
      else kept++;
      if (APPLY && (!keepUids.has(uid) || idx >= KEEP_PER_USER))
        col
          .doc(it.id)
          .delete()
          .catch(() => {});
    });
  }
  return { col: colName, kept, deletes, applied: APPLY };
}

async function main() {
  const res: Array<Record<string, unknown>> = [];
  for (const col of [
    "financeInvoices",
    "kpiAlertsDaily",
    "usageTracking",
    "activities",
    "projects",
    "contentAnalyses",
  ]) {
    res.push(await pruneCollectionByUserId(col));
  }
  console.log(JSON.stringify({ ok: true, APPLY, KEEP_PER_USER, res }, null, 2));
}

main().catch((err) => {
  console.error("[prune-firestore-to-test-users] error", err);
  process.exit(1);
});
