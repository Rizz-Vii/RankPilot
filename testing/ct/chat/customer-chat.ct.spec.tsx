import { expect, test } from "@playwright/experimental-ct-react";
import React from "react";
import CustomerChatBot from "@/components/chat/CustomerChatBot";
import { AuthContext } from "../mocks/AuthContext";

test.describe("CustomerChatBot (CT)", () => {
  test("opens, sends a message via SSE, and renders response", async ({
    mount,
    page,
  }) => {
    // Mock restore (GET) and actions POST
    await page.route("**/api/chat/customer?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          messages: [],
          sessionId: "session_ct",
          hasMore: false,
        }),
      });
    });
    await page.route("**/api/chat/customer/actions?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          actionStats: {
            totalCompleted: 1,
            totalPending: 2,
            completionRate: 1 / 3,
          },
        }),
      });
    });
    // Mock SSE stream endpoint
    await page.route("**/api/chat/customer/stream", async (route) => {
      const body = [
        "data: " +
          JSON.stringify({ info: "provider_selected", provider: "gemini" }) +
          "\n\n",
        "data: " + JSON.stringify({ token: "Hello " }) + "\n\n",
        "data: " + JSON.stringify({ token: "world!" }) + "\n\n",
        "data: " +
          JSON.stringify({
            final: true,
            sessionId: "session_ct",
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

    const authValue = {
      user: { uid: "u1", getIdToken: async () => "stub" },
      profile: { subscriptionTier: "starter" },
      loading: false,
      role: "starter",
      activities: [],
    } as any;

    const app = await mount(
      <AuthContext.Provider value={authValue}>
        <div style={{ height: 800 }}>
          <CustomerChatBot currentUrl="http://example.com/page" />
        </div>
      </AuthContext.Provider>
    );

    // Open widget
    await app.getByRole("button", { name: "Open RankPilot AI Chat" }).click();

    // Type a message
    const textbox = app.getByRole("textbox");
    await textbox.fill("Test streaming");
    await app.getByRole("button", { name: "Send message" }).click();

    // Expect streamed text to appear (rendered HTML)
    await expect(app).toContainText("Hello world!");
    // Token badge appears when final chunk processed
    await expect(app.getByText(/tokens?/i)).toBeVisible();
  });
});
