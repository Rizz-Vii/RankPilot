import {
  getTwilioFromNumber,
  getTwilioFromNumbersList,
} from "@/lib/telephony/twilio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const allowed = getTwilioFromNumbersList();
  const def = getTwilioFromNumber();
  return NextResponse.json({
    ok: true,
    defaultFrom: def || null,
    allowed: allowed.length ? allowed : def ? [def] : [],
  });
}
