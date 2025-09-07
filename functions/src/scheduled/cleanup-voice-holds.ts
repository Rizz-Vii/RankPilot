import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

export const cleanupVoiceHolds = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Etc/UTC",
    region: "australia-southeast1",
  },
  async () => {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const nowIso = new Date().toISOString();
    let expired = 0;
    try {
      const q = await db
        .collection("voice_holds")
        .where("status", "==", "held")
        .where("heldUntil", "<=", nowIso)
        .limit(200)
        .get();
      for (const d of q.docs) {
        await d.ref.update({
          status: "expired",
          expiredAt: new Date().toISOString(),
        });
        expired++;
      }
      logger.info("cleanupVoiceHolds summary", { expired });
    } catch (e) {
      logger.error(
        "cleanupVoiceHolds error",
        e instanceof Error ? e.message : String(e)
      );
      throw e;
    }
  }
);
