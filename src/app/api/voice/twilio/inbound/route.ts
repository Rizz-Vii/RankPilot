import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Incoming call webhook from Twilio - respond with basic TwiML and record
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const payload = form
      ? Object.fromEntries(form.entries())
      : await req.json().catch(() => ({}));
    const from = String(payload.From || payload.from || "");
    const to = String(payload.To || payload.to || "");
    const callSid = String(payload.CallSid || payload.callSid || "");

    try {
      const admin = await import("../../../../../lib/firebase-admin");
      type AdminCollection = {
        doc: (id: string) => {
          set: (data: unknown, opts?: { merge?: boolean }) => Promise<void>;
        };
      };
      type AdminDb = { collection: (name: string) => AdminCollection };
      const adminDb = (admin as { adminDb?: unknown })?.adminDb as
        | AdminDb
        | undefined;
      if (adminDb && callSid) {
        await adminDb
          .collection("voice_calls")
          .doc(callSid)
          .set(
            {
              callSid,
              direction: "inbound",
              from,
              to,
              status: "ringing",
              receivedAt: new Date().toISOString(),
              raw: payload || null,
            },
            { merge: true }
          );
      }
    } catch {
      /* ignore */
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">Thank you for calling RankPilot. Please check your email for appointment details. Goodbye.</Say>\n  <Hangup />\n</Response>`;
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
