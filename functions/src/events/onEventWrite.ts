// T28: Firestore onCreate trigger for event mirroring
import * as functions from "firebase-functions/v1";
import { mirrorEvent } from "../lib/event-mirror.js";

export const onEventWrite = functions
  .region("australia-southeast1")
  .firestore.document("orgs/{orgId}/events/{eventId}")
  .onCreate(
    async (
      snapshot: functions.firestore.DocumentSnapshot,
      context: functions.EventContext
    ) => {
      const data = snapshot.data() ?? {};
      if (!data?.type || !data?.orgId) {
        console.warn("[onEventWrite] missing type/orgId; skipping");
        return;
      }
      await mirrorEvent({
        snapshot: {
          id: snapshot.id,
          data: () => snapshot.data() as Record<string, unknown>,
        },
        context: {
          params: context.params as { orgId: string; eventId: string },
        },
      });
    }
  );

// AU variant under explicit name to migrate from legacy us-central1 deployment safely
export const onEventWriteAU = functions
  .region("australia-southeast1")
  .firestore.document("orgs/{orgId}/events/{eventId}")
  .onCreate(
    async (
      snapshot: functions.firestore.DocumentSnapshot,
      context: functions.EventContext
    ) => {
      const data = snapshot.data() ?? {};
      if (!data?.type || !data?.orgId) {
        console.warn("[onEventWriteAU] missing type/orgId; skipping");
        return;
      }
      await mirrorEvent({
        snapshot: {
          id: snapshot.id,
          data: () => snapshot.data() as Record<string, unknown>,
        },
        context: {
          params: context.params as { orgId: string; eventId: string },
        },
      });
    }
  );
