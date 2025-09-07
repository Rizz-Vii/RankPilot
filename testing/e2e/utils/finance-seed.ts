import type { APIRequestContext } from "@playwright/test";

/**
 * Seeds a deterministic window of finance invoices for a given test user so aggregation math is assertable.
 * Creates paid invoices for three prior periods plus a draft unpaid invoice for current period.
 */
export async function seedDeterministicFinance(
  request: APIRequestContext,
  email: string
) {
  const now = new Date();
  const periods: string[] = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );
    periods.push(d.toISOString().slice(0, 7));
  }
  // Use stable amounts (increasing) so delta % can be predicted
  const base = 100;
  for (let idx = 0; idx < periods.length; idx++) {
    const p = periods[idx];
    const amount = base * (idx + 1);
    await request
      .post(
        `/api/test/finance/seed-invoice?testUser=${encodeURIComponent(email)}&amount=${amount}&status=paid&period=${p}`
      )
      .catch(() => null);
  }
  // Current period draft outstanding invoice
  const currentPeriod = now.toISOString().slice(0, 7);
  await request
    .post(
      `/api/test/finance/seed-invoice?testUser=${encodeURIComponent(email)}&amount=75&status=draft&period=${currentPeriod}`
    )
    .catch(() => null);
  return { periods, currentPeriod };
}

/**
 * Persist AI visibility baseline to disk (in-memory object returned for immediate assertions).
 */
export async function captureAiVisibilityBaseline(request: APIRequestContext) {
  const body = {
    url: "https://example.com",
    query: "seo optimization",
    analysisType: "quick",
  };
  const resp = await request.post("/api/neuroseo/ai-visibility", {
    data: body,
  });
  if (!resp.ok()) return null;
  const json = await resp.json();
  return json;
}

/**
 * Expanded BI latency seeding with diverse routes to enrich sampler tables.
 */
export async function seedExtendedBiLatency(request: APIRequestContext) {
  const core = [
    "/api/bi/snapshot",
    "/api/bi/snapshot?route=/api/finance/metrics",
  ];
  const extras = [
    "/api/bi/snapshot?route=/api/neuroseo/ai-visibility",
    "/api/bi/snapshot?route=/api/finance/metrics&advisory=1",
  ];
  const targets = [...core, ...extras];
  for (let i = 0; i < 2; i++) {
    for (const t of targets) {
      await request.get(t).catch(() => null);
    }
  }
}
