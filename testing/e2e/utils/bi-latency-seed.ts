import type { APIRequestContext } from "@playwright/test";

// Triggers several routes to populate unified latency sampler before contract tests run.
export async function seedBiLatency(request: APIRequestContext) {
  const targets = [
    "/api/bi/snapshot",
    "/api/bi/snapshot?route=/api/finance/metrics",
  ];
  for (let i = 0; i < 3; i++) {
    for (const t of targets) {
      await request.get(t).catch(() => null);
    }
  }
}
