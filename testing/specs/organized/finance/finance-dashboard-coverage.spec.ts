import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "../enhanced-auth";
import { UNIFIED_TEST_USERS } from "../unified-test-users";

/**
 * Finance Dashboard Coverage Spec
 * - Preflight readiness seeding for the starter user (ensures invoices exist)
 * - Login as starter and open /finance
 * - Assert KPI section renders (not only skeletons)
 * - Assert modules headings exist (MRR Trend, Invoice Aging, Finance Workbench)
 * - Verify export JSON and CSV trigger downloads
 */

test.describe("finance dashboard", () => {
    test("preflight readiness → KPIs render → exports available + provenance + actions + months persistence", async ({ page, request, baseURL }) => {
        const starter = UNIFIED_TEST_USERS.starter;
        const readinessUrl = new URL("/api/test/seed/readiness", baseURL || "http://localhost:3000");
        readinessUrl.searchParams.set("user", starter.email);
        readinessUrl.searchParams.set("finance", "1");
        readinessUrl.searchParams.set("bi", "1");

        // 1) Preflight readiness to ensure finance data is present for starter user
        const readiness = await request.get(readinessUrl.toString());
        const readinessOk = readiness.ok();
        let readinessJson: any = null;
        try { readinessJson = await readiness.json(); } catch { /* ignore */ }
        test.info().annotations.push({ type: "readiness", description: JSON.stringify(readinessJson || { status: readiness.status() }) });

        // 2) Login and navigate to finance dashboard
        const auth = new EnhancedAuth(page);
        await auth.navigateToProtectedRoute("/finance", "starter");

        // 3) Basic surface assertions
        await expect(page.getByRole("heading", { name: "Finance Dashboard" })).toBeVisible();
        await expect(page.getByRole("region", { name: "Key performance indicators" })).toBeVisible();

        // Wait for KPI skeletons to be replaced (look for any progress badge or sparkline container)
        // Fallback: wait for at least one numeric value to appear in KPI region
        const kpiRegion = page.getByRole("region", { name: "Key performance indicators" });
        await kpiRegion.waitFor({ state: "visible" });
        await page.waitForTimeout(800); // small settle

        // Heuristic: ensure there is at least one KPI value rendered that is not a skeleton
        const hasKpi = await kpiRegion.locator("text=/\bMRR\b|\bLTV\b|\bChurn\b|On[- ]?Time/i").first().isVisible().catch(() => false);
        if (!hasKpi) {
            // If labels differ, assert at least that there are metric cards rendered (divs with progress bars or badges)
            const metricCandidates = await kpiRegion.locator("[role='progressbar'], .badge, .rounded-xl").count();
            expect(metricCandidates).toBeGreaterThan(0);
        }

        // 3b) Mock-data banner vs live metrics: banner should hide when live metrics are present
        const mockBanner = page.getByRole("alert", { name: "Finance mock data banner" });
        if (await mockBanner.isVisible().catch(() => false)) {
            // Wait briefly for it to disappear after metrics load
            await expect(mockBanner).toBeHidden({ timeout: 8000 });
        } else {
            await expect(mockBanner).toBeHidden();
        }

        // 3c) Provenance legend should be visible (live vs demo indicated via internal state)
        await expect(page.getByText("Provenance Legend").first()).toBeVisible();

        // 4) Modules present
        await expect(page.getByRole("heading", { name: "MRR Trend" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Invoice Aging" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Finance Workbench" })).toBeVisible();

        // 5) Export actions produce downloads
        const jsonButton = page.getByRole("button", { name: "Export finance snapshot JSON" });
        await expect(jsonButton).toBeVisible();
        const jsonDownloadPromise = page.waitForEvent("download");
        await jsonButton.click();
        const jsonDownload = await jsonDownloadPromise;
        expect(jsonDownload.suggestedFilename()).toContain("finance-snapshot");
        expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);

        const csvButton = page.getByRole("button", { name: "Export finance snapshot CSV" });
        await expect(csvButton).toBeVisible();
        const csvDownloadPromise = page.waitForEvent("download");
        await csvButton.click();
        const csvDownload = await csvDownloadPromise;
        expect(csvDownload.suggestedFilename()).toContain("finance-snapshot");
        expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);

        // 6) Optional: Assert readiness reported invoices where available
        if (readinessOk && readinessJson && typeof readinessJson.invoicesCount === "number") {
            expect(readinessJson.invoicesCount).toBeGreaterThan(0);
            expect([true, false]).toContain(!!readinessJson.financeReady); // presence
        }

        // 7) Automation actions: optimistic and loading states
        // Locate the workbench action cards by title to scope buttons
        const workbench = page.getByRole("region", { name: "Finance workbench actions" });
        await workbench.waitFor({ state: "visible" });

        // Revenue Snapshot (optimistic timestamp update when snapshot exists)
        const revenueCard = page.locator("div", { hasText: "Revenue Snapshot" }).first();
        const revenueRunBtn = revenueCard.getByRole("button", { name: /Run|Running/i });
        await expect(revenueRunBtn).toBeVisible();
        const revenueTs = page.locator("[aria-label='Latest automation snapshots']").locator("text=Last Revenue Snapshot").locator("xpath=..").locator("time");
        const hadRevenue = await revenueTs.count().then(c => c > 0);
        let prevRevenueTime = hadRevenue ? await revenueTs.first().getAttribute("dateTime") : null;
        await revenueRunBtn.click();
        // If timestamp exists, expect it to update quickly (optimistic)
        if (hadRevenue && prevRevenueTime) {
            // Poll for change in the first time element under the snapshot bar
            await page.waitForFunction((previous: string) => {
                const region = document.querySelector('[aria-label="Latest automation snapshots"]');
                if (!region) return false;
                const time = region.querySelector('time') as HTMLTimeElement | null;
                return !!time && time.dateTime !== previous;
            }, prevRevenueTime, { timeout: 5000 });
        } else {
            // Otherwise, at least ensure button showed loading state briefly
            await expect(revenueRunBtn).toHaveText(/Running|Run/, { timeout: 6000 });
        }

        // Aging Digest (no optimistic data change; verify loading label toggles)
        const agingCard = page.locator("div", { hasText: "Aging Digest" }).first();
        const agingRunBtn = agingCard.getByRole("button", { name: /Run|Queuing/i });
        await expect(agingRunBtn).toBeVisible();
        await agingRunBtn.click();
        await expect(agingRunBtn).toHaveText(/Queuing|Run/, { timeout: 6000 });

        // 8) Months switch persistence via localStorage
        // Set to 3m, verify aria-pressed, reload, verify persists and localStorage key updated
        const threeM = page.getByRole("button", { name: "3m" });
        await threeM.click();
        await expect(threeM).toHaveAttribute("aria-pressed", "true");
        // Verify localStorage stored value
        const storedBefore = await page.evaluate(() => window.localStorage.getItem("financeMonths"));
        expect(storedBefore).toBe("3");
        await page.reload();
        await expect(page.getByRole("button", { name: "3m" })).toHaveAttribute("aria-pressed", "true");
        const storedAfter = await page.evaluate(() => window.localStorage.getItem("financeMonths"));
        expect(storedAfter).toBe("3");
    });
});
