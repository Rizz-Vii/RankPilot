import { getLogger } from "@/lib/logging/app-logger";
import { getTwilioClient, getTwilioFromNumber } from "@/lib/telephony/twilio";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Contract
// POST /api/telephony/call { to: string, twimlUrl?: string, testMode?: boolean }
// - to: E.164 or local number (Twilio will normalize); required
// - twimlUrl: optional URL to TwiML instructions for the call
// - testMode: when true, no real call is placed; returns a stub
// Response: { callSid: string, test: boolean }

export async function POST(req: NextRequest) {
  const logger = getLogger("api.telephony.call");
  try {
    const body = await req.json().catch(() => ({}));
    const to: string | undefined = body?.to;
    const twimlUrl: string | undefined = body?.twimlUrl;
    const testMode: boolean = Boolean(
      body?.testMode || process.env.TWILIO_TEST_MODE === "1"
    );

    if (!to) {
      logger.warn("missing to number");
      return NextResponse.json({ error: "to_required" }, { status: 400 });
    }

    const from = getTwilioFromNumber();
    const client = getTwilioClient();

    if (testMode) {
      const fakeSid = `CA_TEST_${Date.now()}`;
      logger.info("telephony call simulated", {
        to,
        from,
        twimlUrl,
        testMode: true,
        callSid: fakeSid,
      });
      return NextResponse.json({ callSid: fakeSid, test: true });
    }

    if (!client || !from) {
      logger.error("twilio_not_configured", {
        hasClient: Boolean(client),
        hasFrom: Boolean(from),
      });
      return NextResponse.json(
        { error: "telephony_unavailable" },
        { status: 500 }
      );
    }

    // Twilio types available at runtime via SDK; keep minimal typing to avoid SDK coupling here
    const params: { to: string; from: string; url?: string } = { to, from };
    if (twimlUrl) params.url = twimlUrl;
    else if (process.env.TWILIO_DEFAULT_TWIML_URL)
      params.url = process.env.TWILIO_DEFAULT_TWIML_URL;

    const call = await client.calls.create(params);
    logger.info("telephony call initiated", {
      to,
      from,
      callSid: call.sid,
      status: call.status,
    });
    return NextResponse.json({ callSid: call.sid, test: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    getLogger("api.telephony.call").error("telephony_call_failed", {
      error: msg,
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
