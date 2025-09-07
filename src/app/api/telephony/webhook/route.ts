import { getLogger } from "@/lib/logging/app-logger";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Basic Twilio webhook with optional signature check.
// Expects application/x-www-form-urlencoded payload from Twilio.
// To keep Next.js simple here, we rely on Twilio's test mode or network scoping in dev.

async function validateTwilioSignature(
  req: NextRequest,
  params: Record<string, string | undefined>
): Promise<boolean> {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers.get("x-twilio-signature");
    const isProd = process.env.NODE_ENV === "production";
    const testBypass = process.env.TWILIO_TEST_MODE === "1";
    // In production, never bypass signature validation
    if (!isProd && testBypass) return true; // test mode bypass for CI in non-production
    if (!authToken || !signature) return false; // strict in non-test
    const twilioMod = await import("twilio");
    const validateRequest = (
      twilioMod as unknown as {
        validateRequest: (
          authToken: string,
          signature: string,
          url: string,
          params: Record<string, string | undefined>
        ) => boolean;
      }
    ).validateRequest;
    const url = req.url; // full URL used by Twilio
    return validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const logger = getLogger("api.telephony.webhook");

  try {
    // Perform signature validation (strict in non-test env)
    // Build params map for validator (form values)
    const validatorParams: Record<string, string | undefined> = {};
    // content-type is not yet parsed here; we validate after parse below, but accept early for JSON tests
    // We'll parse body first below and then validate once more when possible.
    if (!(await validateTwilioSignature(req, validatorParams))) {
      return NextResponse.json({ error: "signature_invalid" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, string | undefined> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      params.forEach((v, k) => (data[k] = v));
      // Re-run validation with real params when configured
      if (!(await validateTwilioSignature(req, data))) {
        return NextResponse.json(
          { error: "signature_invalid" },
          { status: 403 }
        );
      }
    } else {
      // Twilio sends form-encoded; but accept JSON for tests
      data = (await req.json().catch(() => ({}))) as Record<
        string,
        string | undefined
      >;
    }

    const event = {
      CallSid: data["CallSid"],
      CallStatus: data["CallStatus"],
      From: data["From"],
      To: data["To"],
      Direction: data["Direction"],
      EventType: data["StatusCallbackEvent"],
    };

    logger.info("twilio_webhook_event", event);

    // If this is an inbound call with no instructions, respond with a simple TwiML to say hello.
    const isInbound =
      event.Direction === "inbound" || event.EventType === "incomingcall";
    if (isInbound) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">Thanks for calling RankPilot. This line is active.</Say>\n  <Pause length="1"/>\n  <Hangup/>\n</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // For status callbacks, ack with 200 JSON
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("twilio_webhook_error", { error: msg });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
