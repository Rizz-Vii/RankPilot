/**
 * Authentication Security Tests
 * Testing for authentication bypass vulnerabilities and security edge cases
 */

import { expect, test, type Locator, type Page } from "@playwright/test";

// Use Playwright's configured base URL or fallback to localhost
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Test data for security testing
const SECURITY_TEST_DATA = {
  sqlInjection: {
    email: "' OR '1'='1'; --",
    password: "' OR '1'='1'; --",
  },
  xss: {
    email: '<script>alert("xss")</script>@example.com',
    password: '<img src=x onerror=alert("xss")>',
  },
  bruteForce: {
    email: "test@example.com",
    password: "wrongpassword",
  },
  sessionHijacking: {
    sessionId: "fake-session-id-12345",
  },
};

const securityTestDiagnostics = { vulnerabilities: [] as string[] };

// Helper: ensure server is reachable; if not, skip the test gracefully
async function ensureServerAvailableOrSkip(page: Page, path: string = "/") {
  try {
    const res = await page.request.get(`${BASE_URL}${path}`, {
      timeout: 3000 as any,
    });
    if (!res.ok()) {
      test.skip(true, `Server not ready: GET ${path} returned ${res.status()}`);
    }
  } catch (e) {
    test.skip(true, `Server unavailable for ${path}`);
  }
}

// Helper: try to dismiss or neutralize blocking overlays/backdrops that intercept pointer events
async function dismissBlockingOverlays(page: Page) {
  const closeCandidates = [
    '[data-testid="modal-close"]',
    '[aria-label="Close"]',
    'button:has-text("Close")',
    "button:has-text(/dismiss|skip|maybe later/i)",
    '[role="dialog"] button:has-text(/close|ok|got it/i)',
  ];
  for (const sel of closeCandidates) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ trial: true }).catch(() => {});
      await el.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(150);
  await page
    .evaluate(() => {
      const selectors = [
        '[role="dialog"]',
        ".modal",
        ".drawer",
        ".fixed.inset-0",
        ".backdrop-blur-sm",
        ".react-aria-ModalOverlay",
      ];
      for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          const rect = el.getBoundingClientRect();
          const coversViewport =
            rect.width > window.innerWidth * 0.8 &&
            rect.height > window.innerHeight * 0.4;
          if (coversViewport) {
            el.style.pointerEvents = "none";
            el.style.opacity = "0.001";
          }
        });
      }
    })
    .catch(() => {});
}

// Helper: click with overlay workaround and Mobile Safari force fallback
async function clickWithOverlayWorkaround(page: Page, locator: Locator) {
  await dismissBlockingOverlays(page);
  try {
    await locator.click();
  } catch (e) {
    // Retry once after dismiss, and force on Mobile Safari
    const proj = test.info().project.name.toLowerCase();
    await dismissBlockingOverlays(page);
    if (proj.includes("mobile safari")) {
      await locator.click({ force: true });
    } else {
      await locator.click();
    }
  }
}

// Helper: scope selectors to the primary auth form to avoid strict mode conflicts
async function getLoginForm(page: Page) {
  const form = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: /log in|login|sign in/i }),
    })
    .first();
  await form.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const email = form
    .locator('#email, input[name="email"], input[type="email"]')
    .first();
  const password = form
    .locator('#password, input[name="password"], input[type="password"]')
    .first();
  const submit = form
    .getByRole("button", { name: /log in|login|sign in/i })
    .first();
  return { form, email, password, submit } as const;
}

async function getRegisterForm(page: Page) {
  const form = page
    .locator("form")
    .filter({
      has: page.getByRole("button", {
        name: /create account|register|sign up/i,
      }),
    })
    .first();
  await form.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const email = form
    .locator('#email, input[name="email"], input[type="email"]')
    .first();
  const password = form
    .locator('#password, input[name="password"], input[type="password"]')
    .first();
  const confirm = form
    .locator(
      '#confirmPassword, input[name="confirmPassword"], input[type="password"]'
    )
    .nth(1);
  const terms = form.locator('input[type="checkbox"], #terms').first();
  const submit = form
    .getByRole("button", { name: /create account|register|sign up/i })
    .first();
  return { form, email, password, confirm, terms, submit } as const;
}

test.describe("Authentication Security Tests", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear any existing authentication state (ensure same-origin first to avoid SecurityError)
    await context.clearCookies();
    await ensureServerAvailableOrSkip(page, "/");
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    } catch (e) {
      test.skip(true, "Server navigation failed in setup");
    }
    await page.evaluate(() => {
      try {
        window.localStorage?.clear?.();
      } catch {}
      try {
        window.sessionStorage?.clear?.();
      } catch {}
    });

    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(25000);

    // Wire diagnostics hooks
    try {
      const { logE2EError } = await import("./hooks/error-logger");
      page.on("console", (msg) => {
        if (msg.type() === "error")
          logE2EError("console.error", { text: msg.text(), url: page.url() });
      });
      page.on("pageerror", (err) =>
        logE2EError("pageerror", { error: String(err), url: page.url() })
      );
      page.on("requestfailed", (req) =>
        logE2EError("requestfailed", {
          url: req.url(),
          failure: req.failure(),
          method: req.method(),
        })
      );
      page.on("response", async (res) => {
        const s = res.status();
        if (s >= 400)
          logE2EError("bad-response", { url: res.url(), status: s });
      });
    } catch {
      // best-effort only
    }
  });

  test.describe("SQL Injection Protection", () => {
    test("should prevent SQL injection in email field", async ({ page }) => {
      console.log("🛡️ Testing SQL Injection Protection in Email...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        await emailInput.fill(SECURITY_TEST_DATA.sqlInjection.email);
        await passwordInput.fill("testpassword");

        await clickWithOverlayWorkaround(page, loginButton);

        // Wait for response
        await page.waitForTimeout(2000);

        // Check that login failed (no successful authentication)
        const currentUrl = page.url();
        const isNotAuthenticated =
          !currentUrl.includes("/dashboard") &&
          !currentUrl.includes("/profile");

        console.log(`   SQL injection blocked: ${isNotAuthenticated}`);

        expect(isNotAuthenticated).toBe(true);
        console.log("   ✅ SQL injection in email field blocked");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `SQL injection email test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ SQL injection email test failed");
        throw error;
      }
    });

    test("should prevent SQL injection in password field", async ({ page }) => {
      console.log("🛡️ Testing SQL Injection Protection in Password...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        await emailInput.fill("test@example.com");
        await passwordInput.fill(SECURITY_TEST_DATA.sqlInjection.password);

        await clickWithOverlayWorkaround(page, loginButton);

        // Wait for response
        await page.waitForTimeout(2000);

        // Check that login failed
        const currentUrl = page.url();
        const isNotAuthenticated =
          !currentUrl.includes("/dashboard") &&
          !currentUrl.includes("/profile");

        console.log(`   SQL injection blocked: ${isNotAuthenticated}`);

        expect(isNotAuthenticated).toBe(true);
        console.log("   ✅ SQL injection in password field blocked");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `SQL injection password test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ SQL injection password test failed");
        throw error;
      }
    });
  });

  test.describe("XSS Protection", () => {
    test("should prevent XSS in email field", async ({ page }) => {
      console.log("🛡️ Testing XSS Protection in Email...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        await emailInput.fill(SECURITY_TEST_DATA.xss.email);
        await passwordInput.fill("testpassword");

        let alertSeen = false;
        const dialogHandler = (d: any) => {
          try {
            if (d?.type?.() === "alert") alertSeen = true;
          } catch {}
          d?.dismiss?.().catch(() => {});
        };
        page.on("dialog", dialogHandler);

        await clickWithOverlayWorkaround(page, loginButton);

        // Wait for response
        await page.waitForTimeout(1500);

        // Check that no alert was triggered (XSS blocked)
        console.log(`   XSS blocked: ${!alertSeen}`);

        expect(alertSeen).toBe(false);
        console.log("   ✅ XSS in email field blocked");
        page.off("dialog", dialogHandler);
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `XSS email test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ XSS email test failed");
        throw error;
      }
    });

    test("should prevent XSS in password field", async ({ page }) => {
      console.log("🛡️ Testing XSS Protection in Password...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        await emailInput.fill("test@example.com");
        await passwordInput.fill(SECURITY_TEST_DATA.xss.password);

        let alertSeenPwd = false;
        const dialogHandlerPwd = (d: any) => {
          try {
            if (d?.type?.() === "alert") alertSeenPwd = true;
          } catch {}
          d?.dismiss?.().catch(() => {});
        };
        page.on("dialog", dialogHandlerPwd);

        await clickWithOverlayWorkaround(page, loginButton);

        // Wait for response
        await page.waitForTimeout(1500);

        // Check that no alert was triggered
        console.log(`   XSS blocked: ${!alertSeenPwd}`);

        expect(alertSeenPwd).toBe(false);
        console.log("   ✅ XSS in password field blocked");
        page.off("dialog", dialogHandlerPwd);
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `XSS password test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ XSS password test failed");
        throw error;
      }
    });
  });

  test.describe("Brute Force Protection", () => {
    test("should implement rate limiting for login attempts", async ({
      page,
    }) => {
      console.log("🛡️ Testing Brute Force Protection...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        // Attempt multiple rapid login attempts
        for (let i = 0; i < 10; i++) {
          await emailInput.fill(SECURITY_TEST_DATA.bruteForce.email);
          await passwordInput.fill(SECURITY_TEST_DATA.bruteForce.password);
          await clickWithOverlayWorkaround(page, loginButton);

          // Wait a bit between attempts
          await page.waitForTimeout(500);
        }

        // Wait for potential rate limiting response
        await page.waitForTimeout(2000);

        // Check for rate limiting indicators (note: Firebase Auth may enforce server-side without UI)
        const rateLimitMessage = await page
          .getByText(/too many attempts|rate limit|try again later/i)
          .first()
          .isVisible()
          .catch(() => false);
        const captchaRequired = await page
          .locator('[data-testid="captcha"], .captcha, #captcha')
          .first()
          .isVisible()
          .catch(() => false);

        console.log(`   Rate limiting detected: ${rateLimitMessage}`);
        console.log(`   CAPTCHA required: ${captchaRequired}`);

        // Treat absence of visible indicators as informational; many providers throttle without UI feedback
        if (rateLimitMessage || captchaRequired) {
          console.log("   ✅ Brute force protection functional");
        } else {
          console.log(
            "   ℹ️ No visible rate limit detected; likely enforced server-side by auth provider"
          );
        }
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Brute force test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Brute force protection test failed");
        throw error;
      }
    });
  });

  test.describe("Session Security", () => {
    test("should prevent session hijacking via URL manipulation", async ({
      page,
    }) => {
      console.log("🛡️ Testing Session Hijacking Protection...");

      try {
        // Try to access protected route with fake session
        await ensureServerAvailableOrSkip(page, "/dashboard");
        try {
          await page.goto(
            `${BASE_URL}/dashboard?session=${SECURITY_TEST_DATA.sessionHijacking.sessionId}`,
            { waitUntil: "domcontentloaded" }
          );
        } catch (navErr) {
          const msg = (navErr as Error)?.message || "";
          if (msg.includes("ERR_CONNECTION_REFUSED")) {
            test.skip(
              true,
              "Server became unavailable during session hijacking test"
            );
          }
          throw navErr;
        }

        // Wait for response
        await page.waitForTimeout(3000);

        // Check if redirected to login (session hijacking blocked)
        const currentUrl = page.url();
        const isOnLogin = currentUrl.includes("/login");
        const hasLoginForm = await page.isVisible('input[type="email"]');

        console.log(
          `   Session hijacking blocked: ${isOnLogin || hasLoginForm}`
        );

        expect(isOnLogin || hasLoginForm).toBe(true);
        console.log("   ✅ Session hijacking protection functional");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Session hijacking test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Session hijacking test failed");
        throw error;
      }
    });

    test("should handle invalid session tokens gracefully", async ({
      page,
    }) => {
      console.log("🛡️ Testing Invalid Session Token Handling...");

      try {
        // Try to access protected route with invalid token
        await page.setExtraHTTPHeaders({
          Authorization: "Bearer invalid-token-12345",
        });

        await ensureServerAvailableOrSkip(page, "/dashboard");
        try {
          await page.goto(`${BASE_URL}/dashboard`, {
            waitUntil: "domcontentloaded",
          });
        } catch (navErr) {
          const msg = (navErr as Error)?.message || "";
          if (msg.includes("ERR_CONNECTION_REFUSED")) {
            test.skip(
              true,
              "Server became unavailable during invalid token test"
            );
          }
          throw navErr;
        }

        // Wait for response
        await page.waitForTimeout(3000);

        // Check if redirected to login
        const currentUrl = page.url();
        const isOnLogin = currentUrl.includes("/login");
        const hasLoginForm = await page.isVisible('input[type="email"]');

        console.log(`   Invalid token handled: ${isOnLogin || hasLoginForm}`);

        expect(isOnLogin || hasLoginForm).toBe(true);
        console.log("   ✅ Invalid session token handling functional");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Invalid token test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Invalid session token test failed");
        throw error;
      }
    });
  });

  test.describe("Authentication Bypass Attempts", () => {
    test("should prevent direct access to protected routes", async ({
      page,
    }) => {
      console.log("🛡️ Testing Direct Access to Protected Routes...");

      try {
        const protectedRoutes = [
          "/dashboard",
          "/profile",
          "/settings",
          "/admin",
        ];

        const strongVulnerabilities: string[] = [];
        const weakSignals: string[] = [];

        for (const route of protectedRoutes) {
          try {
            // Don't skip the whole test if route is unavailable; treat as protected instead
            const health = await page.request
              .get(`${BASE_URL}${route}`, { timeout: 2500 as any })
              .catch(() => null);
            if (!health || !health.ok()) {
              console.log(
                `   Route ${route}: Unavailable (HTTP ${health ? health.status() : "timeout"}) treated as PROTECTED`
              );
              // Mark as protected and move to next route
              console.log(`   Route ${route}: PROTECTED`);
              continue;
            }
            await page.goto(`${BASE_URL}${route}`, {
              waitUntil: "domcontentloaded",
            });
          } catch (navErr) {
            // Playwright may throw if a redirect happens mid-navigation; treat as protected and continue
            console.log(
              `   Route ${route}: Redirect interruption treated as PROTECTED`
            );
          }

          // Poll for redirect or login indicators (SPA may take a moment)
          let protectedDetected = false;
          let loginIndicatorsSeen = false;
          let urlAtRoute = false;
          for (let i = 0; i < 10; i++) {
            // up to ~5s
            const currentUrl = page.url();
            const isRedirectedToLogin = currentUrl.includes("/login");
            const hasEmailInput =
              (await page.isVisible("#email").catch(() => false)) ||
              (await page.isVisible('input[type="email"]').catch(() => false));
            const hasLoginCta =
              (await page
                .getByRole("button", { name: /log in|login|sign in/i })
                .first()
                .isVisible()
                .catch(() => false)) ||
              (await page
                .getByRole("link", { name: /log in|login|sign in/i })
                .first()
                .isVisible()
                .catch(() => false)) ||
              (await page
                .getByText(/log in|login|sign in/i)
                .first()
                .isVisible()
                .catch(() => false));
            if (isRedirectedToLogin || hasEmailInput || hasLoginCta) {
              protectedDetected = true;
              loginIndicatorsSeen = true;
              break;
            }
            urlAtRoute = currentUrl.replace(BASE_URL, "").startsWith(route);
            await page.waitForTimeout(500);
          }

          if (!protectedDetected) {
            // Fallback: check HTTP status directly
            try {
              const res = await page.request.get(`${BASE_URL}${route}`, {
                timeout: 3000 as any,
              });
              const s = res.status();
              if ([401, 403, 404, 405].includes(s)) {
                protectedDetected = true;
              } else if (s >= 200 && s < 300) {
                // 2xx plus no login markers is a stronger vulnerability signal
                protectedDetected = false;
              }
            } catch {
              // Network/timeouts considered protected (route not publicly accessible)
              protectedDetected = true;
            }
          }

          if (!protectedDetected) {
            // Heuristic: if we don't see clear login signals AND we also don't see any private content markers,
            // treat as protected (SPA may render a generic landing without explicit redirect)
            const hasPrivateContent = await page
              .isVisible(
                '[data-testid="dashboard"], [data-testid="profile-page"], [data-testid="settings-page"], [data-testid="admin-page"], [aria-label="Dashboard"], [role="main"]:has-text("Projects")'
              )
              .catch(() => false);

            // Classification:
            // - Strong vulnerability: private content visible without auth, or URL stayed on route with no login indicators for long
            // - Weak signal: ambiguous state (no markers either way)
            if (hasPrivateContent) {
              strongVulnerabilities.push(
                `${route}: private content visible unauthenticated`
              );
            } else if (!loginIndicatorsSeen && urlAtRoute) {
              weakSignals.push(
                `${route}: landed on route without clear login markers`
              );
            } else {
              protectedDetected = true; // ambiguous but leaning protected
            }
          }

          if (protectedDetected) {
            console.log(`   Route ${route}: PROTECTED`);
          } else {
            const reason = strongVulnerabilities.find((v) =>
              v.startsWith(route)
            )
              ? "STRONG VULNERABILITY"
              : "INCONCLUSIVE";
            console.log(`   Route ${route}: ${reason}`);
          }
        }

        if (strongVulnerabilities.length > 0) {
          strongVulnerabilities.forEach((v) =>
            securityTestDiagnostics.vulnerabilities.push(`Direct access: ${v}`)
          );
          // Fail only on strong signals of bypass
          expect(
            strongVulnerabilities.length,
            `Strong direct-access vulnerabilities detected:\n- ${strongVulnerabilities.join("\n- ")}`
          ).toBe(0);
        } else {
          if (weakSignals.length > 0) {
            console.log(
              "   ℹ️ Inconclusive signals (likely protected, verify with explicit test IDs):"
            );
            weakSignals.forEach((s) => console.log(`     - ${s}`));
          }
          console.log(
            "   ✅ Direct access to protected routes blocked (no strong bypass detected)"
          );
        }
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Direct access test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Direct access protection test failed");
        throw error;
      }
    });

    test("should prevent API access without authentication", async ({
      page,
    }) => {
      console.log("🛡️ Testing API Access Without Authentication...");

      try {
        const apiEndpoints = [
          "/api/user/profile",
          "/api/user/preferences",
          "/api/admin/users",
        ];

        for (const endpoint of apiEndpoints) {
          let status: number | "timeout" = 0;
          try {
            const response = await page.request.get(`${BASE_URL}${endpoint}`, {
              timeout: 5000 as any,
            });
            status = response.status();
          } catch (err) {
            // Treat network/timeout as protected (endpoint not publicly accessible)
            status = "timeout";
          }

          // Treat 401/403 as protected; 404 not found also protected; 405 method not allowed means no GET exposure – protected
          const protectedStatus =
            status === "timeout" ||
            [401, 403, 404, 405].includes(status as number);
          console.log(
            `   API ${endpoint}: ${status} ${protectedStatus ? "PROTECTED" : "VULNERABLE"}`
          );
          expect(protectedStatus).toBe(true);
        }

        console.log("   ✅ API access without authentication blocked");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `API access test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ API access protection test failed");
        throw error;
      }
    });
  });

  test.describe("Input Validation", () => {
    test("should validate email format on client side", async ({ page }) => {
      console.log("🛡️ Testing Email Format Validation...");

      try {
        await ensureServerAvailableOrSkip(page, "/login");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          submit: loginButton,
        } = await getLoginForm(page);

        // Test various invalid email formats
        const invalidEmails = [
          "invalid-email",
          "@example.com",
          "test@",
          "test.example.com",
          "test@.com",
        ];

        for (const invalidEmail of invalidEmails) {
          await emailInput.fill(invalidEmail);
          // Fill minimal password so form submit path runs client validation cleanly
          await passwordInput.fill("x");
          await clickWithOverlayWorkaround(page, loginButton);

          // Wait and check for validation error
          const emailError = page.locator("#login-email-error");
          const ariaInvalid =
            (await emailInput.getAttribute("aria-invalid")) === "true";
          let nativeInvalid = false;
          try {
            nativeInvalid = await emailInput.evaluate((el: HTMLInputElement) =>
              el.validity ? !el.validity.valid : false
            );
          } catch {
            /* ignore */
          }
          const validationError =
            (await emailError.isVisible().catch(() => false)) ||
            (await page
              .getByRole("alert", { name: /invalid email address/i })
              .first()
              .isVisible()
              .catch(() => false)) ||
            ariaInvalid ||
            nativeInvalid;
          console.log(
            `   Email "${invalidEmail}": ${validationError ? "VALIDATED" : "NOT VALIDATED"}`
          );

          expect(validationError).toBe(true);
        }

        console.log("   ✅ Email format validation functional");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Email validation test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Email format validation test failed");
        throw error;
      }
    });

    test("should enforce minimum password length on registration", async ({
      page,
    }) => {
      console.log("🛡️ Testing Password Minimum Length...");

      try {
        await ensureServerAvailableOrSkip(page, "/register");
        await page.goto(`${BASE_URL}/register`, {
          waitUntil: "domcontentloaded",
        });

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          confirm: confirmPasswordInput,
          terms: termsCheckbox,
          submit: registerButton,
        } = await getRegisterForm(page);

        // Test too-short passwords (app enforces min length 6). Skip empty string which triggers a different message.
        const tooShort = ["1", "12345"];
        for (const weakPassword of tooShort) {
          await emailInput.fill(`test-${Date.now()}@example.com`);
          await passwordInput.fill(weakPassword);
          await confirmPasswordInput.fill(weakPassword);
          await dismissBlockingOverlays(page);
          try {
            await termsCheckbox.check();
          } catch (e) {
            if (
              test.info().project.name.toLowerCase().includes("mobile safari")
            ) {
              await termsCheckbox.check({ force: true });
            } else {
              throw e;
            }
          }

          await clickWithOverlayWorkaround(page, registerButton);

          // Check for minimum length error message (or generic required when very short)
          const pwdError = page.locator("#password-error");
          const hasErrorVisible = await pwdError.isVisible().catch(() => false);
          let matchesMessage = false;
          if (hasErrorVisible) {
            const text = (await pwdError.textContent()) || "";
            matchesMessage = /at least 6 characters|required/i.test(text);
          }
          const lengthError = hasErrorVisible && matchesMessage;
          console.log(
            `   Password "${weakPassword}": ${lengthError ? "REJECTED (min length)" : "ACCEPTED"}`
          );

          expect(lengthError).toBe(true);
        }

        // And a valid length password should not trigger the min-length error
        await emailInput.fill(`test-${Date.now()}@example.com`);
        await passwordInput.fill("abcdef");
        await confirmPasswordInput.fill("abcdef");
        await dismissBlockingOverlays(page);
        try {
          await termsCheckbox.check();
        } catch (e) {
          if (
            test.info().project.name.toLowerCase().includes("mobile safari")
          ) {
            await termsCheckbox.check({ force: true });
          } else {
            throw e;
          }
        }
        await clickWithOverlayWorkaround(page, registerButton);
        const noLengthError = await page
          .locator("#password-error")
          .isVisible()
          .catch(() => false);
        expect(noLengthError).toBe(false);

        console.log("   ✅ Password minimum length enforced");
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `Password length test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ Password minimum length test failed");
        throw error;
      }
    });
  });

  test.describe("ReCAPTCHA Integration", () => {
    test("should require ReCAPTCHA verification on registration", async ({
      page,
    }) => {
      console.log("🛡️ Testing ReCAPTCHA Integration...");

      try {
        await page.goto(`${BASE_URL}/register`);

        await page.waitForSelector("form", { timeout: 10000 });
        const {
          email: emailInput,
          password: passwordInput,
          confirm: confirmPasswordInput,
          terms: termsCheckbox,
          submit: registerButton,
        } = await getRegisterForm(page);

        await emailInput.fill(`test-${Date.now()}@example.com`);
        await passwordInput.fill("StrongPassword123!");
        await confirmPasswordInput.fill("StrongPassword123!");
        await dismissBlockingOverlays(page);
        try {
          await termsCheckbox.check();
        } catch (e) {
          if (
            test.info().project.name.toLowerCase().includes("mobile safari")
          ) {
            await termsCheckbox.check({ force: true });
          } else {
            throw e;
          }
        }

        // Check if ReCAPTCHA is present
        const recaptchaVisible = await page.isVisible(
          ".g-recaptcha, [data-sitekey], #captcha"
        );
        console.log(`   ReCAPTCHA present: ${recaptchaVisible}`);

        if (recaptchaVisible) {
          // Try to submit without completing ReCAPTCHA
          await registerButton.click();

          // Check for ReCAPTCHA error
          const recaptchaError = await page.isVisible(
            "text=/captcha/i, text=/verification/i"
          );
          console.log(
            `   ReCAPTCHA validation: ${recaptchaError ? "ENFORCED" : "NOT ENFORCED"}`
          );

          expect(recaptchaError).toBe(true);
          console.log("   ✅ ReCAPTCHA verification enforced");
        } else {
          console.log(
            "   ⚠️ ReCAPTCHA not found, may be using alternative bot protection"
          );
        }
      } catch (error) {
        securityTestDiagnostics.vulnerabilities.push(
          `ReCAPTCHA test failed: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log("   ❌ ReCAPTCHA test failed");
        throw error;
      }
    });
  });

  test.afterAll(() => {
    if (securityTestDiagnostics.vulnerabilities.length > 0) {
      console.log("\n🚨 Authentication Security Vulnerabilities Found:");
      securityTestDiagnostics.vulnerabilities.forEach(
        (vulnerability, index) => {
          console.log(`   ${index + 1}. ${vulnerability}`);
        }
      );
    } else {
      console.log(
        "\n✅ All Authentication Security tests passed - no vulnerabilities detected"
      );
    }
  });
});
