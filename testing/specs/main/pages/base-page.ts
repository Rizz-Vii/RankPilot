import type { Locator, Page } from "@playwright/test";
import { randomDelay } from "../utils/test-utils";

export class BasePage {
  readonly page: Page;
  readonly navMenu: Locator;
  readonly userMenu: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navMenu = page.locator('nav[role="navigation"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  public async waitForLoadingComplete() {
    await this.loadingSpinner
      .waitFor({ state: "visible", timeout: 1000 })
      .catch(() => {});
    await this.loadingSpinner.waitFor({ state: "hidden", timeout: 30000 });
  }

  async waitForNetworkIdle() {
    // networkidle is flaky in dev/test environments; prefer domcontentloaded + spinner check
    await this.page.waitForLoadState("domcontentloaded");
    await randomDelay();
    // Wait for any loading spinner to disappear if present
    await this.loadingSpinner
      .waitFor({ state: "hidden", timeout: 30000 })
      .catch(() => {});
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForNetworkIdle();
  }

  async getCurrentUrl() {
    return this.page.url();
  }
}
