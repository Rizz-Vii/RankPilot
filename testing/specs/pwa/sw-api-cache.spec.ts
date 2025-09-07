import { expect, test } from "@playwright/test";

// This test assumes PWA is enabled in production-like mode. It validates that
// the service worker never stores /api responses in Cache Storage.
test("service worker does not cache /api responses", async ({
  page,
  context,
}) => {
  // Enable service worker for the context
  await context.route("**/api/health", (route) => route.continue());
  await page.goto("/");

  // Hit an API route
  const res = await page.request.get("/api/health");
  expect(res.status()).toBeGreaterThanOrEqual(200);

  // Evaluate within the page context whether Cache Storage has any /api entries
  const hasApiCache = await page.evaluate(async () => {
    if (!("caches" in window)) return false;
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      if (reqs.some((r) => new URL(r.url).pathname.startsWith("/api/")))
        return true;
    }
    return false;
  });

  expect(hasApiCache).toBeFalsy();
});
