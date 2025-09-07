/*
  Migrates user documents to enforce role ∈ {admin,user} and subscriptionTier normalization.
  - If subscriptionTier === 'admin', set to 'enterprise'.
  - If role === 'enterprise', set to 'user'.
  - If role === 'admin' and subscriptionTier != 'enterprise', set subscriptionTier = 'enterprise'.

  Safety:
  - Dry-run by default; set APPLY=1 to write changes.
  - Scope: users collection only; does not touch teams.
*/
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Init (supports local env with GOOGLE_APPLICATION_CREDENTIALS or default)
try {
  initializeApp();
} catch {}
const db = getFirestore();

interface UserDoc {
  role?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

async function run() {
  const APPLY = process.env.APPLY === "1" || process.env.APPLY === "true";
  const snap = await db.collection("users").get();
  let fixes = 0,
    total = 0;
  for (const doc of snap.docs) {
    total++;
    const data = doc.data() as UserDoc;
    const update: Partial<UserDoc> = {};

    // Fix role misuse
    if (data.role && data.role !== "admin" && data.role !== "user") {
      update.role = "user";
    }

    // Fix subscriptionTier=admin
    if (data.subscriptionTier === "admin") {
      update.subscriptionTier = "enterprise";
    }

    // Admin implies enterprise tier
    const role = update.role ?? data.role;
    const tier = update.subscriptionTier ?? data.subscriptionTier;
    if (role === "admin" && tier && tier !== "enterprise") {
      update.subscriptionTier = "enterprise";
    }

    if (Object.keys(update).length) {
      fixes++;
      if (APPLY) {
        await doc.ref.update(update);
        console.log(`[fix] ${doc.id} ->`, update);
      } else {
        console.log(`[dry-run] would fix ${doc.id} ->`, update);
      }
    }
  }
  console.log(JSON.stringify({ total, fixes, applied: APPLY }, null, 2));
}

run().catch((e) => {
  console.error("migration failed", e);
  process.exit(1);
});
