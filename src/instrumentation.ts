// Next.js instrumentation entry – runs on the server during startup and edge runtime initialization.
// Use this to initialize logging/observability before any routes.

// Ensure Sentry server config initializes first (noop if DSN unset)
import "../sentry.server.config";
import { installNodeCrashGuard } from "./lib/observability/node-crash-guard";

export async function register() {
  // Install process-level crash guard once
  installNodeCrashGuard();
}
