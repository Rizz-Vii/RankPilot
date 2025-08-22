import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function collectUserData(userId: string) {
    const exportPayload: Record<string, unknown[]> = {};
    const collections = [
        { path: `users/${userId}`, single: true },
        { path: `users/${userId}/activities` },
        { path: `users/${userId}/audits` },
        { path: `users/${userId}/keywords` },
        { path: `users/${userId}/reports` },
    ];

    for (const c of collections) {
        if (c.single) {
            const docSnap = await db.doc(c.path).get();
            exportPayload["profile"] = docSnap.exists ? [{ id: docSnap.id, ...(docSnap.data() as Record<string, unknown> | undefined) }] : [];
        } else {
            const snap = await db.collection(c.path).limit(500).get();
            exportPayload[c.path.split("/").pop() || c.path] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
        }
    }
    return exportPayload;
}

export const exportUserData = onCall<{ userId?: string }>(async (req) => {
    const authUid = req.auth?.uid;
    const targetUserId = req.data?.userId || authUid;
    if (!authUid || !targetUserId || authUid !== targetUserId) {
        throw new Error("unauthorized");
    }
    const payload = await collectUserData(targetUserId);
    return { generatedAt: new Date().toISOString(), data: payload };
});

export const requestAccountDeletion = onCall<{ userId?: string }>(async (req) => {
    const authUid = req.auth?.uid;
    const targetUserId = req.data?.userId || authUid;
    if (!authUid || !targetUserId || authUid !== targetUserId) {
        throw new Error("unauthorized");
    }
    await db.doc(`users/${targetUserId}`).set({ deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(), status: "pending_deletion" }, { merge: true });
    const activitiesRef = db.collection(`users/${targetUserId}/activities`).limit(200);
    const actSnap = await activitiesRef.get();
    const batch = db.batch();
    actSnap.docs.forEach(doc => { batch.update(doc.ref, { userId: null }); });
    await batch.commit();
    return { status: "scheduled", userId: targetUserId };
});
