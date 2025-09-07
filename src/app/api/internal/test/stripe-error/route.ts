import { enforceProvenance } from "@/lib/middleware/provenance";
import { recordStripeWebhookError } from "@/lib/neuroseo/metrics-registry";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  recordStripeWebhookError();
  return NextResponse.json(
    enforceProvenance(
      { ok: true, injected: true },
      { path: "internal/test/stripe-error" }
    )
  );
}
export async function GET() {
  recordStripeWebhookError();
  return NextResponse.json(
    enforceProvenance(
      { ok: true, injected: true },
      { path: "internal/test/stripe-error" }
    )
  );
}
