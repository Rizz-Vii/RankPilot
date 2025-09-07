import { test, expect } from "@playwright/test";

// Contract: below-tier items are rendered but disabled (upsell). One group open at a time; Management is open by default.

test.describe("Navigation visibility and gating", () => {
  test("Locked enterprise marketing items are visible but disabled for starter", async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL!);

    // Expand "Marketing Automation" group (match aria-label from EnhancedAppNav)
    await page
      .getByRole("button", { name: /Marketing Automation navigation group/i })
      .click();

    // Item accessible name uses aria-label that includes title + description; match loosely
    const emailCampaigns = page.getByRole("link", { name: /Email Campaigns/i });
    await expect(emailCampaigns).toBeVisible();

    // Disabled state in main nav is expressed via tabindex -1 and pointer-events-none class
    await expect(emailCampaigns).toHaveAttribute("tabindex", "-1");
    await expect(emailCampaigns).toHaveClass(/pointer-events-none/);
  });

  test("Team Dashboard is visible; Team Projects remains disabled for starter", async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL!);

    // Management is default-expanded; verify Team Dashboard visibility directly
    await expect(
      page.getByRole("link", { name: /Team Dashboard/i })
    ).toBeVisible();

    // Open Team Collaboration group and verify Projects is disabled (enterprise)
    await page
      .getByRole("button", { name: /Team Collaboration navigation group/i })
      .click();
    const teamProjects = page.getByRole("link", { name: /Team Projects/i });
    await expect(teamProjects).toBeVisible();
    await expect(teamProjects).toHaveAttribute("tabindex", "-1");
    await expect(teamProjects).toHaveClass(/pointer-events-none/);
  });
});
