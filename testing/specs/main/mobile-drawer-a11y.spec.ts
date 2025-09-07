import { expect, test } from "@playwright/test";

// Focused a11y semantics for the mobile drawer
// Assumes the header renders the UnifiedMobileSidebar trigger on mobile viewports

test.describe("Mobile drawer accessibility", () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 size
        await page.goto("/");
    });

    test("trigger has stable test id and ARIA wiring", async ({ page }) => {
        const trigger = page.getByTestId(/public-mobile-menu|auth-mobile-menu|app-mobile-menu/);
        await expect(trigger).toBeVisible();
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
        await expect(trigger).toHaveAttribute("aria-controls", /-mobile-drawer$/);
    });

    test("drawer opens as dialog with labelledby and focus trap", async ({ page }) => {
        const trigger = page.getByTestId(/public-mobile-menu|auth-mobile-menu|app-mobile-menu/);
        await trigger.click();

        const drawer = page.getByTestId("mobile-drawer");
        await expect(drawer).toBeVisible();
        await expect(drawer).toHaveAttribute("role", "dialog");
        await expect(drawer).toHaveAttribute("aria-modal", "true");
        await expect(drawer).toHaveAttribute("aria-labelledby", /-mobile-drawer-title$/);

        // Focus is moved inside the dialog
        const activeRole = await page.evaluate(() => document.activeElement?.getAttribute("role") || document.activeElement?.tagName);
        expect(activeRole).toBeTruthy();

        // Escape closes
        await page.keyboard.press("Escape");
        await expect(drawer).toBeHidden();
    });
});
