import { expect, test } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

let orchestrator: TestOrchestrator;

test.describe("Chat happy path (stream + cancel)", () => {
  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);
    page.setDefaultTimeout(30000);
  });

  test("customer chat streams response and supports cancel", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("starter");

    // Open chat UI
    const toggle = page.locator('button[aria-label="Open RankPilot AI Chat"]');
    await toggle.waitFor({ state: "visible" });
    await toggle.click();

    // Type and send a question
    const input = page.locator(
      'input[placeholder="Ask about your SEO performance..."]'
    );
    await input.fill("Give me a quick SEO tip for my homepage.");
    const send = page.locator('button[aria-label="Send message"]');
    await send.click();

    // Wait for streaming to start
    const streamingBadge = page.locator("text=Streaming…");
    await streamingBadge.waitFor({ state: "visible" });

    // Cancel streaming
    const cancel = page.locator(
      'button[aria-label="Cancel streaming response"]'
    );
    await cancel.click();

    // Verify response contains canceled marker
    await expect(page.locator(".prose")).toContainText("Canceled", {
      timeout: 10000,
    });
  });

  test("customer chat completes stream and shows suggestion chips", async ({
    page,
  }) => {
    await orchestrator.userManager.loginAs("starter");

    // Open chat UI
    const toggle = page.locator('button[aria-label="Open RankPilot AI Chat"]');
    await toggle.waitFor({ state: "visible" });
    await toggle.click();

    // Type and send a question that yields heuristic or meta-based suggestions
    const input = page.locator(
      'input[placeholder="Ask about your SEO performance..."]'
    );
    await input.fill("Analyze my Core Web Vitals and suggest improvements.");
    const send = page.locator('button[aria-label="Send message"]');
    await send.click();

    // Wait for streaming to start then finish (spinner hidden)
    const streamingBadge = page.locator("text=Streaming…");
    await streamingBadge.waitFor({ state: "visible" });
    await expect(streamingBadge).toBeHidden({ timeout: 20000 });

    // Assert suggestion chips appear
    const suggestion = page
      .locator('button[aria-label^="Suggestion:"]')
      .first();
    await suggestion.waitFor({ state: "visible", timeout: 15000 });

    // Click first suggestion and verify it populates the input
    const suggestionText = (await suggestion.textContent())?.trim() || "";
    await suggestion.click();
    await expect(input).toHaveValue(suggestionText);
  });
});
