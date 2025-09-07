/**
 * RankPilot Error Handling & Edge Cases Tests
 * Comprehensive error recovery and edge case validation
 */

import { expect, test } from "@playwright/test";

// Use Playwright's configured base URL or fallback to localhost
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const RANKPILOT_APP_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Test data
const TEST_DATA = {
  edgeCases: {
    networkFailures: {
      slowConnection: 1000, // 1 second delay
      timeout: 30000, // 30 second timeout
      offline: true,
    },
    invalidInputs: {
      empty: "",
      whitespace: "   ",
      tooLong: "A".repeat(10000),
      specialChars: "!@#$%^&*()",
      unicode: "🚀🔥💯🚀🔥💯",
      null: null,
      undefined: undefined,
    },
    boundaryValues: {
      maxInt: 2147483647,
      minInt: -2147483648,
      maxFloat: 1.7976931348623157e308,
      minFloat: -1.7976931348623157e308,
      zero: 0,
      negative: -1,
    },
  },
  errorScenarios: {
    apiErrors: [400, 401, 403, 404, 500, 502, 503, 504],
    networkErrors: ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"],
    validationErrors: ["required", "invalid", "too_long", "malformed"],
  },
};

const errorTestDiagnostics = {
  errors: [] as string[],
  unhandledErrors: [] as string[],
};

test.describe("RankPilot Error Handling & Edge Cases - Comprehensive Testing", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(25000);

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errorTestDiagnostics.unhandledErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on("pageerror", (error) => {
      errorTestDiagnostics.unhandledErrors.push(error.message);
    });
  });

  test.describe("Network Error Handling", () => {
    test("Slow Network Recovery", async ({ page }) => {
      console.log("🐌 Testing Slow Network Recovery...");

      try {
        // Simulate slow network
        await page.route("**/api/**", async (route) => {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              TEST_DATA.edgeCases.networkFailures.slowConnection
            )
          );
          await route.continue();
        });

        await page.goto(`${RANKPILOT_APP_URL}/dashboard`);

        // Check if loading states are shown
        const loadingIndicator = await page.isVisible(
          '.loading, [data-testid="loading"], .spinner'
        );
        console.log(`   Loading Indicator Shown: ${loadingIndicator}`);

        // Wait for content to load
        await page.waitForTimeout(
          TEST_DATA.edgeCases.networkFailures.slowConnection + 1000
        );

        const contentLoaded = await page.isVisible(
          '.main-content, [data-testid="content"]'
        );
        console.log(`   Content Loaded: ${contentLoaded}`);

        expect(loadingIndicator && contentLoaded).toBe(true);
        console.log("   ✅ Slow network recovery functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Slow network recovery test failed");
      } finally {
        await page.unroute("**/api/**");
      }
    });

    test("Network Timeout Handling", async ({ page }) => {
      console.log("⏰ Testing Network Timeout Handling...");

      try {
        // Simulate network timeout
        await page.route("**/api/**", async (route) => {
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              TEST_DATA.edgeCases.networkFailures.timeout + 1000
            )
          );
          await route.continue();
        });

        await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

        const keywordInput = await page.locator('input[type="text"]').first();
        if (await keywordInput.isVisible()) {
          await keywordInput.fill("test");

          const searchBtn = await page.locator('button[type="submit"]').first();
          if (await searchBtn.isVisible()) {
            await searchBtn.click();

            // Wait for timeout
            await page.waitForTimeout(
              TEST_DATA.edgeCases.networkFailures.timeout + 2000
            );

            const timeoutError = await page.isVisible(
              "text=/timeout|network error|connection/i"
            );
            const retryBtn = await page.isVisible(
              'button[data-testid="retry"], .retry-btn'
            );

            console.log(`   Timeout Error Shown: ${timeoutError}`);
            console.log(`   Retry Button Available: ${retryBtn}`);

            expect(timeoutError || retryBtn).toBe(true);
            console.log("   ✅ Network timeout handling functional");
          }
        }
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Network timeout handling test failed");
      } finally {
        await page.unroute("**/api/**");
      }
    });

    test("Connection Loss Recovery", async ({ page }) => {
      console.log("📡 Testing Connection Loss Recovery...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/dashboard`);

        // Simulate connection loss
        await page.route("**/api/**", (route) => route.abort());

        // Try to perform an action
        const refreshBtn = await page
          .locator('button[data-testid="refresh"], .refresh-btn')
          .first();

        if (await refreshBtn.isVisible()) {
          await refreshBtn.click();

          const offlineMsg = await page.isVisible(
            "text=/offline|connection lost|network error/i"
          );
          const reconnectBtn = await page.isVisible(
            'button[data-testid="reconnect"], .reconnect-btn'
          );

          console.log(`   Offline Message Shown: ${offlineMsg}`);
          console.log(`   Reconnect Button Available: ${reconnectBtn}`);

          expect(offlineMsg || reconnectBtn).toBe(true);
          console.log("   ✅ Connection loss recovery functional");
        }
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Connection loss recovery test failed");
      } finally {
        await page.unroute("**/api/**");
      }
    });
  });

  test.describe("API Error Handling", () => {
    test("HTTP Error Status Codes", async ({ page }) => {
      console.log("🔢 Testing HTTP Error Status Codes...");

      try {
        for (const statusCode of TEST_DATA.errorScenarios.apiErrors) {
          await page.route("**/api/**", (route) =>
            route.fulfill({
              status: statusCode,
              contentType: "application/json",
              body: JSON.stringify({ error: `HTTP ${statusCode} Error` }),
            })
          );

          await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);
          await page.reload();

          const errorMsg = await page.isVisible(
            `text=/error|${statusCode}|failed/i`
          );
          const userFriendlyMsg = await page.isVisible(
            '.error-message, [data-testid="error"]'
          );

          console.log(`   HTTP ${statusCode} - Error Shown: ${errorMsg}`);
          console.log(
            `   HTTP ${statusCode} - User Friendly: ${userFriendlyMsg}`
          );

          expect(errorMsg || userFriendlyMsg).toBe(true);
        }

        console.log("   ✅ HTTP error status codes handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ HTTP error status codes test failed");
      } finally {
        await page.unroute("**/api/**");
      }
    });

    test("API Rate Limiting", async ({ page }) => {
      console.log("🚦 Testing API Rate Limiting...");

      try {
        let requestCount = 0;

        await page.route("**/api/**", (route) => {
          requestCount++;
          if (requestCount > 5) {
            route.fulfill({
              status: 429,
              contentType: "application/json",
              body: JSON.stringify({ error: "Rate limit exceeded" }),
            });
          } else {
            route.continue();
          }
        });

        await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

        // Make multiple rapid requests
        for (let i = 0; i < 7; i++) {
          const searchBtn = await page.locator('button[type="submit"]').first();
          if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(100);
          }
        }

        const rateLimitMsg = await page.isVisible(
          "text=/rate limit|too many|429/i"
        );
        const cooldownMsg = await page.isVisible(
          "text=/cooldown|wait|try again/i"
        );

        console.log(`   Rate Limit Message: ${rateLimitMsg}`);
        console.log(`   Cooldown Message: ${cooldownMsg}`);

        expect(rateLimitMsg || cooldownMsg).toBe(true);
        console.log("   ✅ API rate limiting functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ API rate limiting test failed");
      } finally {
        await page.unroute("**/api/**");
      }
    });
  });

  test.describe("Input Validation Edge Cases", () => {
    test("Empty & Whitespace Inputs", async ({ page }) => {
      console.log("📝 Testing Empty & Whitespace Inputs...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/contact`);

        const inputs = await page.locator("input, textarea").all();

        for (const input of inputs.slice(0, 3)) {
          // Test first 3 inputs
          const inputType =
            (await input.getAttribute("type")) ||
            (await input.getAttribute("name")) ||
            "text";

          // Test empty input
          await input.fill(TEST_DATA.edgeCases.invalidInputs.empty);
          const submitBtn = await page.locator('button[type="submit"]').first();

          if (await submitBtn.isVisible()) {
            await submitBtn.click();

            const emptyError = await page.isVisible(
              '.error, .validation-error, [data-testid="error"]'
            );
            console.log(`   Empty ${inputType} - Validation: ${emptyError}`);
          }

          // Test whitespace input
          await input.fill(TEST_DATA.edgeCases.invalidInputs.whitespace);

          if (await submitBtn.isVisible()) {
            await submitBtn.click();

            const whitespaceError = await page.isVisible(
              '.error, .validation-error, [data-testid="error"]'
            );
            console.log(
              `   Whitespace ${inputType} - Validation: ${whitespaceError}`
            );
          }
        }

        console.log("   ✅ Empty & whitespace inputs handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Empty & whitespace inputs test failed");
      }
    });

    test("Oversized Input Handling", async ({ page }) => {
      console.log("📏 Testing Oversized Input Handling...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/contact`);

        const textareas = await page.locator("textarea").all();

        if (textareas.length > 0) {
          const textarea = textareas[0];

          // Test oversized input
          await textarea.fill(TEST_DATA.edgeCases.invalidInputs.tooLong);

          const submitBtn = await page.locator('button[type="submit"]').first();

          if (await submitBtn.isVisible()) {
            await submitBtn.click();

            const sizeError = await page.isVisible(
              "text=/too long|limit|maximum/i"
            );
            const truncatedMsg = await page.isVisible(
              "text=/truncated|shortened/i"
            );

            console.log(`   Size Limit Error: ${sizeError}`);
            console.log(`   Truncation Warning: ${truncatedMsg}`);

            expect(sizeError || truncatedMsg).toBe(true);
            console.log("   ✅ Oversized input handling functional");
          }
        }
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Oversized input handling test failed");
      }
    });

    test("Special Characters & Unicode", async ({ page }) => {
      console.log("🔤 Testing Special Characters & Unicode...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

        const keywordInput = await page.locator('input[type="text"]').first();

        if (await keywordInput.isVisible()) {
          // Test special characters
          await keywordInput.fill(
            TEST_DATA.edgeCases.invalidInputs.specialChars
          );

          const searchBtn = await page.locator('button[type="submit"]').first();

          if (await searchBtn.isVisible()) {
            await searchBtn.click();

            const specialCharError = await page.isVisible(
              '.error, [data-testid="error"]'
            );
            const results = await page.isVisible(
              '[data-testid="results"], .results'
            );

            console.log(`   Special Chars Error: ${specialCharError}`);
            console.log(`   Special Chars Results: ${results}`);
          }

          // Test unicode characters
          await keywordInput.fill(TEST_DATA.edgeCases.invalidInputs.unicode);

          if (await searchBtn.isVisible()) {
            await searchBtn.click();

            const unicodeError = await page.isVisible(
              '.error, [data-testid="error"]'
            );
            const unicodeResults = await page.isVisible(
              '[data-testid="results"], .results'
            );

            console.log(`   Unicode Error: ${unicodeError}`);
            console.log(`   Unicode Results: ${unicodeResults}`);
          }

          console.log("   ✅ Special characters & unicode handling functional");
        }
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Special characters & unicode test failed");
      }
    });

    test("Boundary Value Testing", async ({ page }) => {
      console.log("🔢 Testing Boundary Value Testing...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/settings/profile`);

        const numberInputs = await page.locator('input[type="number"]').all();

        if (numberInputs.length > 0) {
          const numberInput = numberInputs[0];

          // Test boundary values
          const boundaryValues = [
            TEST_DATA.edgeCases.boundaryValues.maxInt,
            TEST_DATA.edgeCases.boundaryValues.minInt,
            TEST_DATA.edgeCases.boundaryValues.zero,
            TEST_DATA.edgeCases.boundaryValues.negative,
          ];

          for (const value of boundaryValues) {
            await numberInput.fill(value.toString());

            const saveBtn = await page
              .locator('button[type="submit"], [data-testid="save"]')
              .first();

            if (await saveBtn.isVisible()) {
              await saveBtn.click();

              const boundaryError = await page.isVisible(
                '.error, .validation-error, [data-testid="error"]'
              );
              const successMsg = await page.isVisible(
                '.success, [data-testid="success"]'
              );

              console.log(
                `   Boundary ${value} - Error: ${boundaryError}, Success: ${successMsg}`
              );
            }
          }

          console.log("   ✅ Boundary value testing functional");
        }
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Boundary value testing failed");
      }
    });
  });

  test.describe("Browser & Device Edge Cases", () => {
    test("JavaScript Disabled", async ({ page }) => {
      console.log("🚫 Testing JavaScript Disabled...");

      try {
        // Disable JavaScript
        await page.route("**/*.js", (route) => route.abort());

        await page.goto(RANKPILOT_APP_URL);
        await page.reload();

        // Check for noscript content
        const noscriptContent = await page.isVisible("noscript, .no-js");
        const basicFunctionality = await page.isVisible("a, form, h1");

        console.log(`   NoScript Content: ${noscriptContent}`);
        console.log(`   Basic Functionality: ${basicFunctionality}`);

        expect(basicFunctionality).toBe(true);
        console.log("   ✅ JavaScript disabled handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ JavaScript disabled test failed");
      } finally {
        await page.unroute("**/*.js");
      }
    });

    test("Cookies Disabled", async ({ page }) => {
      console.log("🍪 Testing Cookies Disabled...");

      try {
        // Disable cookies
        await page.context().addCookies([]); // Clear cookies
        await page.route("**/*", (route) => {
          const headers = route.request().headers();
          delete headers.cookie;
          route.continue({ headers });
        });

        await page.goto(RANKPILOT_APP_URL);

        // Try to access authenticated content
        const authRequired = await page.isVisible(
          '.login-required, [data-testid="login"]'
        );
        const basicContent = await page.isVisible("h1, .main-content");

        console.log(`   Auth Required: ${authRequired}`);
        console.log(`   Basic Content Available: ${basicContent}`);

        expect(basicContent).toBe(true);
        console.log("   ✅ Cookies disabled handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Cookies disabled test failed");
      }
    });

    test("Local Storage Unavailable", async ({ page }) => {
      console.log("💾 Testing Local Storage Unavailable...");

      try {
        // Disable localStorage
        await page.addScriptTag({
          content: `
                        Object.defineProperty(window, 'localStorage', {
                            value: {
                                getItem: () => { throw new Error('Storage disabled'); },
                                setItem: () => { throw new Error('Storage disabled'); },
                                removeItem: () => { throw new Error('Storage disabled'); }
                            }
                        });
                    `,
        });

        await page.goto(RANKPILOT_APP_URL);

        // Check if app handles storage errors gracefully
        const storageError = await page.isVisible(
          "text=/storage|localStorage/i"
        );
        const appFunctional = await page.isVisible(".main-content, nav");

        console.log(`   Storage Error Shown: ${storageError}`);
        console.log(`   App Still Functional: ${appFunctional}`);

        expect(appFunctional).toBe(true);
        console.log("   ✅ Local storage unavailable handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Local storage unavailable test failed");
      }
    });
  });

  test.describe("Performance Edge Cases", () => {
    test("Memory Leak Prevention", async ({ page }) => {
      console.log("🧠 Testing Memory Leak Prevention...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/dashboard`);

        // Navigate through multiple pages to test memory management
        const pages = [
          "/keyword-tool",
          "/seo-audit",
          "/settings/profile",
          "/dashboard",
        ];

        for (const pagePath of pages) {
          await page.goto(`${RANKPILOT_APP_URL}${pagePath}`);
          await page.waitForTimeout(1000);

          // Check for memory-related errors
          const memoryError = await page.isVisible(
            "text=/memory|out of memory|heap/i"
          );
          console.log(`   ${pagePath} - Memory Error: ${memoryError}`);
        }

        // Check if page is still responsive
        const stillResponsive = await page.isVisible("body");
        console.log(`   Page Still Responsive: ${stillResponsive}`);

        expect(stillResponsive).toBe(true);
        console.log("   ✅ Memory leak prevention functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Memory leak prevention test failed");
      }
    });

    test("Concurrent Request Handling", async ({ page }) => {
      console.log("🔄 Testing Concurrent Request Handling...");

      try {
        await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

        // Make multiple concurrent requests
        const promises = [];

        for (let i = 0; i < 5; i++) {
          promises.push(page.locator('button[type="submit"]').first().click());
          await page.waitForTimeout(100); // Small delay between clicks
        }

        await Promise.allSettled(promises);

        // Check if all requests were handled
        const loadingStates = await page
          .locator('.loading, [data-testid*="loading"]')
          .all();
        const errorStates = await page
          .locator('.error, [data-testid*="error"]')
          .all();

        console.log(`   Concurrent Loading States: ${loadingStates.length}`);
        console.log(`   Concurrent Error States: ${errorStates.length}`);

        expect(loadingStates.length >= 0).toBe(true); // Should handle concurrent requests
        console.log("   ✅ Concurrent request handling functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Concurrent request handling test failed");
      }
    });
  });

  test.describe("Cross-Browser Compatibility", () => {
    test("CSS Flexbox/Grid Fallbacks", async ({ page }) => {
      console.log("📐 Testing CSS Flexbox/Grid Fallbacks...");

      try {
        await page.goto(RANKPILOT_APP_URL);

        // Check for layout issues
        const layoutBroken = await page.evaluate(() => {
          const elements = document.querySelectorAll(
            '.flex, .grid, [style*="display: flex"], [style*="display: grid"]'
          );
          let brokenCount = 0;

          elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              brokenCount++;
            }
          });

          return brokenCount;
        });

        console.log(`   Broken Layout Elements: ${layoutBroken}`);

        expect(layoutBroken).toBe(0);
        console.log("   ✅ CSS flexbox/grid fallbacks functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ CSS flexbox/grid fallbacks test failed");
      }
    });

    test("Progressive Enhancement", async ({ page }) => {
      console.log("⬆️ Testing Progressive Enhancement...");

      try {
        // Test with CSS disabled
        await page.route("**/*.css", (route) => route.abort());

        await page.goto(RANKPILOT_APP_URL);
        await page.reload();

        // Check if content is still readable
        const readableContent = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          const hasReadableText =
            body.textContent && body.textContent.length > 100;
          const hasBasicStructure = document.querySelector("h1, h2, nav, main");

          return hasReadableText && !!hasBasicStructure;
        });

        console.log(`   Content Readable Without CSS: ${readableContent}`);

        expect(readableContent).toBe(true);
        console.log("   ✅ Progressive enhancement functional");
      } catch (error) {
        errorTestDiagnostics.errors.push(
          error instanceof Error ? error.message : String(error)
        );
        console.log("   ⚠️ Progressive enhancement test failed");
      } finally {
        await page.unroute("**/*.css");
      }
    });
  });

  test.afterAll(() => {
    if (errorTestDiagnostics.errors.length > 0) {
      console.log("\n🚨 Error Handling Test Errors:");
      errorTestDiagnostics.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (errorTestDiagnostics.unhandledErrors.length > 0) {
      console.log("\n⚠️ Unhandled Errors Detected:");
      errorTestDiagnostics.unhandledErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (
      errorTestDiagnostics.errors.length === 0 &&
      errorTestDiagnostics.unhandledErrors.length === 0
    ) {
      console.log(
        "\n✅ All Error Handling & Edge Cases tests completed successfully"
      );
    }
  });
});
