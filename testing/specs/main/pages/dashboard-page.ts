import type { Page, Locator} from "@playwright/test";
import { expect } from "@playwright/test";
import { randomDelay } from "../utils/test-utils";

export class DashboardPage {
  readonly page: Page;
  readonly title: Locator;
  readonly keywordStats: Locator;
  readonly contentStats: Locator;
  readonly recentActivity: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole("heading", { name: "Dashboard" });
    this.keywordStats = page.getByTestId("keyword-stats");
    this.contentStats = page.getByTestId("content-stats");
    this.recentActivity = page.getByTestId("recent-activity");
  }

  async navigateTo(path?: string) {
    await this.page.goto(path || "/dashboard");
    await this.page.waitForLoadState("networkidle");
    await randomDelay();
  }

  async extractStats() {
    await this.page.waitForLoadState("networkidle");

    return {
      keywords: await this.keywordStats.innerText(),
      content: await this.contentStats.innerText(),
      recentActivity: await this.recentActivity.allInnerTexts(),
      timestamp: new Date().toISOString(),
    };
  }

  async validateLayout() {
    await expect(this.title).toBeVisible();
    await expect(this.keywordStats).toBeVisible();
    await expect(this.contentStats).toBeVisible();
    await expect(this.recentActivity).toBeVisible();
  }
}
