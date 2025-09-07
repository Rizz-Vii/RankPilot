import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLogger } from "../../../../lib/logging/app-logger";
// import { db } from '../../../lib/firebase'; // uncomment when implementing persistence
// import { db } from '../../../lib/firebase'; // uncomment when implementing persistence

const logger = getLogger("api.voice.inbound");

export async function POST(req: NextRequest) {
  try {
    const probe = req.headers.get("x-probe-token");
    const body = await req.json().catch(() => ({}));

    logger.info("voice.inbound.received", {
      probe: !!probe,
      event: body?.event || "unknown",
    });

    // Quick probe - used by crawlers/tests to validate route exists
    if (probe && probe === process.env.CRAWL_PROBE_TOKEN) {
      return NextResponse.json({ ok: true, probe: true });
    }

    // If action provided, try to handle via agent tools (hold/create flows)
    const action = body?.action;
    if (action) {
      try {
        // lazy load tools to avoid import-time DB/admin requirements
        const tools = await import("../../../../lib/voice/agent-tools");

        if (action === "hold") {
          const slotId = body?.slotId;
          const duration = body?.duration || 5 * 60; // seconds
          const ttlMs =
            typeof duration === "number" ? duration * 1000 : 5 * 60 * 1000;
          const hold = await tools.holdSlot({ slotId, ttlMs });
          return NextResponse.json(
            { ok: !!hold?.ok, hold },
            { status: hold?.ok ? 200 : 400 }
          );
        }

        if (action === "create") {
          const holdId = body?.holdId;
          const payload = body?.payload || {};

          // Basic validation
          if (!payload || (!payload.start && !payload.serviceId)) {
            return NextResponse.json(
              {
                ok: false,
                error: "invalid_payload",
                reason: "missing start or serviceId",
              },
              { status: 400 }
            );
          }

          // Merge top-level customer fields if provided
          if (body?.customer)
            payload.customer = {
              ...(payload.customer || {}),
              ...(body.customer || {}),
            };

          const appt = await tools.createAppointment({
            ...(payload || {}),
            holdId,
          });
          if (appt?.ok) {
            // return appointment id and basic metadata
            return NextResponse.json(
              {
                ok: true,
                apptId: appt.apptId,
                createdAt: new Date().toISOString(),
              },
              { status: 200 }
            );
          }
          return NextResponse.json(
            { ok: false, error: appt?.error || "failed" },
            { status: 400 }
          );
        }
      } catch (e) {
        logger.error("voice.inbound.handler_error", { error: String(e) });
        return NextResponse.json(
          { ok: false, error: "handler_error" },
          { status: 500 }
        );
      }
    }

    // Minimal ack for non-action events - include ok:true so automated probes/tests can assert on it
    return NextResponse.json({ ok: true, status: "accepted" }, { status: 200 });
  } catch (err) {
    logger.error("voice.inbound.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
