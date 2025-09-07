import { NextResponse } from "next/server";
import { getActiveListenerSummary } from "@/lib/firebase/write-guard";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }
  return NextResponse.json({
    ts: new Date().toISOString(),
    listeners: getActiveListenerSummary(),
  });
}
