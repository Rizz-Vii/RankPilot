// T28: Firestore onCreate trigger for event mirroring
import * as functions from 'firebase-functions';
import { mirrorEvent } from '../lib/event-mirror';

export const onEventWrite = functions.firestore
  .document('orgs/{orgId}/events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data() ?? {};
    if (!data?.type || !data?.orgId) {
      console.warn('[onEventWrite] missing type/orgId; skipping');
      return;
    }
    await mirrorEvent({ snapshot: snapshot as any, context: { params: context?.params as any } });
  });

