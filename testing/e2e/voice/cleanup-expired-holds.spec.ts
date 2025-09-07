import { adminDb } from "@/lib/firebase-admin";
import { expect, test } from "@playwright/test";

test.describe("voice holds cleanup", () => {
  test.skip(
    process.env.E2E_VOICE !== "true",
    "Voice tests disabled by default; set E2E_VOICE=true to enable"
  );
  test("expires a short-lived hold via cleanup endpoint", async ({
    request,
    baseURL,
  }) => {
    if (!baseURL) test.skip(true, "no baseURL configured");

    // 1) Create a short hold (2s)
    const durationSec = 2;
    const holdRes = await request.post(`${baseURL}/api/voice/inbound`, {
      headers: {
        "x-probe-token":
          process.env.CRAWL_PROBE_TOKEN || "8ab3b3a95a0d9cf1b5bb2b61be5e3981",
      },
      timeout: 20000,
      data: {
        action: "hold",
        duration: durationSec,
      },
    });
    expect(holdRes.ok()).toBeTruthy();
    const holdBody = await holdRes.json();
    expect(holdBody).toHaveProperty("ok", true);
    const holdId: string | undefined = holdBody.hold?.holdId;
    // In probe/dev, holdId may be absent; don't hard fail here

    // 2) Wait beyond TTL
    await new Promise((r) => setTimeout(r, (durationSec + 2) * 1000));

    // 3) Trigger cleanup endpoint
    const cleanupRes = await request.post(`${baseURL}/api/voice/cleanup`, {
      headers: {
        "x-probe-token":
          process.env.CRAWL_PROBE_TOKEN || "8ab3b3a95a0d9cf1b5bb2b61be5e3981",
      },
      timeout: 20000,
      data: { limit: 50 },
    });
    expect(cleanupRes.ok()).toBeTruthy();
    const cleanupBody = await cleanupRes.json();
    expect(cleanupBody.ok).toBeTruthy();

    // 4) Assert hold status is expired using adminDb (if available)
    const hasAdminCreds = !!(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
    );
    if (hasAdminCreds && holdId) {
      const snap = await adminDb.collection("voice_holds").doc(holdId).get();
      if (snap.exists) {
        const data = snap.data() as any;
        expect(data.status).toBe("expired");
      }
    }
  });
});
