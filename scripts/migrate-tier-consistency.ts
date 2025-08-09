/**
 * Migration: Normalize legacy subscriptionTier values
 * - Rewrites any user.subscriptionTier === 'professional' to 'agency'
 * - Safe defaults: supports DRY_RUN via env; shows summary
 */
import admin from "firebase-admin";

// Initialize Firebase Admin using default credentials or local emulators
if (!admin.apps.length) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "rankpilot-h3jpc" });
}

const db = admin.firestore();

async function run() {
    const DRY_RUN = process.env.DRY_RUN === "false" ? false : true; // default true
    const usersRef = db.collection("users");
    const q = usersRef.where("subscriptionTier", "==", "professional");

    const snap = await q.get();
    if (snap.empty) {
        console.log("No users with legacy 'professional' tier found.");
        return;
    }

    console.log(`Found ${snap.size} user(s) to migrate from 'professional' -> 'agency'.`);
    let updated = 0;
    for (const doc of snap.docs) {
        const uid = doc.id;
        const data = doc.data();
        console.log(`- ${uid} (${data.email || "no-email"}) -> agency`);

        if (!DRY_RUN) {
            await doc.ref.update({ subscriptionTier: "agency", subscriptionMigratedAt: admin.firestore.FieldValue.serverTimestamp() });
            updated++;
        }
    }

    if (DRY_RUN) {
        console.log("DRY RUN: No changes written. Set DRY_RUN=false to apply.");
    } else {
        console.log(`Migration complete. Updated ${updated} user(s).`);
    }
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
