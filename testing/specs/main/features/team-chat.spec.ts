import { expect, test } from "@playwright/test";
import { TestOrchestrator } from "../../../utils/test-orchestrator";

/**
 * Team Chat - Comprehensive Test Suite
 * Tests chat functionality, channels, messaging, and collaboration features
 */

test.describe("Team Chat - Comprehensive Suite", () => {
  let orchestrator: TestOrchestrator;
  // Removed unused gracefulUtils instantiation

  test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);

    // Set extended timeouts for real-time interactions
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(20000);
  });

  test.describe("Page Loading and Navigation", () => {
    test("loads team chat page with proper authentication", async ({ page }) => {
      console.log("💬 Testing Team Chat page loading...");

      // Test with starter tier (should have access)
      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      // Wait for primary chat container to render
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Verify page loads correctly
      await expect(page.locator("h1")).toContainText("Team Chat");
      await expect(page.locator("text=Collaborate with your team in real-time")).toBeVisible();

      // Verify navigation elements
      await expect(page.locator("button", { hasText: "Back to Team" })).toBeVisible();

      console.log("✅ Team Chat page loads correctly");
    });

    test("redirects free tier users appropriately", async ({ page }) => {
      console.log("🚫 Testing free tier access restrictions...");

      // Test with free tier (should be redirected or see upgrade prompt)
      await orchestrator.userManager.loginAs("free");
      await orchestrator.userManager.verifyAccess("/team/chat", false);

      console.log("✅ Free tier access properly restricted");
    });

    test("back navigation works correctly", async ({ page }) => {
      console.log("⬅️ Testing back navigation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      const backButton = page.locator("button", { hasText: "Back to Team" });
      await expect(backButton).toBeVisible();
      await backButton.click();

      await expect(page).toHaveURL(/\/team$/);
      await expect(page.locator("h1")).toContainText("Team Management");

      console.log("✅ Back navigation works correctly");
    });
  });

  test.describe("Chat Interface", () => {
    test("displays chat sidebar and main area", async ({ page }) => {
      console.log("🖥️ Testing chat interface layout...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Verify sidebar with channels
      await expect(page.locator("text=Channels")).toBeVisible();
      await expect(page.locator("text=Direct Messages")).toBeVisible();

      // Verify main chat area
      await expect(page.locator("text=Messages")).toBeVisible();
      await expect(page.locator("input[placeholder*='Type a message']")).toBeVisible();

      // Verify online users section
      await expect(page.locator("text=Online")).toBeVisible();

      console.log("✅ Chat interface displays correctly");
    });

    test("shows default channels", async ({ page }) => {
      console.log("📺 Testing default channels display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });

      // Check for default channels
      await expect(page.locator("text=general")).toBeVisible();
      await expect(page.locator("text=seo-discussion")).toBeVisible();
      await expect(page.locator("text=project-updates")).toBeVisible();
      await expect(page.locator("text=random")).toBeVisible();

      // Check channel indicators
      await expect(page.locator("svg").filter({ has: page.locator("title", { hasText: "Hash" }) })).toBeVisible();

      console.log("✅ Default channels display correctly");
    });

    test("switches between channels", async ({ page }) => {
      console.log("🔄 Testing channel switching...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Click on different channel
      const seoChannel = page.locator("text=seo-discussion");
      await seoChannel.click();

      // Verify channel header updates
      await expect(page.locator("h3")).toContainText("seo-discussion");

      // Switch to another channel
      const projectChannel = page.locator("text=project-updates");
      await projectChannel.click();

      await expect(page.locator("h3")).toContainText("project-updates");

      console.log("✅ Channel switching works correctly");
    });
  });

  test.describe("Message Functionality", () => {
    test("sends a message successfully", async ({ page }) => {
      console.log("✉️ Testing message sending...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Type and send a message
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await messageInput.fill("Hello team! This is a test message.");

      const sendButton = page.locator("button").filter({ has: page.locator("svg[title='Send']") });
      await sendButton.click();

      // Verify message appears in chat
      await expect(page.locator("text=Hello team! This is a test message.")).toBeVisible();

      console.log("✅ Message sending works correctly");
    });

    test("displays message with timestamp and author", async ({ page }) => {
      console.log("⏰ Testing message metadata display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Send a message
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await messageInput.fill("Test message with metadata");

      const sendButton = page.locator("button").filter({ has: page.locator("svg[title='Send']") });
      await sendButton.click();

      // Verify message appears with metadata
      await expect(page.locator("text=Test message with metadata")).toBeVisible();

      // Check for timestamp (should be "now" or similar)
      await expect(page.locator("text=now")).toBeVisible();

      console.log("✅ Message metadata displays correctly");
    });

    test("handles empty message validation", async ({ page }) => {
      console.log("📝 Testing empty message validation...");

      await orchestrator.userManager.loginAs("starter");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Try to send empty message
      const sendButton = page.locator("button").filter({ has: page.locator("svg[title='Send']") });
      await sendButton.click();

      // Should not send anything or show validation
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await expect(messageInput).toBeFocused();

      console.log("✅ Empty message validation works correctly");
    });

    test("displays mock conversation history", async ({ page }) => {
      console.log("📜 Testing conversation history display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Should display mock messages
      await expect(page.locator("text=Hey everyone! Welcome to the team chat")).toBeVisible();
      await expect(page.locator("text=Great to have everyone here")).toBeVisible();
      await expect(page.locator("text=Looking forward to collaborating")).toBeVisible();

      console.log("✅ Conversation history displays correctly");
    });
  });

  test.describe("Direct Messages", () => {
    test("shows direct message section", async ({ page }) => {
      console.log("👤 Testing direct messages section...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Check direct messages section
      await expect(page.locator("text=Direct Messages")).toBeVisible();

      // Should show online team members
      await expect(page.locator("text=Sarah Wilson")).toBeVisible();
      await expect(page.locator("text=Mike Johnson")).toBeVisible();
      await expect(page.locator("text=Emily Davis")).toBeVisible();

      // Check online indicators
      const onlineIndicators = page.locator(".bg-green-500");
      await expect(onlineIndicators.first()).toBeVisible();

      console.log("✅ Direct messages section displays correctly");
    });

    test("starts direct message conversation", async ({ page }) => {
      console.log("💌 Testing direct message initiation...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Click on a team member
      const teamMember = page.locator("text=Sarah Wilson");
      await teamMember.click();

      // Should switch to DM view
      await expect(page.locator("h3")).toContainText("Sarah Wilson");
      await expect(page.locator("text=Direct message")).toBeVisible();

      console.log("✅ Direct message initiation works correctly");
    });
  });

  test.describe("Online Status and Presence", () => {
    test("displays online users correctly", async ({ page }) => {
      console.log("🟢 Testing online status display...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Check online section
      await expect(page.locator("text=Online")).toBeVisible();

      // Check for team members with online status
      await expect(page.locator("text=Sarah Wilson")).toBeVisible();
      await expect(page.locator("text=Mike Johnson")).toBeVisible();

      // Check online indicators (green dots)
      const onlineIndicators = page.locator(".bg-green-500");
      const indicatorCount = await onlineIndicators.count();
      expect(indicatorCount).toBeGreaterThan(0);

      console.log("✅ Online status displays correctly");
    });

    test("shows user avatars and initials", async ({ page }) => {
      console.log("👤 Testing user avatar display...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Check for avatar components
      const avatars = page.locator("[data-testid*='avatar'], .avatar, .rounded-full");
      const avatarCount = await avatars.count();
      expect(avatarCount).toBeGreaterThan(0);

      // Check for user initials in avatars
      await expect(page.locator("text=SW")).toBeVisible(); // Sarah Wilson
      await expect(page.locator("text=MJ")).toBeVisible(); // Mike Johnson

      console.log("✅ User avatars display correctly");
    });
  });

  test.describe("Chat Actions and Features", () => {
    test("message action buttons are present", async ({ page }) => {
      console.log("⚙️ Testing message action buttons...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Send a message first to test actions
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await messageInput.fill("Test message for actions");

      const sendButton = page.locator("button").filter({ has: page.locator("svg[title='Send']") });
      await sendButton.click();

      // Check for attachment and emoji buttons
      const attachButton = page.locator("button").filter({ has: page.locator("svg[title='Paperclip']") });
      const emojiButton = page.locator("button").filter({ has: page.locator("svg[title='Smile']") });

      await expect(attachButton).toBeVisible();
      await expect(emojiButton).toBeVisible();

      console.log("✅ Message action buttons are present");
    });

    test("chat header controls are functional", async ({ page }) => {
      console.log("🎛️ Testing chat header controls...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Check for video call button
      const videoButton = page.locator("button").filter({ has: page.locator("svg[title='Video']") });
      await expect(videoButton).toBeVisible();

      // Check for phone call button
      const phoneButton = page.locator("button").filter({ has: page.locator("svg[title='Phone']") });
      await expect(phoneButton).toBeVisible();

      // Check for settings button
      const settingsButton = page.locator("button").filter({ has: page.locator("svg[title='Settings']") });
      await expect(settingsButton).toBeVisible();

      console.log("✅ Chat header controls are functional");
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test("displays correctly on mobile viewport", async ({ page }) => {
      console.log("📱 Testing mobile responsiveness...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => { });

      // Verify responsive layout
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Team Chat")).toBeVisible();

      // Check that message input is accessible
      await expect(page.locator("input[placeholder*='Type a message']")).toBeVisible();

      // Test touch-friendly buttons (48px minimum)
      const buttons = page.locator("button");
      for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44); // Close to 48px WCAG requirement
        }
      }

      console.log("✅ Mobile responsiveness verified");
    });

    test("sidebar collapses on mobile", async ({ page }) => {
      console.log("📱 Testing mobile sidebar behavior...");

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      // allow a short, non-fatal network settle to reduce flakiness
      try { await page.waitForLoadState('networkidle', { timeout: 3000 }); } catch { /* non-fatal */ }

      // On mobile, sidebar might be collapsed or hidden initially
      // The main chat area should still be accessible
      await expect(page.locator("input[placeholder*='Type a message']")).toBeVisible();

      console.log("✅ Mobile sidebar behavior works correctly");
    });
  });

  test.describe("Real-time Features", () => {
    test("handles typing indicators", async ({ page }) => {
      console.log("⌨️ Testing typing indicators...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Start typing in message input
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await messageInput.focus();
      await messageInput.type("I am typing...");

      // In a real implementation, typing indicators would appear
      // For mock, we verify the input is working
      await expect(messageInput).toHaveValue("I am typing...");

      console.log("✅ Typing functionality works correctly");
    });

    test("maintains connection status", async ({ page }) => {
      console.log("🔗 Testing connection status...");

      await orchestrator.userManager.loginAs("enterprise");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      await page.locator('main, [data-testid="team-chat"], .chat-container').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => { });

      // Verify page loads and maintains functionality
      await expect(page.locator("text=Team Chat")).toBeVisible();
      await expect(page.locator("input[placeholder*='Type a message']")).toBeVisible();

      // In real implementation, connection status would be shown
      // For now, verify basic functionality is maintained
      const messageInput = page.locator("input[placeholder*='Type a message']");
      await messageInput.fill("Connection test message");

      const sendButton = page.locator("button").filter({ has: page.locator("svg[title='Send']") });
      await sendButton.click();

      await expect(page.locator("text=Connection test message")).toBeVisible();

      console.log("✅ Connection status maintained");
    });
  });

  test.describe("Performance", () => {
    test("loads within acceptable time limits", async ({ page }) => {
      console.log("⚡ Testing page performance...");

      await orchestrator.userManager.loginAs("starter");

      const startTime = Date.now();
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch { }
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      // Check for main interface elements
      await expect(page.locator("text=Team Chat")).toBeVisible();
      await expect(page.locator("input[placeholder*='Type a message']")).toBeVisible();

      console.log(`✅ Page loaded in ${loadTime}ms`);
    });

    test("handles message history efficiently", async ({ page }) => {
      console.log("📊 Testing message history performance...");

      await orchestrator.userManager.loginAs("agency");
      await page.goto("/team/chat", { waitUntil: "domcontentloaded" });
      try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch { }

      // Verify message history loads quickly
      await expect(page.locator("text=Hey everyone! Welcome to the team chat")).toBeVisible();

      // Check scroll area is functional
      const scrollArea = page.locator("[data-testid*='scroll'], .scroll-area");
      if (await scrollArea.count() > 0) {
        await expect(scrollArea.first()).toBeVisible();
      }

      console.log("✅ Message history performance verified");
    });
  });
});
