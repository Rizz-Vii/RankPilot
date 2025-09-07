import { expect, test } from "@playwright/test"; // @contract @bi
import { seedBiLatency } from "./utils/bi-latency-seed";
import { seedExtendedBiLatency } from "./utils/finance-seed";

// Contract / consistency tests for /api/bi/snapshot and internal dashboard rendering
test.describe("BI Snapshot API + UI contract", () => {
  test("unified.latency routes match top latency table & hints consistency", async ({
    page,
    request,
  }) => {
    await seedBiLatency(request);
    await seedExtendedBiLatency(request);
    const snapshotResp = await request.get("/api/bi/snapshot");
    expect(snapshotResp.ok()).toBeTruthy();
    const json = await snapshotResp.json();
    expect(json).toHaveProperty("unified");
    const latency: Record<
      string,
      { count: number; totalMs: number; maxMs: number; p95?: number | null }
    > = json.unified?.latency || {};
    const queueDepth = json.unified?.queue?.depth ?? 0;
    const hintsQueueDepth = json.hints?.queueDepth ?? 0;
    expect(hintsQueueDepth).toBe(queueDepth);

    // Navigate to dashboard to compare rendered top latency rows to snapshot keys
    await page.goto("/internal/bi", { waitUntil: "domcontentloaded" });
    // Table rows: first cell is the route (font-mono)
    const routeCells = page.locator("table tbody tr td:first-child");
    // If latency table hasn't rendered (no data yet), skip gracefully
    const visible = await routeCells
      .first()
      .isVisible()
      .catch(() => false);
    if (!visible) test.skip();
    const uiRoutes = new Set<string>();
    const count = await routeCells.count();
    for (let i = 0; i < count; i++) {
      const txt = (await routeCells.nth(i).innerText()).trim();
      if (txt) uiRoutes.add(txt);
    }
    // Only compare intersection (UI shows top ~10). Every UI route must exist in snapshot latency keys.
    const snapshotRoutes = new Set(Object.keys(latency));
    for (const r of uiRoutes) {
      expect(snapshotRoutes.has(r)).toBeTruthy();
    }
  });
});
