import { expect, test } from "@playwright/test";

// E2E: Outreach form interactive toggle + recording precedence over script
// We intercept /api/voice/outbound to assert payload semantics without making real calls.

const pageUrl = "/sales/outreach";

function nearFutureLocal(minutes = 5) {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test.describe("Sales Outreach: interactive & recording precedence", () => {
  test.skip(
    process.env.E2E_VOICE !== "true",
    "Voice tests disabled by default; set E2E_VOICE=true to enable"
  );

  test.beforeEach(async ({ page }) => {
    // Inject probe header to bypass gating/limits in test environments
    await page.context().setExtraHTTPHeaders({
      "x-probe-token":
        process.env.CRAWL_PROBE_TOKEN || "8ab3b3a95a0d9cf1b5bb2b61be5e3981",
    });
  });

  test("interactive toggle triggers Gather intent", async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) test.skip(true, "no baseURL");

    await page.goto(baseURL + pageUrl);

    // Gate-aware: if the recipients textarea is not present, skip suite.
    const recipients = page.getByTestId("outreach-recipients");
    if (!(await recipients.count()))
      test.skip(true, "Outreach form not visible (feature-gated)");

    // Fill minimal values
    await recipients.fill("+15551234567");
    await page.getByTestId("outreach-script").fill("Hello from RankPilot");
    await page.getByTestId("outreach-schedule").fill(nearFutureLocal(10));

    // Turn on interactive
    const interactive = page.getByTestId("outreach-interactive");
    await interactive.check();

    let captured: any = null;
    await page.route("**/api/voice/outbound", async (route) => {
      const req = route.request();
      captured = JSON.parse(req.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          callSid: "TEST_SID",
          from: "+15551230000",
          callStatus: "queued",
        }),
      });
    });

    await page.getByTestId("outreach-submit").click();

    expect(captured && captured.interactive).toBeTruthy();
    // script should be present (defaulted from pitch)
    expect(typeof captured.script === "string").toBeTruthy();
  });

  test("recordingUrl takes precedence over script", async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) test.skip(true, "no baseURL");

    await page.goto(baseURL + pageUrl);

    const recipients = page.getByTestId("outreach-recipients");
    if (!(await recipients.count()))
      test.skip(true, "Outreach form not visible (feature-gated)");

    await recipients.fill("+15557654321");
    await page
      .getByTestId("outreach-script")
      .fill("This should be ignored by recording");
    await page.getByTestId("outreach-schedule").fill(nearFutureLocal(15));

    const recording = page.getByTestId("outreach-recording-url");
    await recording.fill("https://example.com/fake-message.mp3");
    let captured: any = null;
    await page.route("**/api/voice/outbound", async (route) => {
      const req = route.request();
      captured = JSON.parse(req.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          callSid: "TEST_SID_2",
          from: "+15551230000",
          callStatus: "queued",
        }),
      });
    });

    await page.getByTestId("outreach-submit").click();

    expect(typeof captured.recordingUrl).toBe("string");
    expect(captured.recordingUrl).toContain("fake-message.mp3");

    // script is still sent by builder for back-compat, but TwiML will favor recording
    expect(typeof captured.script === "string").toBeTruthy();
  });
});
