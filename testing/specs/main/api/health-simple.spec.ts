import { test, expect } from "@playwright/test";

// Verifies the lightweight simple health probe responds quickly and reports adminInitialized flag.

test.describe("Simple Health Probe", () => {
  test("returns ok, version/buildSha and increasing uptime", async ({
    request,
  }) => {
    const res1 = await request.get("/api/health/simple");
    expect(res1.ok()).toBeTruthy();
    const j1 = await res1.json();
    expect(j1).toMatchObject({ ok: true });
    expect(typeof j1.adminInitialized).toBe("boolean");
    expect(typeof j1.version).toBe("string");
    expect(typeof j1.buildSha).toBe("string");
    expect(typeof j1.uptimeMs).toBe("number");
    const uptime1 = j1.uptimeMs;
    // brief delay then second probe
    await new Promise((r) => setTimeout(r, 50));
    const res2 = await request.get("/api/health/simple");
    expect(res2.ok()).toBeTruthy();
    const j2 = await res2.json();
    expect(j2.uptimeMs).toBeGreaterThanOrEqual(uptime1);
  });
});
