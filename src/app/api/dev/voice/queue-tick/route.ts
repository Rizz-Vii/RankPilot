import { adminDb } from "@/lib/firebase-admin";
import { getTwilioClient, getTwilioFromNumber } from "@/lib/telephony/twilio";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const probe = req.headers.get("x-probe-token");
    if (
      !probe ||
      probe !==
        (process.env.CRAWL_PROBE_TOKEN ||
          process.env.NEXT_PUBLIC_CRAWL_PROBE_TOKEN)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // Inline minimal processor for local dev
    const now = new Date();
    const snap = await adminDb
      .collection("voice_outbound_queue")
      .where("status", "==", "queued")
      .where("schedule", "<=", now)
      .orderBy("schedule", "asc")
      .limit(20)
      .get();
    if (snap.empty) return NextResponse.json({ ok: true, processed: 0 });

    const twilio = getTwilioClient();
    const defaultFrom = getTwilioFromNumber() || undefined;
    let processed = 0;

    function buildTwiml(opts: {
      sayText: string;
      voice: string;
      language: string;
      rate: number;
      recordingUrl?: string | null;
      interactive?: boolean;
    }) {
      const { sayText, voice, language, rate, recordingUrl, interactive } =
        opts;
      const prosodyOpen =
        rate && rate !== 1 ? `<prosody rate="${Math.round(rate * 100)}%">` : "";
      const prosodyClose = rate && rate !== 1 ? `</prosody>` : "";
      if (recordingUrl)
        return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Play>${recordingUrl}</Play>\n</Response>`;
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

    for (const doc of snap.docs) {
      const data = (doc.data() || {}) as {
        to?: string;
        from?: string | null;
        schedule?: unknown;
        config?: {
          voice?: string;
          language?: string;
          rate?: number;
          recordingUrl?: string | null;
          interactive?: boolean;
          script?: string | null;
        } | null;
      };
      const to = (data?.to || "").toString();
      const from = (data?.from || defaultFrom || "").toString();
      if (!to) {
        await doc.ref.update({ status: "skipped", reason: "missing_to" });
        continue;
      }
      await doc.ref.update({
        status: "processing",
        startedAt: new Date().toISOString(),
      });
      const voice =
        data?.config?.voice || process.env.TWILIO_SAY_VOICE || "alice";
      const language =
        data?.config?.language || process.env.TWILIO_SAY_LANGUAGE || "en-US";
      const rate = Number(
        data?.config?.rate || process.env.TWILIO_SAY_RATE || 1
      );
      const recordingUrl = data?.config?.recordingUrl || null;
      const interactive = Boolean(data?.config?.interactive);
      const script = data?.config?.script || "";
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
      if (twilio && from) {
        try {
          const call = await twilio.calls.create({
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
            ] as string[],
          } as Parameters<typeof twilio.calls.create>[0]);
          callSid = call?.sid || null;
          callStatus = call?.status || null;
        } catch {
          // degrade in dev
        }
      }
      try {
        const calls = adminDb.collection("voice_calls");
        const callDoc = {
          callSid: callSid || null,
          to,
          from: from || null,
          status: callStatus || "queued",
          direction: "outbound-queue-dev",
          createdAt: new Date().toISOString(),
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
        if (callSid) await calls.doc(callSid).set(callDoc);
        else await calls.add(callDoc);
      } catch {
        /* ignore in dev */
      }
      await doc.ref.update({
        status: "processed",
        callSid: callSid || null,
        processedAt: new Date().toISOString(),
      });
      processed++;
    }
    return NextResponse.json({ ok: true, processed });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
