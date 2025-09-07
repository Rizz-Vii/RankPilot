import { expect, test } from "@playwright/test";

test.describe("Voice inbound happy path (skeleton)", () => {
  test("accepts inbound webhook probe", async ({ request }) => {
    const base = process.env.TEST_BASE_URL || "http://localhost:3000";
    const probeToken = process.env.CRAWL_PROBE_TOKEN || "probe-token";

    const resp = await request.post(`${base}/api/voice/inbound`, {
      headers: {
        "x-probe-token": probeToken,
        "content-type": "application/json",
      },
      timeout: 20000,
      data: { event: "probe" },
    });

    expect(resp.ok()).toBeTruthy();
    const j = await resp.json();
    expect(j).toHaveProperty("ok");
  });
});
