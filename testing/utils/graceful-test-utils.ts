import type { Page} from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Graceful Test Utilities - Enhanced wait strategies for slow environments
 */

export class GracefulTestUtils {
  constructor(private page: Page) {}

  /**
   * Graceful page navigation with multiple retry strategies
   */
  async navigateGracefully(
    url: string,
    options: {
      maxRetries?: number;
      waitStrategy?: "load" | "domcontentloaded" | "networkidle";
      timeout?: number;
    } = {}
  ) {
    const {
      maxRetries = 3,
      waitStrategy = "domcontentloaded",
      timeout = 60000,
    } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Navigation attempt ${attempt}/${maxRetries} to ${url}`);

        await this.page.goto(url, {
          waitUntil: waitStrategy,
          timeout,
        });

        // Verify navigation success
        await this.page.waitForLoadState("domcontentloaded", {
          timeout: 15000,
        });
        console.log(`✅ Navigation successful on attempt ${attempt}`);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`❌ Navigation attempt ${attempt} failed:`, errorMessage);

        if (attempt === maxRetries) {
          const finalError =
            error instanceof Error ? error : new Error(String(error));
          throw new Error(
            `Failed to navigate after ${maxRetries} attempts: ${finalError.message}`
          );
        }

        // Progressive backoff delay
        const delay = attempt * 2000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.page.waitForTimeout(delay);
      }
    }
  }

  /**
   * Graceful element waiting with multiple strategies
   */
  async waitForElementGracefully(
    selector: string,
    options: {
      timeout?: number;
      state?: "attached" | "detached" | "visible" | "hidden";
      retries?: number;
    } = {}
  ) {
    const { timeout = 30000, state = "visible", retries = 3 } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `🔍 Waiting for element "${selector}" (attempt ${attempt}/${retries})`
        );

        const element = this.page.locator(selector).first();
        await element.waitFor({ state, timeout });

        console.log(`✅ Element found on attempt ${attempt}`);
        return element;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`❌ Element wait attempt ${attempt} failed:`, errorMessage);

        if (attempt === retries) {
          // Final attempt with screenshot for debugging
          await this.page.screenshot({
            path: `debug-element-not-found-${Date.now()}.png`,
            fullPage: true,
          });
          const finalError =
            error instanceof Error ? error : new Error(String(error));
          throw finalError;
        }

        // Wait and check page state
        await this.page.waitForTimeout(2000);
        const readyState = await this.page.evaluate(() => document.readyState);
        console.log(`📄 Document ready state: ${readyState}`);
      }
    }
  }

  /**
   * Graceful text verification with content checking
   */
  async verifyTextGracefully(
    selector: string,
    expectedText: string | RegExp,
    options: {
      timeout?: number;
      caseSensitive?: boolean;
    } = {}
  ) {
    const { timeout = 20000, caseSensitive = false } = options;

    console.log(`📝 Verifying text in "${selector}"`);

    try {
      const element = await this.waitForElementGracefully(selector, {
        timeout,
      });

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      if (typeof expectedText === "string") {
        await expect(element).toHaveText(expectedText, {
          timeout,
          ignoreCase: !caseSensitive,
        });
      } else {
        await expect(element).toHaveText(expectedText, { timeout });
      }

      console.log(`✅ Text verification successful`);
    } catch (error) {
      // Enhanced error reporting
      const actualText = await this.page
        .locator(selector)
        .textContent()
        .catch(() => "N/A");
      console.log(
        `❌ Text verification failed. Expected: ${expectedText}, Actual: ${actualText}`
      );
      const finalError =
        error instanceof Error ? error : new Error(String(error));
      throw finalError;
    }
  }

  /**
   * Graceful click with retry and verification
   */
  async clickGracefully(
    selector: string,
    options: {
      timeout?: number;
      retries?: number;
      verifyAction?: boolean;
    } = {}
  ) {
    const { timeout = 20000, retries = 3, verifyAction = true } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `👆 Clicking "${selector}" (attempt ${attempt}/${retries})`
        );

        const element = await this.waitForElementGracefully(selector, {
          timeout,
        });

        if (!element) {
          throw new Error(`Element not found for clicking: ${selector}`);
        }

        // Ensure element is clickable
        await element.waitFor({ state: "visible", timeout: 5000 });
        await element.scrollIntoViewIfNeeded();

        // Perform click
        await element.click({ timeout });

        if (verifyAction) {
          // Wait for potential navigation or state change
          await this.page.waitForTimeout(1000);
        }

        console.log(`✅ Click successful on attempt ${attempt}`);
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`❌ Click attempt ${attempt} failed:`, errorMessage);

        if (attempt === retries) {
          const finalError =
            error instanceof Error ? error : new Error(String(error));
          throw finalError;
        }

        await this.page.waitForTimeout(1500);
      }
    }
  }

  /**
   * Wait for application to be ready
   */
  async waitForAppReady(timeout = 45000) {
    console.log(`🏗️ Waiting for application to be ready...`);

    try {
      // Wait for basic DOM
      await this.page.waitForLoadState("domcontentloaded", { timeout });

      // Wait for React hydration - updated for Next.js 13+ App Router
      await this.page.waitForFunction(
        () => {
          // Check for Next.js App Router hydration
          return (
            (window.document.readyState === "complete" &&
              window.document.querySelector("body") !== null &&
              window.document.querySelector("html[data-hydrated]") !== null) ||
            // Fallback: just check if body has children (content loaded)
            (window.document.body && window.document.body.children.length > 0)
          );
        },
        { timeout: 15000 }
      );

      // Wait for potential loading states to clear
      await this.page
        .waitForFunction(
          () => !document.querySelector('[data-loading="true"]'),
          { timeout: 10000 }
        )
        .catch(() => {
          console.log(`⚠️ Loading state check timed out (this may be normal)`);
        });

      console.log(`✅ Application ready`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        `⚠️ Application readiness check failed, continuing anyway:`,
        errorMessage
      );
    }
  }

  /**
   * Enhanced error logging with context
   */
  async logErrorContext(testName: string, error: Error) {
    console.log(`\n🔥 ERROR in test: ${testName}`);
    console.log(`📍 URL: ${this.page.url()}`);
    console.log(`💥 Error: ${error.message}`);

    try {
      const title = await this.page.title();
      console.log(`📄 Page title: ${title}`);

      const readyState = await this.page.evaluate(() => document.readyState);
      console.log(`📊 Document state: ${readyState}`);

      // Take screenshot for debugging
      await this.page.screenshot({
        path: `error-${testName}-${Date.now()}.png`,
        fullPage: true,
      });
    } catch (debugError) {
      const debugErrorMessage =
        debugError instanceof Error ? debugError.message : String(debugError);
      console.log(`⚠️ Could not gather debug context:`, debugErrorMessage);
    }
  }
}

/**
 * Create graceful test utils instance
 */
export function createGracefulUtils(page: Page) {
  return new GracefulTestUtils(page);
}
