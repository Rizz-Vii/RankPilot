import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Returns the accepted payload schema for /api/voice/outbound to help UI builders.
export async function GET() {
  return NextResponse.json({
    fields: {
      phone: "string (E.164). Optional if phones[] provided",
      phones:
        "string[] (E.164). Optional; if present, places one call per number",
      pitch: "string. Outreach script / message to speak",
      schedule: "ISO timestamp. Required",
      serviceId: "string. Optional; default voice-demo",
      voice:
        "string. Twilio Say voice (e.g., alice, man, woman, Polly.*). Default env TWILIO_SAY_VOICE or alice",
      language:
        "string. BCP-47 language code (e.g., en-US). Default env TWILIO_SAY_LANGUAGE or en-US",
      rate: "number. 0.5 - 2.0 speaking rate (1=normal). Default env TWILIO_SAY_RATE or 1",
      from: "string. E.164 caller ID override; must be in TWILIO_FROM_NUMBERS if set",
      recordingUrl:
        "string URL. Optional; if provided, plays this audio instead of synthesized speech",
      repeat:
        "'daily' | 'weekly'. Optional; if set, schedule will be treated as the first occurrence",
    },
  });
}
