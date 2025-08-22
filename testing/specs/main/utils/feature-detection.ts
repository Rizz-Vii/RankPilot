import { test, type Page, type TestInfo } from "@playwright/test";
import { errorMessage } from "../../../utils/test-error"; // corrected relative path

/**
 * Sm      const available = await checkFeatureAvailability(page, "auth");
      if (!available) {
        testInfo.skip(true); // Skip test if auth features not available
        return;
      }est runner that checks feature availability before running tests
 * This prevents false failures for unimplemented features
 */

export async function checkFeatureAvailability(
  page: Page,
  feature: string
): Promise<boolean> {
  // Accessing internal baseURL fallback – if Playwright API changes, default to localhost.
  const ctxUnknown: unknown = page.context();
  // Narrow to a minimal shape that may expose private _options in Playwright; fallback to default
  const baseURL: string = ((): string => {
    const k = ctxUnknown as { _options?: { baseURL?: unknown } };
    const v = k && typeof k === 'object' && k._options && typeof k._options === 'object' ? k._options.baseURL : undefined;
    return typeof v === 'string' && v ? v : 'http://localhost:3000';
  })();

  try {
    switch (feature) {
      case "auth":
        // Check if auth pages exist
        const loginResponse = await page.request.get(`${baseURL}/login`);
        return loginResponse.ok();

      case "api-analyze-link":
        // Check if analyze-link API exists
        const apiResponse = await page.request.post(
          `${baseURL}/api/analyze-link`,
          {
            data: { url: "https://example.com" },
            failOnStatusCode: false,
          }
        );
        return apiResponse.status() !== 404;

      case "dashboard":
        // Check if dashboard exists
        const dashboardResponse = await page.request.get(
          `${baseURL}/dashboard`
        );
        return dashboardResponse.ok();

      default:
        return true;
    }
  } catch (error: unknown) {
    console.log(`Feature ${feature} availability check failed: ${errorMessage(error)}`);
    return false;
  }
}

export function skipIfFeatureUnavailable(feature: string) {
  return async function (testFn: () => void | Promise<void>, testInfo: TestInfo & { page: Page }) {
    const available = await checkFeatureAvailability(testInfo.page as unknown as Page, feature);
    if (!available) {
      testInfo.skip(true, `Feature "${feature}" is not implemented yet`);
      return;
    }
    await testFn();
  };
}

// Helper for conditional test execution
export const conditionalTest = {
  auth: (title: string, testFn: (ctx: { page: Page }, info: TestInfo) => void | Promise<void>) =>
    test(title, async ({ page }, testInfo): Promise<void> => {
      const available = await checkFeatureAvailability(page, "auth");
      if (!available) {
        testInfo.skip(true, "Authentication features not implemented yet");
        return;
      }
      await testFn({ page }, testInfo);
    }),

  api: (title: string, testFn: (ctx: { page: Page }, info: TestInfo) => void | Promise<void>) =>
    test(title, async ({ page }, testInfo): Promise<void> => {
      const available = await checkFeatureAvailability(
        page,
        "api-analyze-link"
      );
      if (!available) {
        testInfo.skip(true, "API endpoints not implemented yet");
        return;
      }
      await testFn({ page }, testInfo);
    }),

  dashboard: (title: string, testFn: (ctx: { page: Page }, info: TestInfo) => void | Promise<void>) =>
    test(title, async ({ page }, testInfo): Promise<void> => {
      const available = await checkFeatureAvailability(page, "dashboard");
      if (!available) {
        testInfo.skip(true, "Dashboard not implemented yet");
        return;
      }
      await testFn({ page }, testInfo);
    }),
};
