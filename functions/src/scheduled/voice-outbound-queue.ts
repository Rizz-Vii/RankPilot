import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { scheduler } from "firebase-functions/v2";

type QueueItem = {
  to: string;
  from?: string | null;
  schedule?: Date | { toDate?: () => Date } | null;
  config?: {
    voice?: string;
    language?: string;
    rate?: number;
    recordingUrl?: string | null;
    interactive?: boolean;
    script?: string | null;
  } | null;
  repeat?: "daily" | "weekly" | null;
  sourceApptId?: string | null;
  status?: string;
};

type TimestampLike = { toDate?: () => Date } | Date | null | undefined;

function toDateLike(v: TimestampLike): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && typeof v.toDate === "function") {
    const d = v.toDate();
    return d instanceof Date ? d : null;
  }
  return null;
}

type TwilioCallCreateArgs = {
  to: string;
  from: string;
  twiml: string;
  statusCallback?: string;
  statusCallbackMethod?: "POST" | "GET";
  statusCallbackEvent?: string[];
};
type TwilioCallCreateResult = { sid?: string; status?: string };
type TwilioCallsApi = {
  create(args: TwilioCallCreateArgs): Promise<TwilioCallCreateResult>;
};
type TwilioClient = { calls: TwilioCallsApi };
type TwilioCtor = new (sid: string, token: string) => TwilioClient;

function buildTwiml(opts: {
  sayText: string;
  voice: string;
  language: string;
  rate: number;
  recordingUrl?: string | null;
  interactive?: boolean;
}) {
  const { sayText, voice, language, rate, recordingUrl, interactive } = opts;
  const prosodyOpen =
    rate && rate !== 1 ? `<prosody rate="${Math.round(rate * 100)}%">` : "";
  const prosodyClose = rate && rate !== 1 ? `</prosody>` : "";
  if (recordingUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${recordingUrl}</Play>\n</Response>`;
  }
  if (interactive) {
    const actionUrl = process.env.PUBLIC_BASE_URL
      ? `${process.env.PUBLIC_BASE_URL}/api/voice/twilio/gather`
      : undefined;
    if (actionUrl) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech dtmf" numDigits="1" timeout="5" action="${actionUrl}" method="POST">\n    <Say voice="${voice}" language="${language}">${prosodyOpen}${sayText} Press 1 if interested, or say 'yes'.${prosodyClose}</Say>\n  </Gather>\n  <Say voice="${voice}" language="${language}">Thank you. Goodbye.</Say>\n</Response>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech dtmf" numDigits="1" timeout="5">\n    <Say voice="${voice}" language="${language}">${prosodyOpen}${sayText} Press 1 if interested, or say 'yes'.${prosodyClose}</Say>\n  </Gather>\n  <Say voice="${voice}" language="${language}">Thank you. Goodbye.</Say>\n</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="${voice}" language="${language}">${prosodyOpen}${sayText}${prosodyClose}</Say>\n</Response>`;
}

export async function processVoiceOutboundQueueTick(
  injectedDb?: ReturnType<typeof getFirestore>,
  injectedNow?: Date
) {
  if (!getApps().length) initializeApp();
  const db = injectedDb || getFirestore();
  const now = injectedNow || new Date();

  // Fetch due queue items
  const snap = await db
    .collection("voice_outbound_queue")
    .where("status", "==", "queued")
    .where("schedule", "<=", now)
    .orderBy("schedule", "asc")
    .limit(20)
    .get()
    .catch((e) => {
      logger.error("voiceOutboundQueue.query_error", e);
      throw e;
    });

  if (snap.empty) {
    logger.info("voiceOutboundQueue: none due");
    return { processed: 0 };
  }

  // Lazy import twilio and helpers from shared lib in app when available
  let twilioClient: TwilioClient | null = null;
  let fromDefault: string | undefined;
  try {
    const twilioMod = await import("twilio");
    // Support both named Twilio export and default export shape
    const TwilioCtor =
      (twilioMod as { Twilio?: TwilioCtor }).Twilio ||
      ((twilioMod as unknown as { default?: TwilioCtor }).default as
        | TwilioCtor
        | undefined);
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token && TwilioCtor) twilioClient = new TwilioCtor(sid, token);
    fromDefault = process.env.TWILIO_FROM_NUMBER;
  } catch (e) {
    logger.error("voiceOutboundQueue.twilio_import_error", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  let processed = 0;
  for (const doc of snap.docs) {
    const data = (doc.data() || {}) as QueueItem;
    const scheduleDate = toDateLike(data.schedule) || now;
    const to = data.to;
    if (!to) {
      await doc.ref.update({
        status: "skipped",
        reason: "missing_to",
        updatedAt: FieldValue.serverTimestamp(),
      });
      continue;
    }

    try {
      // Mark as started to avoid double-processing
      await doc.ref.update({
        status: "processing",
        startedAt: FieldValue.serverTimestamp(),
      });

      const voice =
        data.config?.voice || process.env.TWILIO_SAY_VOICE || "alice";
      const language =
        data.config?.language || process.env.TWILIO_SAY_LANGUAGE || "en-US";
      const rate = Number(
        data.config?.rate || process.env.TWILIO_SAY_RATE || 1
      );
      const recordingUrl = data.config?.recordingUrl || null;
      const interactive = Boolean(data.config?.interactive);
      const script = data.config?.script || "";
      const from = data.from || fromDefault || undefined;

      const sayText =
        script ||
        "Hello. This is RankPilot. We are confirming your appointment. Goodbye.";
      const twiml = buildTwiml({
        sayText,
        voice,
        language,
        rate,
        recordingUrl,
        interactive,
      });

      let callSid: string | null = null;
      let callStatus: string | null = null;
      if (twilioClient && from) {
        try {
          const call = await twilioClient.calls.create({
            to,
            from,
            twiml,
            statusCallback: process.env.PUBLIC_BASE_URL
              ? `${process.env.PUBLIC_BASE_URL}/api/voice/twilio/status`
              : undefined,
            statusCallbackMethod: "POST",
            statusCallbackEvent: [
              "queued",
              "initiated",
              "ringing",
              "answered",
              "completed",
            ],
          });
          callSid = call?.sid || null;
          callStatus = call?.status || null;
        } catch (e) {
          logger.error("voiceOutboundQueue.call_failed", {
            id: doc.id,
            error: String(e),
          });
        }
      } else {
        logger.error("voiceOutboundQueue.twilio_not_configured", {
          hasClient: !!twilioClient,
          hasFrom: !!from,
        });
      }

      // Record to voice_calls (best-effort)
      try {
        const calls = db.collection("voice_calls");
        const callDocData = {
          callSid: callSid || null,
          to,
          from: from || null,
          status: callStatus || "queued",
          direction: "outbound-queue",
          createdAt: new Date().toISOString(),
          plannedAt: scheduleDate?.toISOString?.() || null,
          config: {
            voice,
            language,
            rate,
            recordingUrl,
            interactive,
            script: script || null,
          },
          source: "voice_outbound_queue",
          queueItemId: doc.id,
        } as const;
        if (callSid) await calls.doc(callSid).set(callDocData);
        else await calls.add(callDocData);
      } catch (e) {
        logger.warn?.("voiceOutboundQueue.voice_calls_write_failed", {
          id: doc.id,
          error: String(e),
        });
      }

      await doc.ref.update({
        status: "processed",
        callSid: callSid || null,
        processedAt: FieldValue.serverTimestamp(),
      });
      processed++;
    } catch (e) {
      logger.error("voiceOutboundQueue.item_error", {
        id: doc.id,
        error: String(e),
      });
      try {
        await doc.ref.update({
          status: "error",
          error: String(e),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch {}
    }
  }

  logger.info("voiceOutboundQueue complete", { processed });
  return { processed };
}

export const processVoiceOutboundQueue = scheduler.onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Etc/UTC",
    region: "australia-southeast1",
    // Ensure Twilio env and PUBLIC_BASE_URL are mounted in runtime
    secrets: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_FROM_NUMBER",
      "PUBLIC_BASE_URL",
      "TWILIO_TEST_MODE",
    ],
  },
  async () => {
    await processVoiceOutboundQueueTick();
  }
);
