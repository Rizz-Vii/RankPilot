import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { randomDelay } from "../utils/test-utils";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: "Sign In" });
    this.errorMessage = page.getByTestId("login-error");
  }

  async navigateTo(path?: string) {
    await this.page.goto(path || "/login");
    await randomDelay();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await randomDelay();
    await this.passwordInput.fill(password);
    await randomDelay();
    await this.loginButton.click();
    await this.page.waitForURL("/dashboard");
  }

  async attemptLogin(email: string, password: string) {
    await this.emailInput.fill(email);
    await randomDelay();
    await this.passwordInput.fill(password);
    await randomDelay();
    await this.loginButton.click();
    // Don't wait for URL change - let the test handle expectations
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }
}
