import { NextResponse } from "next/server";
import { enforceProvenance } from "@/lib/middleware/provenance";

// DEPRECATED: Manual trigger removed in favor of Cloud Scheduler (functions.runDueAutomationScheduler).
// Returns 410 Gone to indicate clients should stop calling this endpoint.
export async function POST() {
  return NextResponse.json(
    enforceProvenance(
      {
        success: false,
        error:
          "Deprecated endpoint. Automated scheduling now handled server-side.",
        action: "use scheduled function runDueAutomationScheduler",
        provenance: "synthetic",
      },
      { path: "automation/run-due", note: "deprecated" }
    ),
    { status: 410 }
  );
}
