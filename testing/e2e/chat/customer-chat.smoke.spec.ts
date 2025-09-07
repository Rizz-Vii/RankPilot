import { test, expect } from "@playwright/test";

const shouldRun = process.env.CHAT_E2E === "1";

(shouldRun ? test : test.skip)(
  "CustomerChat smoke: opens widget, streams, renders",
  async ({ page, baseURL }) => {
    // Intercepts to avoid live providers
    await page.route("**/api/chat/customer?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          messages: [],
          sessionId: "e2e_session",
          hasMore: false,
        }),
      });
    });
    await page.route("**/api/chat/customer/stream", async (route) => {
      const body = [
        "data: " +
          JSON.stringify({ info: "provider_selected", provider: "gemini" }) +
          "\n\n",
        "data: " + JSON.stringify({ token: "Hello " }) + "\n\n",
        "data: " + JSON.stringify({ token: "E2E" }) + "\n\n",
        "data: " +
          JSON.stringify({
            final: true,
            sessionId: "e2e_session",
            tokensUsed: 5,
          }) +
          "\n\n",
        "data: [DONE]\n\n",
      ].join("");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
        body,
      });
    });

    await page.goto(baseURL || "http://localhost:3000");
    // Open widget if toggle present
    const openBtn = page.getByRole("button", {
      name: "Open RankPilot AI Chat",
    });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Type and send
    const textbox = page.getByRole("textbox");
    await textbox.fill("Hi");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Hello E2E")).toBeVisible();
  }
);
