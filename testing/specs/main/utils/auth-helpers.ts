import type { Locator, Page } from "@playwright/test";

export async function removeRecaptchaIframes(page: Page) {
  try {
    await page.evaluate(() => {
      try {
        const iframeSelectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="google.com/recaptcha"]',
          'iframe[src*="/recaptcha/"]',
        ];
        iframeSelectors.forEach((sel) =>
          document.querySelectorAll(sel).forEach((e) => e.remove())
        );

        const overlaySelectors = [
          ".modal-backdrop",
          ".overlay",
          ".loading-overlay",
          ".cookie-consent",
          ".consent-banner",
          ".grecaptcha-badge",
          '[data-testid="overlay"]',
        ];
        overlaySelectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            try {
              (el as HTMLElement).style.pointerEvents = "none";
            } catch (err) {}
          });
        });
      } catch (e) {}
    });
  } catch (e) {}
}

export async function waitForAuthForm(page: Page, timeout = 15000) {
  // Prefer a form that contains an email field
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("textbox", { name: /email/i }) })
    .first();
  try {
    await form.waitFor({ state: "visible", timeout });
    return form;
  } catch (e) {
    // fallback to any visible form
    const anyForm = page.locator("form").first();
    await anyForm.waitFor({ state: "visible", timeout }).catch(() => {});
    return anyForm;
  }
}

export async function ensureClickable(page: Page, locator: Locator) {
  try {
    const box = await locator.boundingBox();
    if (!box) return;
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    await locator.evaluate((el: HTMLElement) =>
      el.setAttribute("data-temp-click-target", "1")
    );
    await page.evaluate(
      ({ cx, cy }) => {
        try {
          const elAt = document.elementFromPoint(cx, cy) as HTMLElement | null;
          const target = document.querySelector(
            '[data-temp-click-target="1"]'
          ) as HTMLElement | null;
          if (elAt && target && !target.contains(elAt)) {
            elAt.style.pointerEvents = "none";
          }
        } catch (e) {}
      },
      { cx, cy }
    );
    await locator.evaluate((el: HTMLElement) =>
      el.removeAttribute("data-temp-click-target")
    );
  } catch (e) {}
}

export default {
  removeRecaptchaIframes,
  waitForAuthForm,
  ensureClickable,
};
