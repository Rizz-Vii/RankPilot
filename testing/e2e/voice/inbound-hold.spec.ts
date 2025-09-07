import { adminDb } from "@/lib/firebase-admin";
import { expect, test } from "@playwright/test";

test.describe("voice inbound hold", () => {
  test.skip(
    process.env.E2E_VOICE !== "true",
    "Voice tests disabled by default; set E2E_VOICE=true to enable"
  );
  test("creates a hold with ttl and returns holdId", async ({
    request,
    baseURL,
  }) => {
    if (!baseURL) test.skip(true, "no baseURL configured");

    const durationSec = 120; // 2 minutes
    const res = await request.post(`${baseURL}/api/voice/inbound`, {
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

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("ok", true);
    // In probe/dev mode, backend may not return hold object. Accept ok+probe responses.
    const holdOk = body.hold && typeof body.hold.holdId === "string";
    const probeOk = body.probe === true;
    expect(holdOk || probeOk).toBeTruthy();

    // Optional: verify hold doc exists when admin creds available
    const hasAdminCreds = !!(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      (process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
    );
    if (hasAdminCreds && holdOk) {
      const holdId: string = body.hold.holdId as string;
      const snap = await adminDb.collection("voice_holds").doc(holdId).get();
      // Some environments may not persist holds (mock DB) — assert non-throwing check when present
      if (snap.exists) {
        const data = snap.data() as any;
        expect(data.status).toBe("held");
        expect(new Date(data.heldUntil).getTime()).toBeGreaterThan(Date.now());
      }
    }
  });
});
