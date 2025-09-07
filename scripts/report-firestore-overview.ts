#!/usr/bin/env ts-node
/**
 * Firestore overview: lists top-level collections and basic stats.
 * Requires Firebase Admin env (FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_PROJECT_ID).
 * Dry-run reading only; no writes.
 */
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function main() {
  // Some dev/mock admin implementations may not support listCollections
  const canList = typeof (adminDb as any).listCollections === "function";
  if (!canList) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          reason: "listCollections_not_supported_in_mock",
          hint: "Provide Firebase Admin creds or serviceAccount.json for full audit",
        },
        null,
        2
      )
    );
    return;
  }
  const collections = await (adminDb as any).listCollections();
  const out: Array<Record<string, unknown>> = [];
  for (const col of collections) {
    const name = col.id;
    const snap = await col.limit(50).get();
    const count = snap.size;
    const sample = snap.docs
      .slice(0, 3)
      .map((d: { id: string; data: () => Record<string, unknown> }) => ({
        id: d.id,
        keys: Object.keys(d.data() || {}),
      }));
    out.push({ collection: name, sampleCount: count, sampleDocs: sample });
  }
  // Users by email (verify test users exist)
  const testEmails = (
    process.env.TEST_USER_EMAILS ||
    "admin@rankpilot.com,starter@rankpilot.com,enterprise@rankpilot.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const uids: Record<string, string | undefined> = {};
  for (const email of testEmails) {
    try {
      const u = await adminAuth.getUserByEmail(email);
      uids[email] = u.uid;
    } catch {
      uids[email] = undefined;
    }
  }
  console.log(
    JSON.stringify({ ok: true, collections: out, testUsers: uids }, null, 2)
  );
}

main().catch((err) => {
  console.error("[report-firestore-overview] error", err);
  process.exit(1);
});
