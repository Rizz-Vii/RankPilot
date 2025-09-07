import fs from "fs";
import path from "path";
export function persistMetricsSnapshot(): {
  ok: boolean;
  path?: string;
  error?: string;
} {
  try {
    const snapshot = getNeuroseoMetricsSnapshot();
    const line = JSON.stringify({ ts: Date.now(), ...snapshot });
    const file = path.join(process.cwd(), "metrics-snapshots.log");
    fs.appendFileSync(file, line + "\n");
    return { ok: true, path: file };
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: unknown }).message)
        : "persist_failed";
    return { ok: false, error: message };
  }
}
/**
 * NeuroSEO Unified Metrics Registry (NEU-03)
 * Centralizes counters shared by live exec + streaming paths.
 * In-memory only until OBS-01 promotes to persistent/exported backend.
 */
export interface NeuroseoMetricsSnapshot {
  analysisRuns: number; // completed live (non-cache) executions
  analysisCacheHits: number; // served from in-memory cache (live or stream)
  guardStrips: number; // protective guard conditions triggered (validation/size/etc.)
  workflowRuns: number; // end-to-end workflow (analysis) executions attempted
  workflowFailures: number; // workflow attempts resulting in failure or synthetic fallback
  stripeWebhookErrors: number; // stripe webhook processing failures (placeholder for OBS-01)
}

const counters: NeuroseoMetricsSnapshot = {
  analysisRuns: 0,
  analysisCacheHits: 0,
  guardStrips: 0,
  workflowRuns: 0,
  workflowFailures: 0,
  stripeWebhookErrors: 0,
};

export function recordAnalysisRun() {
  counters.analysisRuns += 1;
}
export function recordCacheHit() {
  counters.analysisCacheHits += 1;
}
export function recordGuardStrip() {
  counters.guardStrips += 1;
}
export function recordWorkflowRun() {
  counters.workflowRuns += 1;
}
export function recordWorkflowFailure() {
  counters.workflowFailures += 1;
}
export function recordStripeWebhookError() {
  counters.stripeWebhookErrors += 1;
}
export function getNeuroseoMetricsSnapshot(): NeuroseoMetricsSnapshot {
  return { ...counters };
}

// Backwards compatibility re-export (legacy getter naming in some routes/tests)
export const getNeuroMetrics = getNeuroseoMetricsSnapshot;
