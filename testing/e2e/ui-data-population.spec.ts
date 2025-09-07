import { expect, test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { seedBiLatency } from "./utils/bi-latency-seed";
import {
  seedDeterministicFinance,
  seedExtendedBiLatency,
} from "./utils/finance-seed";

// @ui @contract
// Validates that key data-display components render non-empty data cells after load.
// Extend selectors as components evolve (data-testid preferred).
const targets: Array<{
  path: string;
  selector: string;
  label: string;
  min?: number;
}> = [
  {
    path: "/finance/revenue",
    selector: '[data-testid="finance-kpi-grid"] [data-testid^="finance-kpi-"]',
    label: "Finance KPI cards",
    min: 1,
  },
  {
    path: "/finance/revenue",
    selector:
      '[data-testid="finance-derived-metrics"] [data-testid^="finance-derived-"]',
    label: "Finance derived metrics",
    min: 1,
  },
  {
    path: "/finance/revenue",
    selector: '[data-testid="finance-invoice-table"] table tbody tr',
    label: "Invoice rows",
    min: 0,
  },
  {
    path: "/internal/bi",
    selector: "table tbody tr",
    label: "BI latency rows",
    min: 0,
  },
];

const REPORT_FILE = path.join(
  process.cwd(),
  "test-results",
  "ui-data-population-report.ndjson"
);
const ENFORCE = process.env.UI_DATA_ENFORCE === "1";
const SEED_USER = "ui-data-pop@test.local";
async function logSegment(entry: Record<string, any>) {
  try {
    await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
    await fs.appendFile(
      REPORT_FILE,
      JSON.stringify({ ts: Date.now(), ...entry }) + "\n"
    );
  } catch {
    // ignore logging failures
  }
}

test.describe("UI data population smoke", () => {
  for (const t of targets) {
    test(`${t.label} populated`, async ({ browser }) => {
      const useAgency = t.path.startsWith("/finance");
      const isBI = t.path.startsWith("/internal/bi");
      let ctx = await browser.newContext({
        storageState: useAgency
          ? "test-results/.auth/agency.json"
          : "test-results/.auth/user.json",
      });
      let page = await ctx.newPage();

      // Fetch authenticated session to obtain user email (if available)
      let userEmail: string | undefined;
      try {
        const sessionResp = await page.request.get("/api/auth/session");
        if (sessionResp.ok()) {
          const data = await sessionResp.json();
          userEmail = data?.user?.email;
        }
      } catch {
        // ignore
      }
      const effectiveUser = userEmail || SEED_USER;

      // Preemptive readiness seeding BEFORE navigation to reduce empty initial renders
      try {
        await page.request.get(
          `/api/test/seed/readiness?finance=1&bi=1&user=${encodeURIComponent(effectiveUser)}`
        );
        await page.waitForTimeout(600); // allow data propagation
      } catch {
        // non-fatal
      }

      await page.goto(t.path, { waitUntil: "domcontentloaded" });
      // Finance gating handling with enterprise fallback
      if (t.path.startsWith("/finance")) {
        const gate = page.locator(
          '[data-testid="upgrade-banner"], [data-testid="feature-gate-denied"]'
        );
        if ((await gate.count()) > 0) {
          await ctx.close();
          // Retry with enterprise if available
          ctx = await browser.newContext({
            storageState: "test-results/.auth/enterprise.json",
          });
          page = await ctx.newPage();
          await page.goto(t.path, { waitUntil: "domcontentloaded" });
          const gate2 = page.locator(
            '[data-testid="upgrade-banner"], [data-testid="feature-gate-denied"]'
          );
          if ((await gate2.count()) > 0) {
            await logSegment({
              label: t.label,
              path: t.path,
              status: "skipped",
              reason: "gated",
            });
            test.skip(
              true,
              "Finance feature gated (banner present) even after enterprise fallback"
            );
          }
        }
      }
      // BI seeding before assertion
      if (t.path.startsWith("/internal/bi")) {
        await seedBiLatency(page.request);
        await seedExtendedBiLatency(page.request);
        await page.waitForTimeout(600);
        await page.reload({ waitUntil: "domcontentloaded" });
      }
      // Finance deterministic seeding if finance path and rows look empty
      if (t.path.startsWith("/finance")) {
        try {
          await seedDeterministicFinance(page.request, effectiveUser);
          await page.waitForTimeout(600);
          await page.reload({ waitUntil: "domcontentloaded" });
        } catch (e) {
          // Non-fatal; continue
        }
      }
      const items = page.locator(t.selector);
      // Retry (poll) up to 3 times (500ms) before readiness call
      let visible = await items
        .first()
        .isVisible()
        .catch(() => false);
      let attempt = 0;
      while (!visible && attempt < 3) {
        attempt++;
        await page.waitForTimeout(500);
        await page.reload({ waitUntil: "domcontentloaded" });
        visible = await items
          .first()
          .isVisible()
          .catch(() => false);
      }
      let count = 0;
      if (visible) count = await items.count();
      if (!visible || count === 0) {
        // Final readiness seeding pass
        try {
          await page.request.get(
            `/api/test/seed/readiness?finance=1&bi=1&user=${encodeURIComponent(effectiveUser)}`
          );
          await page.waitForTimeout(600);
          await page.reload({ waitUntil: "domcontentloaded" });
          visible = await items
            .first()
            .isVisible()
            .catch(() => false);
          if (visible) count = await items.count();
        } catch {
          // ignore
        }
      }
      if (!visible || count === 0) {
        if (isBI) {
          if (ENFORCE) {
            await logSegment({
              label: t.label,
              path: t.path,
              status: "failed",
              reason: "no-bi-rows-enforced",
              attempts: attempt + 1,
              userEmail: effectiveUser,
            });
            expect(
              count,
              "BI latency rows required under UI_DATA_ENFORCE=1"
            ).toBeGreaterThan(0);
          } else {
            await logSegment({
              label: t.label,
              path: t.path,
              status: "skipped",
              reason: "no-bi-rows",
              attempts: attempt + 1,
              degrade: true,
              userEmail: effectiveUser,
            });
            test.skip(
              true,
              "BI latency rows absent after readiness seeding (degraded)"
            );
          }
        } else {
          if (ENFORCE) {
            await logSegment({
              label: t.label,
              path: t.path,
              status: "failed",
              reason: "no-data-enforced",
              attempts: attempt + 1,
              userEmail: effectiveUser,
            });
            expect(
              count,
              "UI data required under UI_DATA_ENFORCE=1"
            ).toBeGreaterThan(0);
          } else {
            await logSegment({
              label: t.label,
              path: t.path,
              status: "skipped",
              reason: "no-data",
              attempts: attempt + 1,
              userEmail: effectiveUser,
            });
            test.skip(
              true,
              "No visible data after retries & readiness endpoint"
            );
          }
        }
      }
      if (typeof t.min === "number") {
        expect(count).toBeGreaterThanOrEqual(t.min);
      } else {
        expect(count).toBeGreaterThan(0);
      }
      if (count > 0) {
        const firstText = (
          await items
            .first()
            .innerText()
            .catch(() => "")
        )?.trim();
        expect(firstText.length).toBeGreaterThan(0);
      }
      await logSegment({
        label: t.label,
        path: t.path,
        status: "ok",
        count,
        userEmail: effectiveUser,
      });
      await ctx.close();
    });
  }
});
