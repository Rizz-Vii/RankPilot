import { expect, test } from "@playwright/test";
import { EnhancedAuth } from "./enhanced-auth";
import { UNIFIED_TEST_USERS } from "./unified-test-users";

/**
 * AI Integration - MCP Server Features Tests
 * Tests MCP server integrations for enhanced AI capabilities
 */

test.describe('AI Integration - MCP Server Features', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (error: unknown) {
            const msg = (error && typeof error === 'object' && 'message' in error)
                ? String((error as { message?: unknown }).message)
                : String(error);
            console.warn('Login failed, using fallback:', msg);
            await page.goto('/dashboard');
            await page.waitForTimeout(2000);
        }
    });

    test('should access HuggingFace MCP integration', async ({ page }) => {
        await page.goto('/ai/huggingface');
        await expect(page.locator('[data-testid="huggingface-models"]')).toBeVisible();
        await expect(page.locator('[data-testid="model-search"]')).toBeVisible();
    });

    test('should use Firecrawl MCP for competitive analysis', async ({ page }) => {
        await page.goto('/competitive/firecrawl');
        await expect(page.locator('[data-testid="firecrawl-analysis"]')).toBeVisible();
        await expect(page.locator('[data-testid="web-scraping-results"]')).toBeVisible();
    });

    test('should monitor with Sentry MCP integration', async ({ page }) => {
        await page.goto('/monitoring/sentry');
        await expect(page.locator('[data-testid="sentry-monitoring"]')).toBeVisible();
        await expect(page.locator('[data-testid="ai-agent-metrics"]')).toBeVisible();
    });

    test('should use Sequential Thinking MCP for complex analysis', async ({ page }) => {
        await page.goto('/ai/sequential-thinking');
        await expect(page.locator('[data-testid="sequential-analysis"]')).toBeVisible();
        await expect(page.locator('[data-testid="multi-step-reasoning"]')).toBeVisible();
    });

    test('should integrate Zapier MCP for workflow automation', async ({ page }) => {
        await page.goto('/automation/zapier');
        await expect(page.locator('[data-testid="zapier-workflows"]')).toBeVisible();
        await expect(page.locator('[data-testid="automation-triggers"]')).toBeVisible();
    });

    test('should use GitHub MCP for repository management', async ({ page }) => {
        await page.goto('/development/github');
        await expect(page.locator('[data-testid="github-integration"]')).toBeVisible();
        await expect(page.locator('[data-testid="repo-management"]')).toBeVisible();
    });

    test('should process documents with MarkItDown MCP', async ({ page }) => {
        await page.goto('/processing/markdown');
        await expect(page.locator('[data-testid="document-processing"]')).toBeVisible();
        await expect(page.locator('[data-testid="markdown-conversion"]')).toBeVisible();
    });
});
