import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

const ACCEPTED_RETENTION_DAYS = Number(
  process.env.INVITES_ACCEPTED_RETENTION_DAYS || 30
);
const EXPIRED_RETENTION_DAYS = Number(
  process.env.INVITES_EXPIRED_RETENTION_DAYS || 14
);

function days(ms: number) {
  return ms / (1000 * 60 * 60 * 24);
}

function toMillis(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "object" && v !== null && "toDate" in v) {
    const maybeToDate = (v as { toDate?: unknown }).toDate;
    if (typeof maybeToDate === "function")
      return (v as { toDate: () => Date }).toDate().getTime();
  }
  return undefined;
}

export const cleanupInvites = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Etc/UTC",
    region: "australia-southeast1",
  },
  async () => {
    if (!getApps().length) initializeApp();
    const db = getFirestore();
    const now = Date.now();
    let markedExpired = 0,
      deletedAccepted = 0,
      deletedExpired = 0,
      orphanIndexes = 0;
    try {
      const teams = await db.collection("teams").get();
      for (const t of teams.docs) {
        const invitesSnap = await db
          .collection("teams")
          .doc(t.id)
          .collection("invites")
          .get();
        for (const inv of invitesSnap.docs) {
          const data = inv.data() as Record<string, unknown>;
          const expiresAt = toMillis(data["expiresAt"]);
          if (
            String(data["status"]) === "pending" &&
            expiresAt &&
            expiresAt < now
          ) {
            await inv.ref.update({ status: "expired", expiredAt: new Date() });
            await db
              .collection("invites_index")
              .doc(inv.id)
              .set(
                { teamId: t.id, status: "expired", updatedAt: new Date() },
                { merge: true }
              );
            markedExpired++;
          }
          if (String(data["status"]) === "accepted") {
            const acceptedAt = toMillis(data["acceptedAt"]) || 0;
            if (
              acceptedAt &&
              days(now - acceptedAt) > ACCEPTED_RETENTION_DAYS
            ) {
              await inv.ref.delete();
              await db
                .collection("invites_index")
                .doc(inv.id)
                .delete()
                .catch(() => {});
              deletedAccepted++;
            }
          } else if (String(data["status"]) === "expired") {
            const expiredAt = toMillis(data["expiredAt"]) || expiresAt || 0;
            if (expiredAt && days(now - expiredAt) > EXPIRED_RETENTION_DAYS) {
              await inv.ref.delete();
              await db
                .collection("invites_index")
                .doc(inv.id)
                .delete()
                .catch(() => {});
              deletedExpired++;
            }
          }
        }
      }
      // Orphan indexes
      const indexSnap = await db.collection("invites_index").get();
      for (const idx of indexSnap.docs) {
        const data = idx.data() as Record<string, unknown>;
        const teamId =
          typeof data.teamId === "string" ? data.teamId : undefined;
        if (!teamId) {
          orphanIndexes++;
          await idx.ref.delete().catch(() => {});
          continue;
        }
        const invDoc = await db
          .collection("teams")
          .doc(teamId)
          .collection("invites")
          .doc(idx.id)
          .get();
        if (!invDoc.exists) {
          await idx.ref.delete().catch(() => {});
          orphanIndexes++;
        }
      }
      logger.info("cleanupInvites summary", {
        markedExpired,
        deletedAccepted,
        deletedExpired,
        orphanIndexes,
      });
    } catch (e) {
      logger.error(
        "cleanupInvites error",
        e instanceof Error ? e.message : String(e)
      );
      throw e;
    }
  }
);

// Alias for creating a new Cloud Scheduler job in valid region via different function name
export const cleanupInvitesV2 = cleanupInvites;
